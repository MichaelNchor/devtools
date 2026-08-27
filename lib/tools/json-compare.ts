import { parseJson } from "@/lib/json/parse";
import { err, ok, type ToolResult } from "@/lib/types";

export const MAX_DEPTH = 512;

export type DiffKind = "unchanged" | "added" | "removed" | "changed" | "type-changed";

export interface CompareOptions {
  /** Objects compared as key sets rather than in document order. */
  ignoreKeyOrder: boolean;
  arrayMatching: "index" | "value" | "key";
  /** Field name used when arrayMatching is "key". */
  arrayKeyField: string;
  ignoreWhitespace: boolean;
  /** Numbers within the tolerance compare equal. Guards float noise. */
  numericTolerance: number;
  /** Applies to string VALUES only. Keys are structural. */
  ignoreCase: boolean;
}

export const DEFAULT_COMPARE_OPTIONS: CompareOptions = {
  ignoreKeyOrder: true,
  arrayMatching: "index",
  arrayKeyField: "id",
  ignoreWhitespace: false,
  numericTolerance: 0,
  ignoreCase: false,
};

export interface DiffNode {
  /** JSON path, e.g. "$.users[2].email", or "$[id=a].v" in key mode. */
  path: string;
  key: string | number | null;
  /**
   * Authoritative for presence: "added" means the node exists only on the
   * right, "removed" only on the left. Do not infer presence from whether
   * `left` / `right` happen to be set.
   */
  kind: DiffKind;
  left?: unknown;
  right?: unknown;
  children?: DiffNode[];
}

export interface DiffStats {
  added: number;
  removed: number;
  changed: number;
  typeChanged: number;
  total: number;
}

class DepthExceeded extends Error {}

type JsonType = "null" | "boolean" | "number" | "string" | "array" | "object";

function typeOf(value: unknown): JsonType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const primitive = typeof value;
  if (primitive === "boolean" || primitive === "number" || primitive === "string") return primitive;
  return "object";
}

function normaliseString(value: string, options: CompareOptions): string {
  let out = value;
  if (options.ignoreWhitespace) out = out.trim().replace(/\s+/g, " ");
  if (options.ignoreCase) out = out.toLowerCase();
  return out;
}

function scalarsEqual(left: unknown, right: unknown, options: CompareOptions): boolean {
  if (typeof left === "number" && typeof right === "number") {
    return options.numericTolerance > 0
      ? Math.abs(left - right) <= options.numericTolerance
      : left === right;
  }
  if (typeof left === "string" && typeof right === "string") {
    return normaliseString(left, options) === normaliseString(right, options);
  }
  return left === right;
}

/** Deep equality under the same options — used for array value matching. */
function deepEqual(left: unknown, right: unknown, options: CompareOptions, depth: number): boolean {
  if (depth > MAX_DEPTH) throw new DepthExceeded();
  const type = typeOf(left);
  if (type !== typeOf(right)) return false;

  if (type === "array") {
    const a = left as unknown[];
    const b = right as unknown[];
    return a.length === b.length && a.every((item, i) => deepEqual(item, b[i], options, depth + 1));
  }
  if (type === "object") {
    const a = left as Record<string, unknown>;
    const b = right as Record<string, unknown>;
    const aKeys = Object.keys(a);
    if (aKeys.length !== Object.keys(b).length) return false;
    return aKeys.every(
      (k) => Object.prototype.hasOwnProperty.call(b, k) && deepEqual(a[k], b[k], options, depth + 1),
    );
  }
  return scalarsEqual(left, right, options);
}

function childPath(parent: string, key: string | number): string {
  return typeof key === "number" ? `${parent}[${key}]` : `${parent}.${key}`;
}

