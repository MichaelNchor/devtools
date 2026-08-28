import type { Implementations } from "./languages";
import type { PathAlgorithm } from "./pathfinding";

/**
 * The three are deliberately near-identical, exactly as the pseudocode is:
 * only the structure holding the frontier and the line that takes from it
 * change. Reading them side by side is the point.
 */
export const PATH_CODE: Record<PathAlgorithm, Implementations> = {
  bfs: {
    csharp: `// Queue: oldest out first, so cells are visited in rings of equal
// distance — the first arrival at the goal is by a shortest route.
var frontier = new Queue<Cell>();
var cameFrom = new Dictionary<Cell, Cell>();
var seen = new HashSet<Cell> { start };

frontier.Enqueue(start);

while (frontier.Count > 0)
{
    var cell = frontier.Dequeue();
    if (cell == goal) return Reconstruct(cameFrom, goal);

    foreach (var next in Neighbours(cell))
        if (seen.Add(next))
        {
            cameFrom[next] = cell;
            frontier.Enqueue(next);
        }
}
return null;   // no path`,
    typescript: `// Queue: oldest out first, so cells are visited in rings of equal
// distance — the first arrival at the goal is by a shortest route.
const frontier: Cell[] = [start];
const cameFrom = new Map<string, Cell>();
const seen = new Set<string>([key(start)]);

while (frontier.length > 0) {
  const cell = frontier.shift()!;
  if (same(cell, goal)) return reconstruct(cameFrom, goal);

  for (const next of neighbours(cell)) {
    if (seen.has(key(next))) continue;
    seen.add(key(next));
    cameFrom.set(key(next), cell);
    frontier.push(next);
  }
}
return null;   // no path`,
    python: `# Queue: oldest out first, so cells are visited in rings of equal
# distance - the first arrival at the goal is by a shortest route.
from collections import deque

frontier = deque([start])
came_from = {}
seen = {start}

while frontier:
    cell = frontier.popleft()
    if cell == goal:
        return reconstruct(came_from, goal)

    for nxt in neighbours(cell):
        if nxt in seen:
            continue
        seen.add(nxt)
        came_from[nxt] = cell
        frontier.append(nxt)

return None   # no path`,
    java: `// Queue: oldest out first, so cells are visited in rings of equal
// distance — the first arrival at the goal is by a shortest route.
Deque<Cell> frontier = new ArrayDeque<>();
Map<Cell, Cell> cameFrom = new HashMap<>();
Set<Cell> seen = new HashSet<>();

frontier.add(start);
seen.add(start);

while (!frontier.isEmpty()) {
    Cell cell = frontier.poll();
    if (cell.equals(goal)) return reconstruct(cameFrom, goal);

    for (Cell next : neighbours(cell))
        if (seen.add(next)) {
            cameFrom.put(next, cell);
            frontier.add(next);
        }
}
return null;   // no path`,
  },

  dfs: {
    csharp: `// Stack: newest out first, so it drives down one branch before
// backtracking. Cheap on memory, and no shortest-path guarantee.
var frontier = new Stack<Cell>();
var cameFrom = new Dictionary<Cell, Cell>();
var seen = new HashSet<Cell> { start };

frontier.Push(start);

while (frontier.Count > 0)
{
    var cell = frontier.Pop();
    if (cell == goal) return Reconstruct(cameFrom, goal);

    foreach (var next in Neighbours(cell))
        if (seen.Add(next))
        {
            cameFrom[next] = cell;
            frontier.Push(next);
        }
}
return null;   // no path`,
    typescript: `// Stack: newest out first, so it drives down one branch before
// backtracking. Cheap on memory, and no shortest-path guarantee.
const frontier: Cell[] = [start];
const cameFrom = new Map<string, Cell>();
const seen = new Set<string>([key(start)]);

while (frontier.length > 0) {
  const cell = frontier.pop()!;
  if (same(cell, goal)) return reconstruct(cameFrom, goal);

  for (const next of neighbours(cell)) {
    if (seen.has(key(next))) continue;
    seen.add(key(next));
    cameFrom.set(key(next), cell);
    frontier.push(next);
  }
}
return null;   // no path`,
    python: `# Stack: newest out first, so it drives down one branch before
# backtracking. Cheap on memory, and no shortest-path guarantee.
frontier = [start]
came_from = {}
seen = {start}

while frontier:
    cell = frontier.pop()
    if cell == goal:
        return reconstruct(came_from, goal)

    for nxt in neighbours(cell):
        if nxt in seen:
            continue
        seen.add(nxt)
        came_from[nxt] = cell
        frontier.append(nxt)

return None   # no path`,
    java: `// Stack: newest out first, so it drives down one branch before
// backtracking. Cheap on memory, and no shortest-path guarantee.
Deque<Cell> frontier = new ArrayDeque<>();
Map<Cell, Cell> cameFrom = new HashMap<>();
Set<Cell> seen = new HashSet<>();

frontier.push(start);
seen.add(start);

while (!frontier.isEmpty()) {
    Cell cell = frontier.pop();
    if (cell.equals(goal)) return reconstruct(cameFrom, goal);

    for (Cell next : neighbours(cell))
        if (seen.add(next)) {
            cameFrom.put(next, cell);
            frontier.push(next);
        }
}
return null;   // no path`,
  },

  astar: {
    csharp: `// Priority queue ordered by g + h. Because h never overshoots the
// true remaining distance, the shortest-path guarantee survives while
// far fewer cells are explored.
var frontier = new PriorityQueue<Cell, int>();
var cost = new Dictionary<Cell, int> { [start] = 0 };
var cameFrom = new Dictionary<Cell, Cell>();

frontier.Enqueue(start, Heuristic(start, goal));

while (frontier.Count > 0)
{
    var cell = frontier.Dequeue();
    if (cell == goal) return Reconstruct(cameFrom, goal);

    foreach (var next in Neighbours(cell))
    {
        int stepCost = cost[cell] + 1;

        if (!cost.TryGetValue(next, out int known) || stepCost < known)
        {
            cost[next] = stepCost;
            cameFrom[next] = cell;
            frontier.Enqueue(next, stepCost + Heuristic(next, goal));
        }
    }
}
return null;   // no path

// Manhattan distance: admissible on a four-connected grid.
int Heuristic(Cell a, Cell b) =>
    Math.Abs(a.Row - b.Row) + Math.Abs(a.Col - b.Col);`,
    typescript: `// Ordered by g + h. Because h never overshoots the true remaining
// distance, the shortest-path guarantee survives while far fewer
// cells are explored.
const cost = new Map<string, number>([[key(start), 0]]);
const cameFrom = new Map<string, Cell>();
const frontier: Cell[] = [start];

const heuristic = (a: Cell, b: Cell) =>
  Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

while (frontier.length > 0) {
  // A real implementation uses a binary heap rather than a scan.
  let best = 0;
  for (let i = 1; i < frontier.length; i++) {
    const f = (c: Cell) => (cost.get(key(c)) ?? 0) + heuristic(c, goal);
    if (f(frontier[i]) < f(frontier[best])) best = i;
  }

  const cell = frontier.splice(best, 1)[0];
  if (same(cell, goal)) return reconstruct(cameFrom, goal);

  for (const next of neighbours(cell)) {
    const stepCost = (cost.get(key(cell)) ?? 0) + 1;
    const known = cost.get(key(next));

    if (known === undefined || stepCost < known) {
      cost.set(key(next), stepCost);
      cameFrom.set(key(next), cell);
      frontier.push(next);
    }
  }
}
return null;   // no path`,
    python: `# Ordered by g + h. Because h never overshoots the true remaining
# distance, the shortest-path guarantee survives while far fewer
# cells are explored.
import heapq

def heuristic(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])

frontier = [(heuristic(start, goal), start)]
cost = {start: 0}
came_from = {}

while frontier:
    _, cell = heapq.heappop(frontier)
    if cell == goal:
        return reconstruct(came_from, goal)

    for nxt in neighbours(cell):
        step = cost[cell] + 1

        if nxt not in cost or step < cost[nxt]:
            cost[nxt] = step
            came_from[nxt] = cell
            heapq.heappush(frontier, (step + heuristic(nxt, goal), nxt))

return None   # no path`,
    java: `// Ordered by g + h. Because h never overshoots the true remaining
// distance, the shortest-path guarantee survives while far fewer
// cells are explored.
Map<Cell, Integer> cost = new HashMap<>();
Map<Cell, Cell> cameFrom = new HashMap<>();
PriorityQueue<Cell> frontier =
    new PriorityQueue<>(Comparator.comparingInt(
        c -> cost.getOrDefault(c, 0) + heuristic(c, goal)));

cost.put(start, 0);
frontier.add(start);

while (!frontier.isEmpty()) {
    Cell cell = frontier.poll();
    if (cell.equals(goal)) return reconstruct(cameFrom, goal);

    for (Cell next : neighbours(cell)) {
        int step = cost.get(cell) + 1;

        if (!cost.containsKey(next) || step < cost.get(next)) {
            cost.put(next, step);
            cameFrom.put(next, cell);
            frontier.add(next);
        }
    }
}
return null;   // no path

// Manhattan distance: admissible on a four-connected grid.
static int heuristic(Cell a, Cell b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}`,
  },
};
