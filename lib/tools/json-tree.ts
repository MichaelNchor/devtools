export interface TreeRow {
  /** Same notation as JSON Compare: "$.users[0].email". */
  path: string;
  key: string | number | null;
  depth: number;
  kind: "object" | "array" | "scalar";
  /** Short right-hand label: a scalar's value, or a container's shape. */
  preview: string;
  /** The raw value, so a row can copy it without re-walking the document. */
  value: unknown;
  childCount: number;
  hasChildren: boolean;
}

function kindOf(value: unknown): TreeRow["kind"] {
  if (Array.isArray(value)) return "array";
  return typeof value === "object" && value !== null ? "object" : "scalar";
}

function entriesOf(value: unknown): [string | number, unknown][] {
  if (Array.isArray(value)) return value.map((item, index) => [index, item]);
  if (typeof value === "object" && value !== null) return Object.entries(value as Record<string, unknown>);
  return [];
}

function previewOf(value: unknown, kind: TreeRow["kind"], childCount: number): string {
  if (kind === "array") return `[${childCount}]`;
  if (kind === "object") return `{${childCount}}`;
  return JSON.stringify(value) ?? String(value);
}

/**
 * Flattens a parsed document into display rows, skipping the subtree of any
 * collapsed path. Pure: same value plus same collapse set, same rows — which
 * is what lets the component memoise on those two inputs alone.
 */
export function toTreeRows(value: unknown, collapsed: ReadonlySet<string>): TreeRow[] {
  const rows: TreeRow[] = [];

  function walk(node: unknown, path: string, key: string | number | null, depth: number) {
    const kind = kindOf(node);
    const entries = entriesOf(node);
    rows.push({
      path, key, depth, kind, value: node,
      childCount: entries.length,
      hasChildren: entries.length > 0,
      preview: previewOf(node, kind, entries.length),
    });

    if (collapsed.has(path)) return;
    for (const [childKey, child] of entries) {
      const childPath = typeof childKey === "number" ? `${path}[${childKey}]` : `${path}.${childKey}`;
      walk(child, childPath, childKey, depth + 1);
    }
  }

  walk(value, "$", null, 0);
  return rows;
}