/** Marks a whole value as present on one side only. */
function oneSided(
  value: unknown,
  kind: "added" | "removed",
  path: string,
  key: string | number | null,
  depth: number,
): DiffNode {
  if (depth > MAX_DEPTH) throw new DepthExceeded();
  const side = kind === "added" ? { right: value } : { left: value };
  const type = typeOf(value);

  let children: DiffNode[] | undefined;
  if (type === "array") {
    children = (value as unknown[]).map((item, i) =>
      oneSided(item, kind, childPath(path, i), i, depth + 1));
  } else if (type === "object") {
    children = Object.entries(value as Record<string, unknown>).map(([k, v]) =>
      oneSided(v, kind, childPath(path, k), k, depth + 1));
  }

  return { path, key, kind, ...side, ...(children ? { children } : {}) };
}

function rollUp(children: DiffNode[]): DiffKind {
  return children.every((c) => c.kind === "unchanged") ? "unchanged" : "changed";
}

function diffObjects(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
  options: CompareOptions,
  path: string,
  key: string | number | null,
  depth: number,
): DiffNode {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  // With ignoreKeyOrder the union is sorted so both panes list keys the same
  // way; without it we keep the left document's order and append right-only
  // keys after, which is what makes a reordering visible.
  const union = options.ignoreKeyOrder
    ? [...new Set([...leftKeys, ...rightKeys])].sort()
    : [...leftKeys, ...rightKeys.filter((k) => !leftKeys.includes(k))];

  const children = union.map((k) => {
    const inLeft = Object.prototype.hasOwnProperty.call(left, k);
    const inRight = Object.prototype.hasOwnProperty.call(right, k);
    if (inLeft && inRight) return walk(left[k], right[k], options, childPath(path, k), k, depth + 1);
    return oneSided(
      inLeft ? left[k] : right[k],
      inLeft ? "removed" : "added",
      childPath(path, k), k, depth + 1,
    );
  });

  return { path, key, kind: rollUp(children), left, right, children };
}

function diffArraysByIndex(
  left: unknown[], right: unknown[], options: CompareOptions,
  path: string, key: string | number | null, depth: number,
): DiffNode {
  const children: DiffNode[] = [];
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    if (i < left.length && i < right.length) {
      children.push(walk(left[i], right[i], options, childPath(path, i), i, depth + 1));
    } else if (i < left.length) {
      children.push(oneSided(left[i], "removed", childPath(path, i), i, depth + 1));
    } else {
      children.push(oneSided(right[i], "added", childPath(path, i), i, depth + 1));
    }
  }
  return { path, key, kind: rollUp(children), left, right, children };
}

function diffArraysByValue(
  left: unknown[], right: unknown[], options: CompareOptions,
  path: string, key: string | number | null, depth: number,
): DiffNode {
  const takenRight = new Set<number>();
  const children: DiffNode[] = [];

  // Greedy: each left element claims the first unclaimed equal right element.
  // A reorder therefore matches everything and reads as unchanged.
  left.forEach((item, i) => {
    const match = right.findIndex(
      (candidate, j) => !takenRight.has(j) && deepEqual(item, candidate, options, depth + 1),
    );
    if (match === -1) {
      children.push(oneSided(item, "removed", childPath(path, i), i, depth + 1));
    } else {
      takenRight.add(match);
      children.push({
        path: childPath(path, i), key: i, kind: "unchanged", left: item, right: right[match],
      });
    }
  });

  right.forEach((item, j) => {
    if (!takenRight.has(j)) children.push(oneSided(item, "added", childPath(path, j), j, depth + 1));
  });

  return { path, key, kind: rollUp(children), left, right, children };
}

