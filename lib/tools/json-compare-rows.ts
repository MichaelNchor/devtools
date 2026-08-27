import type { DiffKind, DiffNode } from "./json-compare";

export type Gutter = " " | "+" | "-" | "~" | "!";

export const GUTTER_FOR: Record<DiffKind, Gutter> = {
  unchanged: " ",
  added: "+",
  removed: "-",
  changed: "~",
  "type-changed": "!",
};

export interface DiffRow {
  index: number;
  depth: number;
  /**
   * Not decoration. Colour alone never carries meaning in this system, so a
   * colourblind reader gets the classification from this glyph.
   */
  gutter: Gutter;
  kind: DiffKind;
  /** null renders as a blank line, keeping the two panes aligned. */
  leftText: string | null;
  rightText: string | null;
  path: string;
  isDifference: boolean;
}

function label(key: string | number | null): string {
  // Array elements and the root carry no key label; object members do.
  return typeof key === "string" ? `"${key}": ` : "";
}

function valueText(value: unknown): string {
  // Value-matched array elements arrive as childless nodes even when they are
  // objects, so this has to serialise containers too -- String() would render
  // them as "[object Object]". The ?? covers `undefined`, which stringify drops.
  return JSON.stringify(value) ?? String(value);
}

function brackets(value: unknown): [string, string] {
  return Array.isArray(value) ? ["[", "]"] : ["{", "}"];
}

export function toRows(root: DiffNode): DiffRow[] {
  const rows: Omit<DiffRow, "index">[] = [];

  function emit(node: DiffNode, depth: number) {
    const gutter = GUTTER_FOR[node.kind];
    // A container is only ever "changed" because a descendant is, so its own
    // rows are not differences -- the same rule computeStats applies to avoid
    // double-counting. Without this, "jump to next difference" would stop on
    // the opening and closing brace of every document. `kind` and `gutter` are
    // left untouched, so an edited block still reads as tinted end to end.
    const isDifference =
      node.kind !== "unchanged" && !(node.kind === "changed" && node.children !== undefined);
    // Presence comes from `kind`, which the engine documents as authoritative.
    const showLeft = node.kind !== "added";
    const showRight = node.kind !== "removed";

    if (node.children === undefined) {
      rows.push({
        depth, gutter, kind: node.kind, path: node.path, isDifference,
        leftText: showLeft ? `${label(node.key)}${valueText(node.left)}` : null,
        rightText: showRight ? `${label(node.key)}${valueText(node.right)}` : null,
      });
      return;
    }

    const [open, close] = brackets(showLeft ? node.left : node.right);

    rows.push({
      depth, gutter, kind: node.kind, path: node.path, isDifference,
      leftText: showLeft ? `${label(node.key)}${open}` : null,
      rightText: showRight ? `${label(node.key)}${open}` : null,
    });

    for (const child of node.children) emit(child, depth + 1);

    // The closing bracket carries the container's own classification, so an
    // added block is tinted end to end rather than stopping short of its brace.
    rows.push({
      depth, gutter, kind: node.kind, path: `${node.path}#close`, isDifference,
      leftText: showLeft ? close : null,
      rightText: showRight ? close : null,
    });
  }

  emit(root, 0);
  return rows.map((row, index) => ({ ...row, index }));
}
