import { parseJson } from "@/lib/json/parse";
import { err, ok, type ToolResult } from "@/lib/types";

export type ArrayStrategy = "union" | "concat" | "replace" | "by-key";

export interface MergeOptions {
  /**
   * union   — combine and drop repeats (deep equality)
   * concat  — keep everything, including repeats
   * replace — the right array wins outright
   * by-key  — merge objects that share a key field
   */
  arrays: ArrayStrategy;
  /** Which side wins when two scalars disagree. */
  onConflict: "right" | "left";
  /** Field used to match array items under "by-key". */
  keyField: string;
}

export const DEFAULT_MERGE_OPTIONS: MergeOptions = {
  arrays: "union",
  onConflict: "right",
  keyField: "id",
};

/**
 * Not all conflicts are equally serious, and the UI should not present them
 * as if they were:
 *   value   — two scalars of the same type disagree
 *   type    — the JSON type itself changed, e.g. 3 became "three"
 *   subtree — an object or array was discarded, taking its contents with it
 */
export type ConflictKind = "value" | "type" | "subtree";

export interface Conflict {
  path: string;
  left: unknown;
  right: unknown;
  /** The value actually kept, so the report is not merely advisory. */
  taken: unknown;
  kind: ConflictKind;
  /** How many scalar values the discarded side contained. 0 for a scalar. */
  lost: number;
}

export interface MergeStats {
  /** Keys present on only one side. */
  added: number;
  conflicts: number;
  /** Array items dropped as duplicates. */
  deduplicated: number;
  /** Conflicts where a whole object or array was discarded. */
  subtreesDropped: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deep equality, used to decide whether two array items are "the same item".
 * Object key ORDER is ignored, because {a,b} and {b,a} are the same value and
 * treating them as different would leave visible duplicates in the output.
 */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => sameValue(item, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => Object.prototype.hasOwnProperty.call(b, k) && sameValue(a[k], b[k]));
  }
  return false;
}

/** Deep copy, so the result never shares structure with either input. */
function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clone) as unknown as T;
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = clone(v);
    return out as unknown as T;
  }
  return value;
}

/** The JSON type, at the granularity that matters for a merge. */
function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

/** Counts the scalars inside a value, so a dropped subtree can state its size. */
function countScalars(value: unknown): number {
  if (Array.isArray(value)) return value.reduce<number>((n, item) => n + countScalars(item), 0);
  if (isPlainObject(value)) {
    return Object.values(value).reduce<number>((n, item) => n + countScalars(item), 0);
  }
  return 1;
}

function childPath(parent: string, key: string | number): string {
  return typeof key === "number" ? `${parent}[${key}]` : `${parent}.${key}`;
}

class Merger {
  conflicts: Conflict[] = [];
  added = 0;
  deduplicated = 0;

  constructor(private readonly options: MergeOptions) {}

  /** Appends `item` unless an equal one is already there. */
  private pushUnique(into: unknown[], item: unknown) {
    if (into.some((existing) => sameValue(existing, item))) {
      this.deduplicated += 1;
      return;
    }
    into.push(clone(item));
  }

  private mergeArrays(left: unknown[], right: unknown[], path: string): unknown[] {
    switch (this.options.arrays) {
      case "replace":
        return clone(right);

      case "concat":
        return [...clone(left), ...clone(right)];

      case "by-key": {
        const out: unknown[] = [];
        const indexByKey = new Map<string, number>();
        const field = this.options.keyField;

        const take = (item: unknown, side: "left" | "right") => {
          const key = isPlainObject(item) ? item[field] : undefined;
          if (key === undefined || key === null) {
            // Nothing to match on, so it can only be appended.
            out.push(clone(item));
            return;
          }
          const id = String(key);
          const at = indexByKey.get(id);
          if (at === undefined) {
            indexByKey.set(id, out.length);
            out.push(clone(item));
            return;
          }
          // Same key on both sides: merge the two objects.
          out[at] = this.merge(out[at], item, `${path}[${field}=${id}]`);
          void side;
        };

        for (const item of left) take(item, "left");
        for (const item of right) take(item, "right");
        return out;
      }

      case "union":
      default: {
        const out: unknown[] = [];
        for (const item of left) this.pushUnique(out, item);
        for (const item of right) this.pushUnique(out, item);
        return out;
      }
    }
  }

  merge(left: unknown, right: unknown, path = "$"): unknown {
    if (Array.isArray(left) && Array.isArray(right)) {
      return this.mergeArrays(left, right, path);
    }

    if (isPlainObject(left) && isPlainObject(right)) {
      const out: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(left)) out[key] = clone(value);

      for (const [key, value] of Object.entries(right)) {
        if (!Object.prototype.hasOwnProperty.call(left, key)) {
          this.added += 1;
          out[key] = clone(value);
          continue;
        }
        out[key] = this.merge(left[key], value, childPath(path, key));
      }
      return out;
    }

    // Two values that are not both containers. Equal ones are not a conflict.
    if (sameValue(left, right)) return clone(left);

    const taken = this.options.onConflict === "left" ? left : right;
    const discarded = this.options.onConflict === "left" ? right : left;

    // A dropped container is the serious case: data disappears rather than
    // merely changing. It is counted so the summary can say how much.
    const isSubtree = Array.isArray(discarded) || isPlainObject(discarded);
    const kind: ConflictKind = isSubtree
      ? "subtree"
      : typeOf(left) !== typeOf(right) ? "type" : "value";

    this.conflicts.push({
      path,
      left: clone(left),
      right: clone(right),
      taken: clone(taken),
      kind,
      lost: isSubtree ? countScalars(discarded) : 0,
    });
    return clone(taken);
  }
}

export function mergeJson(
  leftText: string,
  rightText: string,
  options: MergeOptions,
): ToolResult<{ value: unknown; conflicts: Conflict[]; stats: MergeStats }> {
  if (!leftText.trim()) return err("The left side is empty.");
  if (!rightText.trim()) return err("The right side is empty.");

  const left = parseJson(leftText);
  if (!left.ok) {
    return err(`Left side: ${left.error.message}`, {
      ...(left.error.line != null ? { line: left.error.line } : {}),
      ...(left.error.column != null ? { column: left.error.column } : {}),
    });
  }

  const right = parseJson(rightText);
  if (!right.ok) {
    return err(`Right side: ${right.error.message}`, {
      ...(right.error.line != null ? { line: right.error.line } : {}),
      ...(right.error.column != null ? { column: right.error.column } : {}),
    });
  }

  const merger = new Merger(options);
  const value = merger.merge(left.value, right.value);

  return ok({
    value,
    conflicts: merger.conflicts,
    stats: {
      added: merger.added,
      conflicts: merger.conflicts.length,
      deduplicated: merger.deduplicated,
      subtreesDropped: merger.conflicts.filter((c) => c.kind === "subtree").length,
    },
  });
}