function diffArraysByKey(
  left: unknown[], right: unknown[], options: CompareOptions,
  path: string, key: string | number | null, depth: number,
): DiffNode {
  const field = options.arrayKeyField;
  const keyOf = (item: unknown): string | null => {
    if (typeOf(item) !== "object") return null;
    const raw = (item as Record<string, unknown>)[field];
    return typeof raw === "string" || typeof raw === "number" ? String(raw) : null;
  };

  const leftKeyed = new Map<string, unknown>();
  const leftUnkeyed: unknown[] = [];
  for (const item of left) {
    const k = keyOf(item);
    if (k === null) leftUnkeyed.push(item); else leftKeyed.set(k, item);
  }
  const rightKeyed = new Map<string, unknown>();
  const rightUnkeyed: unknown[] = [];
  for (const item of right) {
    const k = keyOf(item);
    if (k === null) rightUnkeyed.push(item); else rightKeyed.set(k, item);
  }

  const children: DiffNode[] = [];
  for (const k of [...new Set([...leftKeyed.keys(), ...rightKeyed.keys()])]) {
    const nodePath = `${path}[${field}=${k}]`;
    const inLeft = leftKeyed.has(k);
    const inRight = rightKeyed.has(k);
    if (inLeft && inRight) {
      children.push(walk(leftKeyed.get(k), rightKeyed.get(k), options, nodePath, k, depth + 1));
    } else {
      children.push(oneSided(
        inLeft ? leftKeyed.get(k) : rightKeyed.get(k),
        inLeft ? "removed" : "added", nodePath, k, depth + 1,
      ));
    }
  }

  // Elements with no usable key cannot be matched by identity, so they fall
  // back to positional comparison among themselves.
  if (leftUnkeyed.length || rightUnkeyed.length) {
    const positional = diffArraysByIndex(leftUnkeyed, rightUnkeyed, options, path, key, depth);
    children.push(...(positional.children ?? []));
  }

  return { path, key, kind: rollUp(children), left, right, children };
}

function walk(
  left: unknown, right: unknown, options: CompareOptions,
  path: string, key: string | number | null, depth: number,
): DiffNode {
  if (depth > MAX_DEPTH) throw new DepthExceeded();

  const leftType = typeOf(left);
  if (leftType !== typeOf(right)) return { path, key, kind: "type-changed", left, right };

  if (leftType === "object") {
    return diffObjects(
      left as Record<string, unknown>, right as Record<string, unknown>,
      options, path, key, depth,
    );
  }
  if (leftType === "array") {
    const a = left as unknown[];
    const b = right as unknown[];
    if (options.arrayMatching === "value") return diffArraysByValue(a, b, options, path, key, depth);
    if (options.arrayMatching === "key") return diffArraysByKey(a, b, options, path, key, depth);
    return diffArraysByIndex(a, b, options, path, key, depth);
  }

  return {
    path, key,
    kind: scalarsEqual(left, right, options) ? "unchanged" : "changed",
    left, right,
  };
}

export function diffValues(left: unknown, right: unknown, options: CompareOptions): DiffNode {
  return walk(left, right, options, "$", null, 0);
}

export function computeStats(root: DiffNode): DiffStats {
  const stats: DiffStats = { added: 0, removed: 0, changed: 0, typeChanged: 0, total: 0 };

  function visit(node: DiffNode) {
    stats.total += 1;
    if (node.kind === "added" || node.kind === "removed") {
      // Count the subtree ROOT only. "+1" for a whole added object reads the
      // way a person counts it; "+1 for the object and +1 per field" does not.
      stats[node.kind] += 1;
      return;
    }
    if (node.kind === "type-changed") { stats.typeChanged += 1; return; }
    // A container is only ever "changed" because a descendant is, so counting
    // it as well would double-count every edit.
    if (node.kind === "changed" && !node.children) { stats.changed += 1; return; }
    for (const child of node.children ?? []) visit(child);
  }

  visit(root);
  return stats;
}

export function compareJson(
  leftText: string, rightText: string, options: CompareOptions,
): ToolResult<{ root: DiffNode; stats: DiffStats }> {
  const position = (e: { line?: number; column?: number }) => ({
    ...(e.line != null ? { line: e.line } : {}),
    ...(e.column != null ? { column: e.column } : {}),
  });

  const left = parseJson(leftText);
  if (!left.ok) return err(`Left side: ${left.error.message}`, position(left.error));

  const right = parseJson(rightText);
  if (!right.ok) return err(`Right side: ${right.error.message}`, position(right.error));

  try {
    const root = diffValues(left.value, right.value, options);
    return ok({ root, stats: computeStats(root) });
  } catch (cause) {
    if (cause instanceof DepthExceeded) {
      return err(`Structure nests deeper than ${MAX_DEPTH} levels, which is past what this tool will walk.`);
    }
    throw cause;
  }
}
