export interface Cell { row: number; col: number }

export interface Grid {
  rows: number;
  cols: number;
  start: Cell;
  goal: Cell;
  /** "row,col" keys. A Set because membership is the only question asked. */
  walls: ReadonlySet<string>;
}

export type PathAlgorithm = "bfs" | "dfs" | "astar";

export const PATH_ALGORITHMS: {
  value: PathAlgorithm; label: string; guarantee: string; blurb: string;
}[] = [
  {
    value: "bfs", label: "Breadth-first",
    guarantee: "Shortest path guaranteed",
    blurb: "Explores in rings, one step out at a time, using a queue. On an unweighted grid the first time it reaches the goal is necessarily by a shortest route — but it looks everywhere at that distance first.",
  },
  {
    value: "dfs", label: "Depth-first",
    guarantee: "Any path, rarely the shortest",
    blurb: "Follows one direction as far as it goes before backtracking, using a stack. It finds a path quickly and cheaply, but the path it finds can be far longer than necessary.",
  },
  {
    value: "astar", label: "A*",
    guarantee: "Shortest path, fewer cells explored",
    blurb: "Breadth-first with a hint: cells are ordered by steps taken plus estimated steps remaining. With an estimate that never overshoots, it still finds a shortest path while exploring a fraction of the grid.",
  },
];

/**
 * One listing per algorithm. They are deliberately near-identical: the only
 * line that differs is how a cell is taken from the frontier, which is the
 * entire difference between the three.
 */
export const PATH_PSEUDOCODE: Record<PathAlgorithm, string[]> = {
  bfs: [
    "frontier ← queue containing start",
    "while frontier is not empty:",
    "  cell ← frontier.removeOldest()   ▸ FIFO",
    "  if cell is goal: return path",
    "  for each open neighbour not seen:",
    "    mark seen;  frontier.add(neighbour)",
    "return no path",
  ],
  dfs: [
    "frontier ← stack containing start",
    "while frontier is not empty:",
    "  cell ← frontier.removeNewest()   ▸ LIFO",
    "  if cell is goal: return path",
    "  for each open neighbour not seen:",
    "    mark seen;  frontier.add(neighbour)",
    "return no path",
  ],
  astar: [
    "frontier ← set containing start",
    "while frontier is not empty:",
    "  cell ← lowest g(cell) + h(cell)   ▸ best first",
    "  if cell is goal: return path",
    "  for each open neighbour not seen:",
    "    mark seen;  frontier.add(neighbour)",
    "return no path",
  ],
};

export interface PathFrame {
  visited: Cell[];
  frontier: Cell[];
  current: Cell | null;
  path: Cell[];
  found: boolean;
  note: string;
  /** Index into PATH_PSEUDOCODE[algorithm] — the line being executed. */
  line: number;
}

const key = (c: Cell) => `${c.row},${c.col}`;

export function makeGrid(rows: number, cols: number): Grid {
  return {
    rows, cols,
    start: { row: 0, col: 0 },
    goal: { row: rows - 1, col: cols - 1 },
    walls: new Set<string>(),
  };
}

/** Start and goal are never walls — sealing them makes the tool meaningless. */
export function toggleWall(grid: Grid, cell: Cell): Grid {
  if (key(cell) === key(grid.start) || key(cell) === key(grid.goal)) return grid;
  const walls = new Set(grid.walls);
  if (walls.has(key(cell))) walls.delete(key(cell)); else walls.add(key(cell));
  return { ...grid, walls };
}

function neighbours(grid: Grid, cell: Cell): Cell[] {
  // Four-connected: no diagonals, which is what makes step count and
  // Manhattan distance comparable.
  return [
    { row: cell.row - 1, col: cell.col },
    { row: cell.row + 1, col: cell.col },
    { row: cell.row, col: cell.col - 1 },
    { row: cell.row, col: cell.col + 1 },
  ].filter((n) =>
    n.row >= 0 && n.row < grid.rows && n.col >= 0 && n.col < grid.cols
    && !grid.walls.has(key(n)));
}

function manhattan(a: Cell, b: Cell): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function reconstruct(cameFrom: Map<string, Cell>, goal: Cell): Cell[] {
  const path: Cell[] = [goal];
  let current = goal;
  while (cameFrom.has(key(current))) {
    current = cameFrom.get(key(current))!;
    path.unshift(current);
  }
  return path;
}

/**
 * Records the search as replayable frames. All three algorithms share one
 * loop and differ only in which cell they take next — which is the actual
 * lesson: BFS takes the oldest, DFS the newest, A* the most promising.
 */
export function searchFrames(grid: Grid, algorithm: PathAlgorithm): PathFrame[] {
  const frames: PathFrame[] = [];
  const visited: Cell[] = [];
  const seen = new Set<string>([key(grid.start)]);
  const cameFrom = new Map<string, Cell>();
  const cost = new Map<string, number>([[key(grid.start), 0]]);
  let open: Cell[] = [grid.start];

  const take = (): Cell => {
    if (algorithm === "dfs") return open.pop()!;
    if (algorithm === "bfs") return open.shift()!;
    // A*: lowest cost-so-far plus estimate-to-goal.
    let best = 0;
    for (let i = 1; i < open.length; i += 1) {
      const f = (c: Cell) => (cost.get(key(c)) ?? 0) + manhattan(c, grid.goal);
      if (f(open[i]!) < f(open[best]!)) best = i;
    }
    return open.splice(best, 1)[0]!;
  };

  frames.push({
    visited: [], frontier: [grid.start], current: null, path: [], found: false, line: 0,
    note: "Start. The frontier holds the cells known but not yet explored.",
  });

  while (open.length > 0) {
    const current = take();
    visited.push(current);

    if (key(current) === key(grid.goal)) {
      const path = reconstruct(cameFrom, grid.goal);
      frames.push({
        visited: [...visited], frontier: [...open], current, path, found: true, line: 3,
        note: `Reached the goal after exploring ${visited.length} cells. The path is ${path.length - 1} steps.`,
      });
      return frames;
    }

    for (const next of neighbours(grid, current)) {
      if (seen.has(key(next))) continue;
      seen.add(key(next));
      cameFrom.set(key(next), current);
      cost.set(key(next), (cost.get(key(current)) ?? 0) + 1);
      open.push(next);
    }

    frames.push({
      visited: [...visited], frontier: [...open], current, path: [], found: false, line: 5,
      note: `Explored (${current.row}, ${current.col}). ${open.length} cells on the frontier.`,
    });
  }

  frames.push({
    visited: [...visited], frontier: [], current: null, path: [], found: false, line: 6,
    note: `No path exists. All ${visited.length} reachable cells were explored and the goal was not among them.`,
  });
  return frames;
}
