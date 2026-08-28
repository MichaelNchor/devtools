export interface BstNode {
  value: number;
  left: BstNode | null;
  right: BstNode | null;
}

export type Traversal = "in" | "pre" | "post" | "level";

export const TRAVERSALS: { value: Traversal; label: string; blurb: string }[] = [
  { value: "in", label: "In-order", blurb: "Left, node, right. On a BST this always comes out sorted — which is the whole point of the shape." },
  { value: "pre", label: "Pre-order", blurb: "Node, left, right. Visits a parent before its children, so it is what you use to copy or serialise a tree." },
  { value: "post", label: "Post-order", blurb: "Left, right, node. Visits children before the parent, so it is what you use to free or delete one." },
  { value: "level", label: "Level-order", blurb: "Row by row, using a queue rather than recursion. This is breadth-first search on a tree." },
];

/**
 * Every operation returns a NEW tree and leaves the input untouched. Mutating
 * in place would be shorter, but the visualiser keeps previous states around
 * to step through, and shared mutable nodes would corrupt them.
 */
export function insert(node: BstNode | null, value: number): BstNode {
  if (node === null) return { value, left: null, right: null };
  // A BST holds a set: a duplicate is a no-op, not a second node.
  if (value === node.value) return node;
  return value < node.value
    ? { ...node, left: insert(node.left, value) }
    : { ...node, right: insert(node.right, value) };
}

export function buildTree(values: number[]): BstNode | null {
  return values.reduce<BstNode | null>((tree, value) => insert(tree, value), null);
}

function minValue(node: BstNode): number {
  return node.left === null ? node.value : minValue(node.left);
}

export function remove(node: BstNode | null, value: number): BstNode | null {
  if (node === null) return null;
  if (value < node.value) return { ...node, left: remove(node.left, value) };
  if (value > node.value) return { ...node, right: remove(node.right, value) };

  // Found it. Nought or one child is a straight promotion.
  if (node.left === null) return node.right;
  if (node.right === null) return node.left;

  // Two children: take the in-order successor — the smallest value on the
  // right — because it is the only value that keeps every ordering invariant.
  const successor = minValue(node.right);
  return { value: successor, left: node.left, right: remove(node.right, successor) };
}

export function searchPath(node: BstNode | null, value: number): { path: number[]; found: boolean } {
  const path: number[] = [];
  let current = node;
  while (current !== null) {
    path.push(current.value);
    if (value === current.value) return { path, found: true };
    current = value < current.value ? current.left : current.right;
  }
  return { path, found: false };
}

export function traverse(node: BstNode | null, order: Traversal): number[] {
  if (node === null) return [];

  if (order === "level") {
    const out: number[] = [];
    const queue: BstNode[] = [node];
    while (queue.length > 0) {
      const current = queue.shift()!;
      out.push(current.value);
      if (current.left) queue.push(current.left);
      if (current.right) queue.push(current.right);
    }
    return out;
  }

  const left = traverse(node.left, order);
  const right = traverse(node.right, order);
  if (order === "pre") return [node.value, ...left, ...right];
  if (order === "post") return [...left, ...right, node.value];
  return [...left, node.value, ...right];
}

export interface TreeStats {
  size: number;
  height: number;
  balanced: boolean;
  min: number | null;
  max: number | null;
}

function heightOf(node: BstNode | null): number {
  return node === null ? 0 : 1 + Math.max(heightOf(node.left), heightOf(node.right));
}

function isBalanced(node: BstNode | null): boolean {
  if (node === null) return true;
  const gap = Math.abs(heightOf(node.left) - heightOf(node.right));
  return gap <= 1 && isBalanced(node.left) && isBalanced(node.right);
}

export function treeStats(node: BstNode | null): TreeStats {
  const values = traverse(node, "in");
  return {
    size: values.length,
    height: heightOf(node),
    balanced: isBalanced(node),
    min: values[0] ?? null,
    max: values[values.length - 1] ?? null,
  };
}

export interface LaidOutNode {
  value: number;
  x: number;
  y: number;
  depth: number;
  parent: { x: number; y: number } | null;
}

/**
 * Positions nodes for drawing: depth sets the row, and in-order rank sets the
 * column. Using in-order rank is what guarantees no two nodes share an x, so
 * subtrees never overlap however lopsided the tree gets.
 */
export function layout(root: BstNode | null): LaidOutNode[] {
  const out: LaidOutNode[] = [];
  let column = 0;

  function walk(node: BstNode | null, depth: number, parent: { x: number; y: number } | null) {
    if (node === null) return;
    walk(node.left, depth + 1, null);
    const self = { x: column, y: depth };
    column += 1;
    out.push({ value: node.value, x: self.x, y: self.y, depth, parent });
    walk(node.right, depth + 1, null);
  }

  // Two passes: place everything first, then link each node to its parent's
  // finished position, which the single recursive pass cannot know in advance.
  walk(root, 0, null);
  const byValue = new Map(out.map((n) => [n.value, n]));
  function link(node: BstNode | null, parentValue: number | null) {
    if (node === null) return;
    const self = byValue.get(node.value)!;
    const parent = parentValue === null ? null : byValue.get(parentValue)!;
    self.parent = parent ? { x: parent.x, y: parent.y } : null;
    link(node.left, node.value);
    link(node.right, node.value);
  }
  link(root, null);

  return out;
}
