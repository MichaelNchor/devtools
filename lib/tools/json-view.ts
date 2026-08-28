/**
 * Turns a parsed value into the lines of a collapsible JSON view.
 *
 * The output is real JSON when nothing is collapsed — a test parses it back
 * and compares, because a viewer that quietly misrepresents its data is worse
 * than no viewer. Collapsed containers are the only lines that are not valid
 * JSON, and they say so by showing a count.
 */

export type LineKind = "object" | "array" | "scalar";

export interface JsonLine {
  /** "$.users[0].email" — the same notation Compare and Merge use. */
  path: string;
  depth: number;
  kind: LineKind;
  /** The text of the line, excluding indentation. */
  text: string;
  /** Set when this line can be folded; null otherwise. */
  togglePath: string | null;
  /** True on the line that closes a container, for styling. */
  isClosing: boolean;
  /** The value this line represents, so a row can copy it. */
  value: unknown;
}

function kindOf(value: unknown): LineKind {
  if (Array.isArray(value)) return "array";
  return typeof value === "object" && value !== null ? "object" : "scalar";
}

function entriesOf(value: unknown): [string | number, unknown][] {
  if (Array.isArray(value)) return value.map((item, index) => [index, item]);
  if (typeof value === "object" && value !== null) {
    return Object.entries(value as Record<string, unknown>);
  }
  return [];
}

/** `"key": ` for an object member; nothing for an array element or the root. */
function label(key: string | number | null): string {
  return typeof key === "string" ? `${JSON.stringify(key)}: ` : "";
}

function scalarText(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

function summary(kind: LineKind, count: number): string {
  const noun = kind === "array" ? "item" : "key";
  const brackets = kind === "array" ? "[…]" : "{…}";
  return `${brackets} ${count} ${noun}${count === 1 ? "" : "s"}`;
}

function childPath(parent: string, key: string | number): string {
  return typeof key === "number" ? `${parent}[${key}]` : `${parent}.${key}`;
}

export function toJsonLines(value: unknown, collapsed: ReadonlySet<string>): JsonLine[] {
  const lines: JsonLine[] = [];

  function walk(
    node: unknown,
    path: string,
    key: string | number | null,
    depth: number,
    comma: boolean,
  ) {
    const kind = kindOf(node);
    const prefix = label(key);
    const tail = comma ? "," : "";

    if (kind === "scalar") {
      lines.push({
        path, depth, kind, value: node, togglePath: null, isClosing: false,
        text: `${prefix}${scalarText(node)}${tail}`,
      });
      return;
    }

    const entries = entriesOf(node);
    const [open, close] = kind === "array" ? ["[", "]"] : ["{", "}"];

    // An empty container has nothing to fold, so it stays on one line.
    if (entries.length === 0) {
      lines.push({
        path, depth, kind, value: node, togglePath: null, isClosing: false,
        text: `${prefix}${open}${close}${tail}`,
      });
      return;
    }

    if (collapsed.has(path)) {
      lines.push({
        path, depth, kind, value: node, togglePath: path, isClosing: false,
        text: `${prefix}${summary(kind, entries.length)}${tail}`,
      });
      return;
    }

    lines.push({
      path, depth, kind, value: node, togglePath: path, isClosing: false,
      text: `${prefix}${open}`,
    });

    entries.forEach(([childKey, child], index) => {
      walk(child, childPath(path, childKey), childKey, depth + 1, index < entries.length - 1);
    });

    lines.push({
      path: `${path}#close`, depth, kind, value: node,
      togglePath: null, isClosing: true,
      text: `${close}${tail}`,
    });
  }

  walk(value, "$", null, 0, false);
  return lines;
}

/** Every path that can be folded, for an expand-all / collapse-all control. */
export function containerPaths(value: unknown): string[] {
  const out: string[] = [];

  function walk(node: unknown, path: string) {
    const entries = entriesOf(node);
    // Empty containers are excluded: there is nothing to hide.
    if (entries.length === 0) return;
    out.push(path);
    for (const [key, child] of entries) walk(child, childPath(path, key));
  }

  walk(value, "$");
  return out;
}

/** The paths to collapse so that nothing deeper than `depth` is shown. */
export function pathsToDepth(value: unknown, depth: number): string[] {
  const out: string[] = [];

  function walk(node: unknown, path: string, level: number) {
    const entries = entriesOf(node);
    if (entries.length === 0) return;
    if (level >= depth) { out.push(path); return; }
    for (const [key, child] of entries) walk(child, childPath(path, key), level + 1);
  }

  walk(value, "$", 0);
  return out;
}
