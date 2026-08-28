export type Complexity =
  | "O(1)" | "O(log n)" | "O(n)" | "O(n log n)" | "O(n²)" | "O(2ⁿ)" | "O(n!)";

/** Ordered best to worst. The index doubles as the severity rank. */
export const COMPLEXITY_ORDER: Complexity[] = [
  "O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(2ⁿ)", "O(n!)",
];

export interface StructureRow {
  name: string;
  access: Complexity;
  search: Complexity;
  insert: Complexity;
  remove: Complexity;
  space: Complexity;
  note: string;
}

export const STRUCTURES: StructureRow[] = [
  { name: "Array", access: "O(1)", search: "O(n)", insert: "O(n)", remove: "O(n)", space: "O(n)",
    note: "Indexing is free; inserting in the middle shifts everything after it." },
  { name: "Dynamic array", access: "O(1)", search: "O(n)", insert: "O(1)", remove: "O(n)", space: "O(n)",
    note: "Append is amortised O(1) — most are free, and the occasional resize copies everything." },
  { name: "Linked list", access: "O(n)", search: "O(n)", insert: "O(1)", remove: "O(1)", space: "O(n)",
    note: "Insert and remove are constant only once you already hold the node. Finding it is the O(n) part." },
  { name: "Hash table", access: "O(1)", search: "O(1)", insert: "O(1)", remove: "O(1)", space: "O(n)",
    note: "Constant on average. Worst case is O(n) when every key collides, which is why hash quality matters." },
  { name: "Binary search tree", access: "O(log n)", search: "O(log n)", insert: "O(log n)", remove: "O(log n)", space: "O(n)",
    note: "Only while balanced. Insert sorted data into a plain BST and every operation degrades to O(n)." },
  { name: "Balanced tree (AVL, red-black)", access: "O(log n)", search: "O(log n)", insert: "O(log n)", remove: "O(log n)", space: "O(n)",
    note: "Pays a rebalance on write to guarantee the height, so the log is a guarantee rather than a hope." },
  { name: "Binary heap", access: "O(n)", search: "O(n)", insert: "O(log n)", remove: "O(log n)", space: "O(n)",
    note: "Only the minimum or maximum is cheap to reach — which is exactly what a priority queue needs." },
  { name: "B-tree", access: "O(log n)", search: "O(log n)", insert: "O(log n)", remove: "O(log n)", space: "O(n)",
    note: "Wide and shallow, so each node is one disk or page read. This is what your database index is." },
];

export interface AlgorithmRow {
  name: string;
  best: Complexity;
  average: Complexity;
  worst: Complexity;
  space: Complexity;
  note: string;
}

export const ALGORITHMS: AlgorithmRow[] = [
  { name: "Binary search", best: "O(1)", average: "O(log n)", worst: "O(log n)", space: "O(1)",
    note: "Halves the search space each step — but only works on already-sorted data." },
  { name: "Linear search", best: "O(1)", average: "O(n)", worst: "O(n)", space: "O(1)",
    note: "Unbeatable on unsorted data, because anything faster needs an index you have not built." },
  { name: "Bubble sort", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)",
    note: "Teaching material. Its one virtue is detecting an already-sorted list in a single pass." },
  { name: "Insertion sort", best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)",
    note: "Genuinely fast on small or nearly-sorted inputs, which is why real sorts fall back to it." },
  { name: "Merge sort", best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(n)",
    note: "The only guarantee that never degrades. The cost is the extra array it merges into." },
  { name: "Quicksort", best: "O(n log n)", average: "O(n log n)", worst: "O(n²)", space: "O(log n)",
    note: "Usually fastest in practice. A bad pivot on sorted input is what makes the worst case real." },
  { name: "Heapsort", best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(1)",
    note: "Merge sort's guarantee without the extra memory — at the cost of poor cache behaviour." },
  { name: "Breadth-first search", best: "O(1)", average: "O(n)", worst: "O(n)", space: "O(n)",
    note: "Finds a shortest path on an unweighted graph, but holds a whole frontier in memory." },
  { name: "Depth-first search", best: "O(1)", average: "O(n)", worst: "O(n)", space: "O(log n)",
    note: "Cheap on memory, and gives no shortest-path guarantee whatsoever." },
];

/** How bad is this, from 0 (constant) to 1 (factorial)? Drives the tint. */
export function severity(c: Complexity): number {
  return COMPLEXITY_ORDER.indexOf(c) / (COMPLEXITY_ORDER.length - 1);
}

/** Operations at n, for making the growth concrete rather than abstract. */
export function operationsAt(c: Complexity, n: number): number {
  switch (c) {
    case "O(1)": return 1;
    case "O(log n)": return Math.ceil(Math.log2(Math.max(n, 1)));
    case "O(n)": return n;
    case "O(n log n)": return Math.ceil(n * Math.log2(Math.max(n, 1)));
    case "O(n²)": return n * n;
    case "O(2ⁿ)": return n > 40 ? Infinity : 2 ** n;
    case "O(n!)": {
      if (n > 18) return Infinity;
      let out = 1;
      for (let i = 2; i <= n; i += 1) out *= i;
      return out;
    }
  }
}
