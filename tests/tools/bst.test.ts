import { describe, it, expect } from "vitest";
import {
  buildTree, insert, remove, searchPath, traverse, layout, treeStats,
  operationFrames, BST_PSEUDOCODE, type BstNode,
} from "@/lib/tools/bst";

const from = (values: number[]) => buildTree(values);
const of = (t: BstNode | null, order: Parameters<typeof traverse>[1]) => traverse(t, order);

describe("insert", () => {
  it("builds a tree that reads back sorted in order", () => {
    expect(of(from([5, 3, 8, 1, 4]), "in")).toEqual([1, 3, 4, 5, 8]);
  });

  it("puts smaller values left and larger right", () => {
    const t = from([5, 3, 8])!;
    expect(t.value).toBe(5);
    expect(t.left!.value).toBe(3);
    expect(t.right!.value).toBe(8);
  });

  it("ignores a duplicate rather than growing a second copy", () => {
    expect(of(from([5, 3, 5, 3]), "in")).toEqual([3, 5]);
  });

  it("returns a new tree and leaves the original alone", () => {
    const original = from([5]);
    const next = insert(original, 3);
    expect(of(original, "in")).toEqual([5]);
    expect(of(next, "in")).toEqual([3, 5]);
  });

  it("degenerates into a list when given sorted input", () => {
    // The classic failure: a BST built from sorted data is a linked list.
    const t = from([1, 2, 3, 4]);
    expect(treeStats(t).height).toBe(4);
  });
});

describe("traverse", () => {
  const t = from([5, 3, 8, 1, 4, 7, 9]);
  it("walks in order", () => { expect(of(t, "in")).toEqual([1, 3, 4, 5, 7, 8, 9]); });
  it("walks pre-order", () => { expect(of(t, "pre")).toEqual([5, 3, 1, 4, 8, 7, 9]); });
  it("walks post-order", () => { expect(of(t, "post")).toEqual([1, 4, 3, 7, 9, 8, 5]); });
  it("walks level by level", () => { expect(of(t, "level")).toEqual([5, 3, 8, 1, 4, 7, 9]); });
  it("returns nothing for an empty tree", () => { expect(of(null, "in")).toEqual([]); });
});

describe("searchPath", () => {
  it("returns the nodes visited on the way to a hit", () => {
    expect(searchPath(from([5, 3, 8, 1, 4]), 4)).toEqual({ path: [5, 3, 4], found: true });
  });

  it("returns the path it took even when the value is absent", () => {
    expect(searchPath(from([5, 3, 8]), 7)).toEqual({ path: [5, 8], found: false });
  });

  it("handles an empty tree", () => {
    expect(searchPath(null, 1)).toEqual({ path: [], found: false });
  });
});

describe("remove", () => {
  it("removes a leaf", () => {
    expect(of(remove(from([5, 3, 8]), 3), "in")).toEqual([5, 8]);
  });

  it("removes a node with one child, promoting it", () => {
    expect(of(remove(from([5, 3, 8, 1]), 3), "in")).toEqual([1, 5, 8]);
  });

  it("removes a node with two children and stays ordered", () => {
    // The hard case: the node is replaced by its in-order successor.
    const t = remove(from([5, 3, 8, 7, 9]), 8);
    expect(of(t, "in")).toEqual([3, 5, 7, 9]);
  });

  it("removes the root", () => {
    expect(of(remove(from([5, 3, 8]), 5), "in")).toEqual([3, 8]);
  });

  it("leaves the tree alone when the value is absent", () => {
    expect(of(remove(from([5, 3]), 99), "in")).toEqual([3, 5]);
  });

  it("does not mutate the original tree", () => {
    const original = from([5, 3, 8]);
    remove(original, 3);
    expect(of(original, "in")).toEqual([3, 5, 8]);
  });
});

describe("treeStats", () => {
  it("counts nodes and measures height", () => {
    expect(treeStats(from([5, 3, 8, 1]))).toMatchObject({ size: 4, height: 3 });
  });

  it("reports an empty tree as size 0, height 0", () => {
    expect(treeStats(null)).toMatchObject({ size: 0, height: 0 });
  });

  it("says whether the tree is balanced", () => {
    expect(treeStats(from([2, 1, 3])).balanced).toBe(true);
    expect(treeStats(from([1, 2, 3, 4])).balanced).toBe(false);
  });
});

