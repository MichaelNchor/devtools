import type { DiffKind, DiffNode } from "./json-compare";

export type DifferenceKind = Exclude<DiffKind, "unchanged">;

export interface SummaryItem {
  path: string;
  kind: DifferenceKind;
  left?: unknown;
  right?: unknown;
  /**
   * How many scalar values this difference covers. A type change from an
   * object to a string is a bigger event than one scalar becoming another,
   * and without this the summary presents them identically.
   */
  size: number;
}

export interface SummaryGroup {
  kind: DifferenceKind;
  /** Always spelled out: the Status Escape Rule forbids colour standing alone. */
  label: string;
  items: SummaryItem[];
  /** Total values covered by the group, for the heading. */
  size: number;
}

const GROUP_ORDER: DifferenceKind[] = ["added", "removed", "changed", "type-changed"];

const GROUP_LABELS: Record<DifferenceKind, string> = {
  added: "Added",
  removed: "Removed",
  changed: "Changed",
  "type-changed": "Type changed",
};

/** Counts the scalars inside a value; a scalar is one. */
function countScalars(value: unknown): number {
  if (Array.isArray(value)) return value.reduce<number>((n, item) => n + countScalars(item), 0);
  if (typeof value === "object" && value !== null) {
    return Object.values(value as Record<string, unknown>)
      .reduce<number>((n, item) => n + countScalars(item), 0);
  }
  return 1;
}

/** The larger side, since that is the amount of structure involved. */
function sizeOf(node: DiffNode): number {
  return Math.max(
    node.left === undefined ? 0 : countScalars(node.left),
    node.right === undefined ? 0 : countScalars(node.right),
    1,
  );
}

export function summarise(root: DiffNode): SummaryGroup[] {
  const found: SummaryItem[] = [];

  function visit(node: DiffNode) {
    if (node.kind === "added" || node.kind === "removed") {
      // Report the subtree root only — the same counting rule computeStats
      // uses, so the summary and the stats bar can never disagree.
      found.push({
        path: node.path, kind: node.kind,
        left: node.left, right: node.right, size: sizeOf(node),
      });
      return;
    }
    if (node.kind === "type-changed" || (node.kind === "changed" && !node.children)) {
      found.push({
        path: node.path, kind: node.kind,
        left: node.left, right: node.right, size: sizeOf(node),
      });
      return;
    }
    for (const child of node.children ?? []) visit(child);
  }

  visit(root);

  return GROUP_ORDER
    .map((kind) => {
      const items = found.filter((item) => item.kind === kind);
      return {
        kind,
        label: GROUP_LABELS[kind],
        items,
        size: items.reduce((sum, item) => sum + item.size, 0),
      };
    })
    // A group with nothing in it is absent, not empty.
    .filter((group) => group.items.length > 0);
}
