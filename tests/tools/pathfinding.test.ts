import { describe, it, expect } from "vitest";
import {
  makeGrid, searchFrames, PATH_ALGORITHMS, PATH_PSEUDOCODE, toggleWall,
  type Grid, type PathAlgorithm,
} from "@/lib/tools/pathfinding";

const grid = (rows = 6, cols = 8): Grid => makeGrid(rows, cols);
const last = (g: Grid, a: PathAlgorithm = "bfs") => searchFrames(g, a).at(-1)!;

describe("makeGrid", () => {
  it("places a start and a goal that are not the same cell", () => {
    const g = grid();
    expect(g.start).not.toEqual(g.goal);
  });

  it("starts with no walls", () => {
    expect(grid().walls.size).toBe(0);
  });
});

describe("searchFrames", () => {
  it("finds a path on an open grid, for every algorithm", () => {
    for (const algo of PATH_ALGORITHMS) {
      const frame = last(grid(), algo.value);
      expect(frame.found, algo.value).toBe(true);
      expect(frame.path.length, algo.value).toBeGreaterThan(0);
    }
  });

  it("returns a path that starts at the start and ends at the goal", () => {
    const g = grid();
    const frame = last(g);
    expect(frame.path[0]).toEqual(g.start);
    expect(frame.path.at(-1)).toEqual(g.goal);
  });

  it("returns a path of adjacent cells only", () => {
    // A path that teleports is not a path.
    const frame = last(grid());
    for (let i = 1; i < frame.path.length; i += 1) {
      const a = frame.path[i - 1]!, b = frame.path[i]!;
      expect(Math.abs(a.row - b.row) + Math.abs(a.col - b.col)).toBe(1);
    }
  });

  it("never routes through a wall", () => {
    const g = grid();
    let walled = g;
    for (let r = 0; r < 6; r += 1) if (r !== 5) walled = toggleWall(walled, { row: r, col: 3 });
    const frame = last(walled);
    for (const cell of frame.path) {
      expect(walled.walls.has(`${cell.row},${cell.col}`)).toBe(false);
    }
  });

  it("reports no path when the goal is walled off", () => {
    let g = grid();
    // Seal the goal's corner completely.
    for (const cell of [{ row: 4, col: 7 }, { row: 5, col: 6 }]) g = toggleWall(g, cell);
    const frame = last(g);
    expect(frame.found).toBe(false);
    expect(frame.path).toEqual([]);
  });

  it("BFS returns a shortest path on an unweighted grid", () => {
    const g = makeGrid(5, 5);
    const frame = last(g, "bfs");
    // Manhattan distance is the shortest possible on a 4-neighbour grid.
    const manhattan = Math.abs(g.start.row - g.goal.row) + Math.abs(g.start.col - g.goal.col);
    expect(frame.path.length - 1).toBe(manhattan);
  });

  it("DFS finds a path but not necessarily the shortest one", () => {
    const g = makeGrid(6, 6);
    const bfs = last(g, "bfs").path.length;
    const dfs = last(g, "dfs").path.length;
    expect(dfs).toBeGreaterThanOrEqual(bfs);
  });

  it("visits every frame in order, never shrinking the visited set", () => {
    const frames = searchFrames(grid(), "bfs");
    for (let i = 1; i < frames.length; i += 1) {
      expect(frames[i]!.visited.length).toBeGreaterThanOrEqual(frames[i - 1]!.visited.length);
    }
  });

  it("points every frame at a real pseudocode line", () => {
    for (const algo of PATH_ALGORITHMS) {
      const lines = PATH_PSEUDOCODE[algo.value];
      for (const frame of searchFrames(grid(), algo.value)) {
        expect(frame.line, algo.value).toBeGreaterThanOrEqual(0);
        expect(frame.line, algo.value).toBeLessThan(lines.length);
      }
    }
  });

  it("gives the three algorithms listings that differ only where they truly differ", () => {
    // Two lines carry the whole distinction: which structure holds the
    // frontier, and how a cell is taken from it. Everything else is shared,
    // and if that ever stops being true the explanation has drifted.
    const DIFFER = new Set([0, 2]);
    const [bfs, dfs, astar] = PATH_ALGORITHMS.map((a) => PATH_PSEUDOCODE[a.value]);
    expect(bfs!.length).toBe(dfs!.length);
    expect(bfs!.length).toBe(astar!.length);
    for (let i = 0; i < bfs!.length; i += 1) {
      const distinct = new Set([bfs![i], dfs![i], astar![i]]).size;
      expect(distinct, `line ${i}`).toBe(DIFFER.has(i) ? 3 : 1);
    }
  });

  it("captions every frame", () => {
    for (const frame of searchFrames(grid(), "bfs")) {
      expect(frame.note.length).toBeGreaterThan(0);
    }
  });

  it("offers three algorithms, each explained", () => {
    expect(PATH_ALGORITHMS).toHaveLength(3);
    for (const a of PATH_ALGORITHMS) {
      expect(a.blurb.length, a.value).toBeGreaterThan(30);
      expect(a.guarantee.length, a.value).toBeGreaterThan(0);
    }
  });
});

describe("toggleWall", () => {
  it("adds and removes a wall", () => {
    const g = grid();
    const on = toggleWall(g, { row: 2, col: 2 });
    expect(on.walls.has("2,2")).toBe(true);
    expect(toggleWall(on, { row: 2, col: 2 }).walls.has("2,2")).toBe(false);
  });

  it("refuses to wall the start or the goal", () => {
    const g = grid();
    expect(toggleWall(g, g.start).walls.size).toBe(0);
    expect(toggleWall(g, g.goal).walls.size).toBe(0);
  });

  it("does not mutate the grid it is given", () => {
    const g = grid();
    toggleWall(g, { row: 1, col: 1 });
    expect(g.walls.size).toBe(0);
  });
});
