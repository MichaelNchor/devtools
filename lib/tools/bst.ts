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

export type BstOperation = "insert" | "search" | "remove";

/**
 * One listing per operation, with frames carrying an index into it — so the
 * highlighted line is emitted by the same walk that moves through the tree
 * and cannot drift out of step with what is drawn.
 */
export const BST_PSEUDOCODE: Record<BstOperation, { title: string; lines: string[] }> = {
  insert: {
    title: "insert(node, v)",
    lines: [
      "if node is empty:  return new Node(v)",
      "if v = node.value: return node        ▸ a set, no duplicates",
      "if v < node.value: go left",
      "else:              go right",
      "attach the new node and return",
    ],
  },
  search: {
    title: "search(node, v)",
    lines: [
      "while node is not empty:",
      "  if v = node.value: return found",
      "  if v < node.value: node ← node.left",
      "  else:              node ← node.right",
      "return not found                      ▸ one step per level",
    ],
  },
  remove: {
    title: "remove(node, v)",
    lines: [
      "descend to the node holding v",
      "if it has no children:  drop it",
      "if it has one child:    promote that child",
      "if it has two children:",
      "  s ← smallest value in node.right    ▸ the successor",
      "  node.value ← s;  remove s from node.right",
    ],
  },
};

export interface BstFrame {
  /** The tree as it stands at this step. Only the last frame differs. */
  tree: BstNode | null;
  /** The node being examined, or null once the walk has run off the end. */
  current: number | null;
  /** Values compared so far, in order. */
  path: number[];
  found: boolean;
  line: number;
  note: string;
}

/** Counts children without walking the whole subtree. */
function childCount(node: BstNode): number {
  return (node.left ? 1 : 0) + (node.right ? 1 : 0);
}

/**
 * Records an operation as replayable frames. The tree is only replaced in the
 * final frame, so stepping shows the WALK first and the result last — which is
 * the order the operation actually happens in.
 */
export function operationFrames(
  root: BstNode | null,
  operation: BstOperation,
  value: number,
): BstFrame[] {
  const frames: BstFrame[] = [];
  const path: number[] = [];
  // Annotated: without it the reassignment inside the walk makes TypeScript
  // lose the narrowing and infer the loop variables as any.
  let node: BstNode | null = root;

  const step = (line: number, note: string, current: number | null, found = false) => {
    frames.push({ tree: root, current, path: [...path], found, line, note });
  };

  if (operation === "search") {
    while (node !== null) {
      path.push(node.value);
      if (value === node.value) {
        step(1, `${value} is here. Found it in ${path.length} comparisons.`, node.value, true);
        return frames;
      }
      const goLeft: boolean = value < node.value;
      step(goLeft ? 2 : 3, `${value} is ${goLeft ? "less" : "greater"} than ${node.value}, so go ${goLeft ? "left" : "right"}.`, node.value);
      node = goLeft ? node.left : node.right;
    }
    step(4, `Ran out of tree after ${path.length} comparisons — ${value} is not present.`, null);
    return frames;
  }

  if (operation === "insert") {
    if (node === null) {
      const tree = insert(root, value);
      frames.push({ tree, current: null, path: [], found: false, line: 0, note: `The tree was empty, so ${value} becomes the root.` });
      return frames;
    }
    while (node !== null) {
      path.push(node.value);
      if (value === node.value) {
        step(1, `${value} is already in the tree. A BST holds a set, so nothing changes.`, node.value, true);
        return frames;
      }
      const goLeft: boolean = value < node.value;
      step(goLeft ? 2 : 3, `${value} is ${goLeft ? "less" : "greater"} than ${node.value}, so go ${goLeft ? "left" : "right"}.`, node.value);
      const next: BstNode | null = goLeft ? node.left : node.right;
      if (next === null) {
        frames.push({
          tree: insert(root, value), current: value, path: [...path], found: false, line: 4,
          note: `There is no ${goLeft ? "left" : "right"} child, so ${value} attaches here at depth ${path.length}.`,
        });
        return frames;
      }
      node = next;
    }
    return frames;
  }

  // remove
  while (node !== null && node.value !== value) {
    path.push(node.value);
    const goLeft: boolean = value < node.value;
    step(0, `${value} is ${goLeft ? "less" : "greater"} than ${node.value}, so go ${goLeft ? "left" : "right"}.`, node.value);
    node = goLeft ? node.left : node.right;
  }

  if (node === null) {
    step(0, `${value} is not in the tree, so there is nothing to remove.`, null);
    return frames;
  }

  path.push(node.value);
  const children = childCount(node);
  if (children === 0) {
    step(1, `${value} is a leaf, so it can simply be dropped.`, node.value);
  } else if (children === 1) {
    step(2, `${value} has one child, which is promoted into its place.`, node.value);
  } else {
    let successor = node.right!;
    while (successor.left !== null) successor = successor.left;
    step(3, `${value} has two children, so it cannot just be removed.`, node.value);
    step(4, `The in-order successor is ${successor.value} — the smallest value on its right.`, successor.value);
    step(5, `${successor.value} takes its place, and is removed from the right subtree.`, successor.value);
  }

  frames.push({
    tree: remove(root, value), current: null, path: [...path], found: true,
    line: children === 2 ? 5 : children === 1 ? 2 : 1,
    note: `${value} removed. The tree is still ordered.`,
  });
  return frames;
}
