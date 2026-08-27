import type { DiffKind, DiffNode } from "./json-compare";

export type DifferenceKind = Exclude<DiffKind, "unchanged">;

export interface SummaryItem {
  path: string;
  kind: DifferenceKind;
  left?: unknown;
  right?: unknown;
}

export interface SummaryGroup {
  kind: DifferenceKind;
  /** Always spelled out: the Status Escape Rule forbids colour standing alone. */
  label: string;
  items: SummaryItem[];
}

const GROUP_ORDER: DifferenceKind[] = ["added", "removed", "changed", "type-changed"];

const GROUP_LABELS: Record<DifferenceKind, string> = {
  added: "Added",
  removed: "Removed",
  changed: "Changed",
  "type-changed": "Type changed",
};

export function summarise(root: DiffNode): SummaryGroup[] {
  const found: SummaryItem[] = [];

  function visit(node: DiffNode) {
    if (node.kind === "added" || node.kind === "removed") {
      // Report the subtree root only — the same counting rule computeStats
      // uses, so the summary and the stats bar can never disagree.
      found.push({ path: node.path, kind: node.kind, left: node.left, right: node.right });
      return;
    }
    if (node.kind === "type-changed" || (node.kind === "changed" && !node.children)) {
      found.push({ path: node.path, kind: node.kind, left: node.left, right: node.right });
      return;
    }
    for (const child of node.children ?? []) visit(child);
  }

  visit(root);

  return GROUP_ORDER
    .map((kind) => ({
      kind,
      label: GROUP_LABELS[kind],
      items: found.filter((item) => item.kind === kind),
    }))
    // A group with nothing in it is absent, not empty.
    .filter((group) => group.items.length > 0);
}
