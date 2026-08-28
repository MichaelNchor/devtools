/**
 * Interview preparation as a reference, built around recognition rather than
 * recall. The premise the whole thing rests on: you do not memorise "how to
 * solve Two Sum", you learn to read "find a complement" and reach for a hash
 * map. Every entry therefore leads with the SIGNAL, not the solution.
 *
 * Snippets are C#, because that is the stack these are being prepared for.
 */

import type { Implementations } from "./languages";

export type Priority = 1 | 2 | 3;

export interface Pattern {
  name: string;
  /** The phrasing in a problem that should trigger this pattern. */
  signal: string;
  /** What the pattern actually does, in one line. */
  idea: string;
  time: string;
  space: string;
  /** The same idea in each language, short enough to hold in your head. */
  code: Implementations;
  /** Representative problems, not an exhaustive list. */
  problems: string[];
}

export const PATTERNS: Pattern[] = [
  {
    name: "Hash Map / Hash Set",
    signal: "\"Have I seen this before?\", \"find the complement\", \"count occurrences\", \"is there a duplicate\"",
    idea: "Trade memory for time: one pass storing what you have seen turns a nested scan into a lookup.",
    time: "O(n)", space: "O(n)",
    code: {
      csharp: `var seen = new Dictionary<int, int>();

for (int i = 0; i < nums.Length; i++)
{
    int complement = target - nums[i];

    if (seen.TryGetValue(complement, out int index))
        return new[] { index, i };

    seen[nums[i]] = i;
}`,
      typescript: `const seen = new Map<number, number>();

for (let i = 0; i < nums.length; i++) {
  const complement = target - nums[i];

  if (seen.has(complement)) return [seen.get(complement)!, i];

  seen.set(nums[i], i);
}`,
      python: `seen: dict[int, int] = {}

for i, n in enumerate(nums):
    complement = target - n

    if complement in seen:
        return [seen[complement], i]

    seen[n] = i`,
      java: `Map<Integer, Integer> seen = new HashMap<>();

for (int i = 0; i < nums.length; i++) {
    int complement = target - nums[i];

    if (seen.containsKey(complement))
        return new int[] { seen.get(complement), i };

    seen.put(nums[i], i);
}`
    },
    problems: ["Two Sum", "Contains Duplicate", "Group Anagrams", "Valid Anagram", "Longest Consecutive Sequence"],
  },
  {
    name: "Two Pointers",
    signal: "A SORTED array, \"find a pair\", \"in place\", \"reverse\", \"remove duplicates\", palindromes",
    idea: "Two indices moving toward or with each other, using the sort order to discard half the possibilities each step.",
    time: "O(n)", space: "O(1)",
    code: {
      csharp: `int left = 0, right = nums.Length - 1;

while (left < right)
{
    int sum = nums[left] + nums[right];

    if (sum == target) return new[] { left, right };
    if (sum < target) left++;      // need a bigger sum
    else right--;                  // need a smaller sum
}`,
      typescript: `let left = 0, right = nums.length - 1;

while (left < right) {
  const sum = nums[left] + nums[right];

  if (sum === target) return [left, right];
  if (sum < target) left++;      // need a bigger sum
  else right--;                  // need a smaller sum
}`,
      python: `left, right = 0, len(nums) - 1

while left < right:
    total = nums[left] + nums[right]

    if total == target:
        return [left, right]
    if total < target:
        left += 1      # need a bigger sum
    else:
        right -= 1     # need a smaller sum`,
      java: `int left = 0, right = nums.length - 1;

while (left < right) {
    int sum = nums[left] + nums[right];

    if (sum == target) return new int[] { left, right };
    if (sum < target) left++;      // need a bigger sum
    else right--;                  // need a smaller sum
}`
    },
    problems: ["Two Sum II", "Valid Palindrome", "3Sum", "Container With Most Water", "Remove Duplicates"],
  },
  {
    name: "Sliding Window",
    signal: "\"longest\", \"shortest\", \"maximum sum\" of a CONTIGUOUS subarray or substring",
    idea: "Grow the window from the right, shrink from the left when it breaks the rule. Every element enters and leaves once.",
    time: "O(n)", space: "O(k)",
    code: {
      csharp: `var window = new HashSet<char>();
int left = 0, best = 0;

for (int right = 0; right < s.Length; right++)
{
    while (window.Contains(s[right]))
        window.Remove(s[left++]);   // shrink until valid again

    window.Add(s[right]);
    best = Math.Max(best, right - left + 1);
}`,
      typescript: `const window = new Set<string>();
let left = 0, best = 0;

for (let right = 0; right < s.length; right++) {
  while (window.has(s[right])) window.delete(s[left++]);

  window.add(s[right]);
  best = Math.max(best, right - left + 1);
}`,
      python: `window: set[str] = set()
left = best = 0

for right, ch in enumerate(s):
    while ch in window:
        window.remove(s[left])
        left += 1

    window.add(ch)
    best = max(best, right - left + 1)`,
      java: `Set<Character> window = new HashSet<>();
int left = 0, best = 0;

for (int right = 0; right < s.length(); right++) {
    while (window.contains(s.charAt(right)))
        window.remove(s.charAt(left++));

    window.add(s.charAt(right));
    best = Math.max(best, right - left + 1);
}`
    },
    problems: ["Longest Substring Without Repeating Characters", "Minimum Window Substring", "Max Consecutive Ones III", "Permutation in String"],
  },
  {
    name: "Prefix Sum",
    signal: "Many range-sum queries, \"subarray sums to k\", \"sum between i and j\"",
    idea: "Precompute running totals so any range sum is one subtraction. Pair with a hash map to count subarrays.",
    time: "O(n)", space: "O(n)",
    code: {
      csharp: `var counts = new Dictionary<int, int> { [0] = 1 };
int running = 0, total = 0;

foreach (int n in nums)
{
    running += n;
    // How many earlier prefixes leave exactly k behind?
    if (counts.TryGetValue(running - k, out int c)) total += c;
    counts[running] = counts.GetValueOrDefault(running) + 1;
}`,
      typescript: `const counts = new Map<number, number>([[0, 1]]);
let running = 0, total = 0;

for (const n of nums) {
  running += n;
  // How many earlier prefixes leave exactly k behind?
  total += counts.get(running - k) ?? 0;
  counts.set(running, (counts.get(running) ?? 0) + 1);
}`,
      python: `from collections import defaultdict

counts = defaultdict(int, {0: 1})
running = total = 0

for n in nums:
    running += n
    # How many earlier prefixes leave exactly k behind?
    total += counts[running - k]
    counts[running] += 1`,
      java: `Map<Integer, Integer> counts = new HashMap<>();
counts.put(0, 1);
int running = 0, total = 0;

for (int n : nums) {
    running += n;
    // How many earlier prefixes leave exactly k behind?
    total += counts.getOrDefault(running - k, 0);
    counts.merge(running, 1, Integer::sum);
}`
    },
    problems: ["Subarray Sum Equals K", "Range Sum Query", "Product of Array Except Self", "Continuous Subarray Sum"],
  },
  {
    name: "Binary Search",
    signal: "Sorted input, OR \"minimise the maximum\", \"smallest value that works\" — search on the ANSWER",
    idea: "Halve the search space each step. The array need not be sorted if the predicate is monotonic.",
    time: "O(log n)", space: "O(1)",
    code: {
      csharp: `int lo = 0, hi = nums.Length - 1;

while (lo <= hi)
{
    int mid = lo + (hi - lo) / 2;   // avoids overflow

    if (nums[mid] == target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
}
return -1;`,
      typescript: `let lo = 0, hi = nums.length - 1;

while (lo <= hi) {
  const mid = lo + Math.floor((hi - lo) / 2);

  if (nums[mid] === target) return mid;
  if (nums[mid] < target) lo = mid + 1;
  else hi = mid - 1;
}
return -1;`,
      python: `lo, hi = 0, len(nums) - 1

while lo <= hi:
    mid = lo + (hi - lo) // 2

    if nums[mid] == target:
        return mid
    if nums[mid] < target:
        lo = mid + 1
    else:
        hi = mid - 1

return -1`,
      java: `int lo = 0, hi = nums.length - 1;

while (lo <= hi) {
    int mid = lo + (hi - lo) / 2;   // avoids overflow

    if (nums[mid] == target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
}
return -1;`
    },
    problems: ["Binary Search", "Search in Rotated Sorted Array", "Koko Eating Bananas", "Find Minimum in Rotated Array"],
  },
  {
    name: "Fast & Slow Pointers",
    signal: "Linked lists, \"cycle\", \"middle of the list\", \"nth from the end\"",
    idea: "One pointer moves twice as fast. If there is a loop they must meet; when the fast one ends the slow one is halfway.",
    time: "O(n)", space: "O(1)",
    code: {
      csharp: `var slow = head;
var fast = head;

while (fast?.next != null)
{
    slow = slow.next;
    fast = fast.next.next;
    if (slow == fast) return true;   // they met, so there is a cycle
}
return false;`,
      typescript: `let slow = head;
let fast = head;

while (fast?.next) {
  slow = slow!.next;
  fast = fast.next.next;
  if (slow === fast) return true;   // they met, so there is a cycle
}
return false;`,
      python: `slow = fast = head

while fast and fast.next:
    slow = slow.next
    fast = fast.next.next
    if slow is fast:
        return True     # they met, so there is a cycle

return False`,
      java: `Node slow = head, fast = head;

while (fast != null && fast.next != null) {
    slow = slow.next;
    fast = fast.next.next;
    if (slow == fast) return true;   // they met, so there is a cycle
}
return false;`
    },
    problems: ["Linked List Cycle", "Middle of the Linked List", "Find the Duplicate Number", "Happy Number"],
  },
  {
    name: "Stack / Monotonic Stack",
    signal: "\"Matching\" or \"balanced\" brackets, \"next greater element\", \"previous smaller\", undo behaviour",
    idea: "A stack remembers what is still unresolved. Keeping it sorted answers next-greater questions in one pass.",
    time: "O(n)", space: "O(n)",
    code: {
      csharp: `var stack = new Stack<int>();      // holds indices
var result = new int[nums.Length];
Array.Fill(result, -1);

for (int i = 0; i < nums.Length; i++)
{
    // Everything smaller has just found its next greater element.
    while (stack.Count > 0 && nums[stack.Peek()] < nums[i])
        result[stack.Pop()] = nums[i];

    stack.Push(i);
}`,
      typescript: `const stack: number[] = [];        // holds indices
const result = new Array(nums.length).fill(-1);

for (let i = 0; i < nums.length; i++) {
  // Everything smaller has just found its next greater element.
  while (stack.length && nums[stack[stack.length - 1]] < nums[i]) {
    result[stack.pop()!] = nums[i];
  }
  stack.push(i);
}`,
      python: `stack: list[int] = []          # holds indices
result = [-1] * len(nums)

for i, n in enumerate(nums):
    # Everything smaller has just found its next greater element.
    while stack and nums[stack[-1]] < n:
        result[stack.pop()] = n

    stack.append(i)`,
      java: `Deque<Integer> stack = new ArrayDeque<>();   // holds indices
int[] result = new int[nums.length];
Arrays.fill(result, -1);

for (int i = 0; i < nums.length; i++) {
    // Everything smaller has just found its next greater element.
    while (!stack.isEmpty() && nums[stack.peek()] < nums[i])
        result[stack.pop()] = nums[i];

    stack.push(i);
}`
    },
    problems: ["Valid Parentheses", "Daily Temperatures", "Next Greater Element", "Largest Rectangle in Histogram"],
  },
  {
    name: "Intervals",
    signal: "\"Merge\", \"overlap\", \"meeting rooms\", \"insert into a schedule\"",
    idea: "Sort by start, then sweep once. Two intervals overlap exactly when the next start is before the current end.",
    time: "O(n log n)", space: "O(n)",
    code: {
      csharp: `Array.Sort(intervals, (a, b) => a[0].CompareTo(b[0]));
var merged = new List<int[]>();

foreach (var next in intervals)
{
    if (merged.Count > 0 && next[0] <= merged[^1][1])
        merged[^1][1] = Math.Max(merged[^1][1], next[1]);   // overlap
    else
        merged.Add(next);
}`,
      typescript: `intervals.sort((a, b) => a[0] - b[0]);
const merged: number[][] = [];

for (const next of intervals) {
  const last = merged[merged.length - 1];

  if (last && next[0] <= last[1]) last[1] = Math.max(last[1], next[1]);
  else merged.push(next);
}`,
      python: `intervals.sort(key=lambda i: i[0])
merged: list[list[int]] = []

for nxt in intervals:
    if merged and nxt[0] <= merged[-1][1]:
        merged[-1][1] = max(merged[-1][1], nxt[1])   # overlap
    else:
        merged.append(nxt)`,
      java: `Arrays.sort(intervals, Comparator.comparingInt(a -> a[0]));
List<int[]> merged = new ArrayList<>();

for (int[] next : intervals) {
    int last = merged.size() - 1;

    if (last >= 0 && next[0] <= merged.get(last)[1])
        merged.get(last)[1] = Math.max(merged.get(last)[1], next[1]);
    else
        merged.add(next);
}`
    },
    problems: ["Merge Intervals", "Insert Interval", "Non-overlapping Intervals", "Meeting Rooms II"],
  },
  {
    name: "BFS",
    signal: "\"Shortest path\", \"fewest steps\", \"level by level\", \"nearest\"",
    idea: "A queue explores in rings of equal distance, so the first time you arrive is by a shortest route.",
    time: "O(V + E)", space: "O(V)",
    code: {
      csharp: `var queue = new Queue<Node>();
var seen = new HashSet<Node>();

queue.Enqueue(start);
seen.Add(start);

while (queue.Count > 0)
{
    int levelSize = queue.Count;        // one whole level at a time

    for (int i = 0; i < levelSize; i++)
    {
        var node = queue.Dequeue();
        foreach (var next in node.Neighbours)
            if (seen.Add(next)) queue.Enqueue(next);
    }
    depth++;
}`,
      typescript: `const queue: Node[] = [start];
const seen = new Set<Node>([start]);
let depth = 0;

while (queue.length) {
  const levelSize = queue.length;      // one whole level at a time

  for (let i = 0; i < levelSize; i++) {
    const node = queue.shift()!;
    for (const next of node.neighbours) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  depth++;
}`,
      python: `from collections import deque

queue = deque([start])
seen = {start}
depth = 0

while queue:
    for _ in range(len(queue)):       # one whole level at a time
        node = queue.popleft()

        for nxt in node.neighbours:
            if nxt in seen:
                continue
            seen.add(nxt)
            queue.append(nxt)

    depth += 1`,
      java: `Queue<Node> queue = new ArrayDeque<>();
Set<Node> seen = new HashSet<>();
queue.add(start);
seen.add(start);
int depth = 0;

while (!queue.isEmpty()) {
    int levelSize = queue.size();     // one whole level at a time

    for (int i = 0; i < levelSize; i++) {
        Node node = queue.poll();
        for (Node next : node.neighbours)
            if (seen.add(next)) queue.add(next);
    }
    depth++;
}`
    },
    problems: ["Binary Tree Level Order Traversal", "Rotting Oranges", "Word Ladder", "Number of Islands"],
  },
  {
    name: "DFS",
    signal: "\"All paths\", \"connected components\", \"does a path exist\", tree recursion",
    idea: "Go as deep as possible before backtracking. Natural recursion, and cheap on memory compared to BFS.",
    time: "O(V + E)", space: "O(h)",
    code: {
      csharp: `void Dfs(Node node, HashSet<Node> seen)
{
    if (node == null || !seen.Add(node)) return;

    foreach (var next in node.Neighbours)
        Dfs(next, seen);
}`,
      typescript: `function dfs(node: Node | null, seen: Set<Node>): void {
  if (!node || seen.has(node)) return;
  seen.add(node);

  for (const next of node.neighbours) dfs(next, seen);
}`,
      python: `def dfs(node, seen: set) -> None:
    if node is None or node in seen:
        return
    seen.add(node)

    for nxt in node.neighbours:
        dfs(nxt, seen)`,
      java: `void dfs(Node node, Set<Node> seen) {
    if (node == null || !seen.add(node)) return;

    for (Node next : node.neighbours)
        dfs(next, seen);
}`
    },
    problems: ["Number of Islands", "Max Area of Island", "Path Sum", "Clone Graph", "Course Schedule"],
  },
  {
    name: "Heap / Top K",
    signal: "\"Top k\", \"kth largest\", \"median\", \"most frequent\", merging sorted streams",
    idea: "Keep a heap of size k rather than sorting everything: O(n log k) instead of O(n log n).",
    time: "O(n log k)", space: "O(k)",
    code: {
      csharp: `// PriorityQueue dequeues the LOWEST priority first, so a min-heap of
// size k leaves the k largest behind.
var heap = new PriorityQueue<int, int>();

foreach (int n in nums)
{
    heap.Enqueue(n, n);
    if (heap.Count > k) heap.Dequeue();
}
return heap.Peek();   // the kth largest`,
      typescript: `// No built-in heap, so a library one — or sort when n is small.
const heap = new MinHeap<number>();

for (const n of nums) {
  heap.push(n);
  if (heap.size > k) heap.pop();   // keep only the k largest
}
return heap.peek();                // the kth largest`,
      python: `import heapq

heap: list[int] = []

for n in nums:
    heapq.heappush(heap, n)
    if len(heap) > k:
        heapq.heappop(heap)      # keep only the k largest

return heap[0]                   # the kth largest`,
      java: `// A min-heap of size k leaves the k largest behind.
PriorityQueue<Integer> heap = new PriorityQueue<>();

for (int n : nums) {
    heap.add(n);
    if (heap.size() > k) heap.poll();
}
return heap.peek();   // the kth largest`
    },
    problems: ["Kth Largest Element", "Top K Frequent Elements", "Find Median from Data Stream", "Merge k Sorted Lists"],
  },
  {
    name: "Backtracking",
    signal: "\"All combinations\", \"all permutations\", \"generate every valid\", sudoku and n-queens",
    idea: "Build a candidate one choice at a time, and undo the choice when the branch fails. Choose, explore, un-choose.",
    time: "O(2^n) or O(n!)", space: "O(n)",
    code: {
      csharp: `void Explore(int start, List<int> current)
{
    results.Add(new List<int>(current));   // every prefix is an answer

    for (int i = start; i < nums.Length; i++)
    {
        current.Add(nums[i]);              // choose
        Explore(i + 1, current);           // explore
        current.RemoveAt(current.Count - 1); // un-choose
    }
}`,
      typescript: `function explore(start: number, current: number[]): void {
  results.push([...current]);          // every prefix is an answer

  for (let i = start; i < nums.length; i++) {
    current.push(nums[i]);             // choose
    explore(i + 1, current);           // explore
    current.pop();                     // un-choose
  }
}`,
      python: `def explore(start: int, current: list[int]) -> None:
    results.append(current[:])         # every prefix is an answer

    for i in range(start, len(nums)):
        current.append(nums[i])        # choose
        explore(i + 1, current)        # explore
        current.pop()                  # un-choose`,
      java: `void explore(int start, List<Integer> current) {
    results.add(new ArrayList<>(current));   // every prefix is an answer

    for (int i = start; i < nums.length; i++) {
        current.add(nums[i]);                // choose
        explore(i + 1, current);             // explore
        current.remove(current.size() - 1);  // un-choose
    }
}`
    },
    problems: ["Subsets", "Permutations", "Combination Sum", "Word Search", "N-Queens"],
  },
  {
    name: "Greedy",
    signal: "\"Maximum/minimum\" with an obvious local best, scheduling, \"can you reach\"",
    idea: "Take the best option available now and never reconsider. Only correct when a local choice cannot rule out the global optimum.",
    time: "O(n log n)", space: "O(1)",
    code: {
      csharp: `int furthest = 0;

for (int i = 0; i < nums.Length; i++)
{
    if (i > furthest) return false;                 // stranded
    furthest = Math.Max(furthest, i + nums[i]);
}
return true;`,
      typescript: `let furthest = 0;

for (let i = 0; i < nums.length; i++) {
  if (i > furthest) return false;               // stranded
  furthest = Math.max(furthest, i + nums[i]);
}
return true;`,
      python: `furthest = 0

for i, n in enumerate(nums):
    if i > furthest:
        return False           # stranded
    furthest = max(furthest, i + n)

return True`,
      java: `int furthest = 0;

for (int i = 0; i < nums.length; i++) {
    if (i > furthest) return false;               // stranded
    furthest = Math.max(furthest, i + nums[i]);
}
return true;`
    },
    problems: ["Jump Game", "Gas Station", "Partition Labels", "Task Scheduler"],
  },
  {
    name: "Dynamic Programming",
    signal: "\"How many ways\", \"minimum cost\", \"can it be made\" — plus overlapping subproblems",
    idea: "Solve each subproblem once and reuse it. Find the recurrence first; the table is just bookkeeping.",
    time: "O(n·m)", space: "O(n) after rolling",
    code: {
      csharp: `// dp[i] = the answer using the first i items.
var dp = new int[amount + 1];
Array.Fill(dp, amount + 1);
dp[0] = 0;

foreach (int coin in coins)
    for (int i = coin; i <= amount; i++)
        dp[i] = Math.Min(dp[i], dp[i - coin] + 1);

return dp[amount] > amount ? -1 : dp[amount];`,
      typescript: `// dp[i] = the answer using the first i items.
const dp = new Array(amount + 1).fill(amount + 1);
dp[0] = 0;

for (const coin of coins) {
  for (let i = coin; i <= amount; i++) {
    dp[i] = Math.min(dp[i], dp[i - coin] + 1);
  }
}
return dp[amount] > amount ? -1 : dp[amount];`,
      python: `# dp[i] = the answer using the first i items.
dp = [amount + 1] * (amount + 1)
dp[0] = 0

for coin in coins:
    for i in range(coin, amount + 1):
        dp[i] = min(dp[i], dp[i - coin] + 1)

return -1 if dp[amount] > amount else dp[amount]`,
      java: `// dp[i] = the answer using the first i items.
int[] dp = new int[amount + 1];
Arrays.fill(dp, amount + 1);
dp[0] = 0;

for (int coin : coins)
    for (int i = coin; i <= amount; i++)
        dp[i] = Math.min(dp[i], dp[i - coin] + 1);

return dp[amount] > amount ? -1 : dp[amount];`
    },
    problems: ["Climbing Stairs", "Coin Change", "House Robber", "Longest Common Subsequence", "Word Break"],
  },
  {
    name: "Topological Sort",
    signal: "\"Prerequisites\", \"build order\", \"is there a cycle\" in a DIRECTED graph",
    idea: "Repeatedly take a node with no remaining dependencies. If any are left over, the graph has a cycle.",
    time: "O(V + E)", space: "O(V)",
    code: {
      csharp: `var queue = new Queue<int>();

for (int i = 0; i < n; i++)
    if (inDegree[i] == 0) queue.Enqueue(i);

int visited = 0;
while (queue.Count > 0)
{
    int node = queue.Dequeue();
    visited++;

    foreach (int next in adjacency[node])
        if (--inDegree[next] == 0) queue.Enqueue(next);
}
return visited == n;   // false means a cycle`,
      typescript: `const queue: number[] = [];

for (let i = 0; i < n; i++) if (inDegree[i] === 0) queue.push(i);

let visited = 0;
while (queue.length) {
  const node = queue.shift()!;
  visited++;

  for (const next of adjacency[node]) {
    if (--inDegree[next] === 0) queue.push(next);
  }
}
return visited === n;   // false means a cycle`,
      python: `from collections import deque

queue = deque(i for i in range(n) if in_degree[i] == 0)
visited = 0

while queue:
    node = queue.popleft()
    visited += 1

    for nxt in adjacency[node]:
        in_degree[nxt] -= 1
        if in_degree[nxt] == 0:
            queue.append(nxt)

return visited == n     # False means a cycle`,
      java: `Queue<Integer> queue = new ArrayDeque<>();

for (int i = 0; i < n; i++)
    if (inDegree[i] == 0) queue.add(i);

int visited = 0;
while (!queue.isEmpty()) {
    int node = queue.poll();
    visited++;

    for (int next : adjacency[node])
        if (--inDegree[next] == 0) queue.add(next);
}
return visited == n;   // false means a cycle`
    },
    problems: ["Course Schedule", "Course Schedule II", "Alien Dictionary", "Minimum Height Trees"],
  },
];