describe("layout", () => {
  it("gives every node a position", () => {
    const nodes = layout(from([5, 3, 8, 1, 4]));
    expect(nodes).toHaveLength(5);
    for (const n of nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
    }
  });

  it("places children below their parent", () => {
    const nodes = layout(from([5, 3, 8]));
    const root = nodes.find((n) => n.value === 5)!;
    for (const child of nodes.filter((n) => n.value !== 5)) {
      expect(child.y).toBeGreaterThan(root.y);
    }
  });

  it("orders nodes left to right by in-order position", () => {
    // Two nodes never share an x, which is what stops the drawing overlapping.
    const xs = layout(from([5, 3, 8, 1, 4, 7, 9])).map((n) => n.x);
    expect(new Set(xs).size).toBe(xs.length);
  });

  it("returns nothing for an empty tree", () => {
    expect(layout(null)).toEqual([]);
  });
});

describe("operationFrames", () => {
  const t = buildTree([50, 30, 70, 20, 40]);

  it("walks from the root down to where a value belongs when inserting", () => {
    const frames = operationFrames(t, "insert", 35);
    expect(frames[0]!.current).toBe(50);
    // The last frame highlights the node just created, not the empty slot it
    // went into — that is the thing the reader is looking for.
    expect(frames.map((f) => f.current)).toEqual([50, 30, 40, 35]);
    expect(traverse(frames.at(-1)!.tree, "in")).toEqual([20, 30, 35, 40, 50, 70]);
  });

  it("leaves the tree unchanged until the final frame of an insert", () => {
    const frames = operationFrames(t, "insert", 35);
    for (const frame of frames.slice(0, -1)) {
      expect(traverse(frame.tree, "in")).toEqual([20, 30, 40, 50, 70]);
    }
  });

  it("records the comparison path when searching", () => {
    const frames = operationFrames(t, "search", 40);
    expect(frames.at(-1)!.path).toEqual([50, 30, 40]);
    expect(frames.at(-1)!.found).toBe(true);
  });

  it("reports a miss, having walked as far as it could", () => {
    const frames = operationFrames(t, "search", 45);
    expect(frames.at(-1)!.found).toBe(false);
    expect(frames.at(-1)!.path).toEqual([50, 30, 40]);
  });

  it("removes a value and shows the result in the last frame", () => {
    const frames = operationFrames(t, "remove", 30);
    expect(traverse(frames.at(-1)!.tree, "in")).toEqual([20, 40, 50, 70]);
  });

  it("narrates the successor step when removing a node with two children", () => {
    const two = buildTree([50, 30, 70, 60, 80]);
    const frames = operationFrames(two, "remove", 70);
    expect(frames.some((f) => f.note.toLowerCase().includes("successor"))).toBe(true);
    expect(traverse(frames.at(-1)!.tree, "in")).toEqual([30, 50, 60, 80]);
  });

  it("points every frame at a real pseudocode line for its operation", () => {
    for (const op of ["insert", "search", "remove"] as const) {
      const lines = BST_PSEUDOCODE[op].lines;
      for (const frame of operationFrames(t, op, 40)) {
        expect(frame.line, `${op}: ${frame.note}`).toBeGreaterThanOrEqual(0);
        expect(frame.line, `${op}: ${frame.note}`).toBeLessThan(lines.length);
      }
    }
  });

  it("captions every frame", () => {
    for (const op of ["insert", "search", "remove"] as const) {
      for (const frame of operationFrames(t, op, 40)) {
        expect(frame.note.length, op).toBeGreaterThan(0);
      }
    }
  });

  it("handles an empty tree", () => {
    const frames = operationFrames(null, "insert", 5);
    expect(traverse(frames.at(-1)!.tree, "in")).toEqual([5]);
    expect(operationFrames(null, "search", 5).at(-1)!.found).toBe(false);
  });

  it("never mutates the tree it was given", () => {
    const original = buildTree([50, 30]);
    operationFrames(original, "insert", 99);
    operationFrames(original, "remove", 30);
    expect(traverse(original, "in")).toEqual([30, 50]);
  });
});