export interface Topic {
  name: string;
  priority: Priority;
  /** Where it sits in a sensible learning order, 1-based. */
  order: number | null;
  /** Problems worth doing before moving on. */
  target: number | null;
  note: string;
}

export const TOPICS: Topic[] = [
  { name: "Big-O", priority: 1, order: 1, target: null, note: "Do this first. Every later decision is justified in these terms." },
  { name: "Arrays & Strings", priority: 1, order: 2, target: 15, note: "Traversal, in-place manipulation, frequency counting." },
  { name: "Hash Maps / Sets", priority: 1, order: 3, target: null, note: "Dictionary and HashSet. The single highest-yield structure in interviews." },
  { name: "Two Pointers", priority: 1, order: 4, target: 10, note: "Sorted arrays, pairs, in-place work." },
  { name: "Sliding Window", priority: 1, order: 5, target: 10, note: "Contiguous subarrays and substrings; longest and shortest windows." },
  { name: "Stack / Queue", priority: 1, order: 6, target: 10, note: "Parentheses, monotonic stack, next greater element, BFS queues." },
  { name: "Linked Lists", priority: 1, order: 7, target: 10, note: "Reverse, fast and slow pointers, cycle detection." },
  { name: "Binary Search", priority: 1, order: 8, target: 10, note: "The classic search, and searching on the answer." },
  { name: "Trees", priority: 1, order: 9, target: 15, note: "DFS, BFS, recursion, BST properties." },
  { name: "Heap / Priority Queue", priority: 1, order: 10, target: 10, note: "Top k, kth largest, scheduling." },
  { name: "Graphs", priority: 1, order: 11, target: 15, note: "BFS, DFS, visited sets. Most grid problems are graph problems." },
  { name: "Recursion / Backtracking", priority: 1, order: 12, target: 10, note: "Base cases and recursive state; choose, explore, un-choose." },
  { name: "Greedy", priority: 2, order: 13, target: null, note: "Know when a local choice is provably safe — and when it is not." },
  { name: "Dynamic Programming", priority: 2, order: 14, target: 15, note: "Last, because it is easier once recursion is comfortable." },
  { name: "Sorting", priority: 1, order: null, target: null, note: "Merge sort, quicksort, and the complexity of each." },
  { name: "Intervals", priority: 2, order: null, target: null, note: "Sort by start and sweep." },
  { name: "Prefix Sums", priority: 2, order: null, target: null, note: "Range queries and subarray counting." },
  { name: "Topological Sort", priority: 2, order: null, target: null, note: "Dependency ordering and cycle detection." },
  { name: "Union-Find", priority: 2, order: null, target: null, note: "Connectivity and grouping without repeated traversal." },
  { name: "Trie", priority: 2, order: null, target: null, note: "Prefix lookups and autocomplete." },
  { name: "Bit Manipulation", priority: 2, order: null, target: null, note: "XOR tricks, masks, single-number problems." },
  { name: "Dijkstra / Bellman-Ford", priority: 3, order: null, target: null, note: "Weighted shortest paths. Rare below senior interviews." },
  { name: "Segment / Fenwick Trees", priority: 3, order: null, target: null, note: "Range updates. Almost never asked outside competitive programming." },
  { name: "Advanced DP", priority: 3, order: null, target: null, note: "Bitmask and tree DP. Learn after the standard forms are automatic." },
];

export interface PrepSlice {
  area: string;
  share: number;
  note: string;
}

/** For a mid-level backend role. Big-tech shifts DSA up to 40–50%. */
export const PREP_SPLIT: PrepSlice[] = [
  { area: "DSA", share: 30, note: "Pattern recognition, not memorised solutions." },
  { area: "System design", share: 20, note: "APIs, caching, messaging, data modelling." },
  { area: "C# / .NET", share: 20, note: "The language and runtime you will actually be judged on." },
  { area: "Backend fundamentals", share: 15, note: "Concurrency, HTTP, auth, observability." },
  { area: "Behavioural", share: 10, note: "Concrete stories with outcomes." },
  { area: "SQL / databases", share: 5, note: "Joins, indexes, transactions." },
];

export const PRIORITY_LABELS: Record<Priority, string> = {
  1: "Must know",
  2: "Very useful",
  3: "Learn later",
};

/** Total problems worth doing, from the per-topic targets. */
export function totalTarget(): number {
  return TOPICS.reduce((sum, topic) => sum + (topic.target ?? 0), 0);
}

/** The learning order, as an ordered list. */
export function learningOrder(): Topic[] {
  return TOPICS.filter((t) => t.order !== null).sort((a, b) => a.order! - b.order!);
}
