export type SortAlgorithm = "bubble" | "insertion" | "selection" | "merge" | "quick";

export interface SortAlgorithmInfo {
  value: SortAlgorithm;
  label: string;
  best: string;
  average: string;
  worst: string;
  space: string;
  stable: boolean;
  blurb: string;
}

export const SORT_ALGORITHMS: SortAlgorithmInfo[] = [
  {
    value: "bubble", label: "Bubble sort",
    best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: true,
    blurb: "Repeatedly walks the list swapping neighbours that are out of order. Easy to reason about, and too slow for anything real — but its best case is linear, because a pass with no swaps means the list is already sorted.",
  },
  {
    value: "insertion", label: "Insertion sort",
    best: "O(n)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: true,
    blurb: "Grows a sorted prefix one element at a time, sliding each new value back into place. Genuinely useful on small or nearly-sorted inputs, which is why real sorts fall back to it below a threshold.",
  },
  {
    value: "selection", label: "Selection sort",
    best: "O(n²)", average: "O(n²)", worst: "O(n²)", space: "O(1)", stable: false,
    blurb: "Finds the smallest remaining element and puts it next. Always does the same work regardless of input, and makes at most n swaps — which matters when writing is far more expensive than reading.",
  },
  {
    value: "merge", label: "Merge sort",
    best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)", space: "O(n)", stable: true,
    blurb: "Splits the list in half, sorts each half, then merges them. The only guarantee here that never degrades — the cost is the extra array it needs to merge into.",
  },
  {
    value: "quick", label: "Quicksort",
    best: "O(n log n)", average: "O(n log n)", worst: "O(n²)", space: "O(log n)", stable: false,
    blurb: "Partitions around a pivot, then recurses on each side. Usually the fastest in practice, but a bad pivot on adversarial input degrades it to quadratic — which is why real implementations randomise or switch strategy.",
  },
];

/**
 * The listing shown beside the animation. Frames carry an index into these,
 * so the highlighted line is produced by the same code that does the sorting
 * — it cannot drift out of step with what the bars are doing.
 */
export const PSEUDOCODE: Record<SortAlgorithm, string[]> = {
  bubble: [
    "for end ← n−1 down to 1",
    "  swapped ← false",
    "  for i ← 0 to end−1",
    "    if a[i] > a[i+1]",
    "      swap a[i], a[i+1];  swapped ← true",
    "  if not swapped: stop        ▸ already sorted",
  ],
  insertion: [
    "for i ← 1 to n−1",
    "  value ← a[i];  j ← i−1",
    "  while j ≥ 0 and a[j] > value",
    "    a[j+1] ← a[j];  j ← j−1",
    "  a[j+1] ← value              ▸ value is home",
  ],
  selection: [
    "for i ← 0 to n−2",
    "  min ← i",
    "  for j ← i+1 to n−1",
    "    if a[j] < a[min]:  min ← j",
    "  swap a[i], a[min]           ▸ index i is final",
  ],
  merge: [
    "sort(lo, hi):",
    "  if lo ≥ hi: return          ▸ one element is sorted",
    "  mid ← (lo + hi) / 2",
    "  sort(lo, mid);  sort(mid+1, hi)",
    "  merge the two halves:",
    "    repeatedly take the smaller front element",
    "    then copy whatever remains",
  ],
  quick: [
    "sort(lo, hi):",
    "  if lo ≥ hi: return",
    "  pivot ← a[hi];  i ← lo",
    "  for j ← lo to hi−1",
    "    if a[j] < pivot:  swap a[i], a[j];  i ← i+1",
    "  swap a[i], a[hi]            ▸ pivot is now final",
    "  sort(lo, i−1);  sort(i+1, hi)",
  ],
};

export interface SortFrame {
  array: number[];
  /** Indices being read this step. */
  comparing: number[];
  /** Indices being written this step. */
  swapping: number[];
  /** Indices known to be in their final position. */
  sorted: number[];
  comparisons: number;
  swaps: number;
  /** Plain-language caption for this step. */
  note: string;
  /** Index into PSEUDOCODE[algorithm] — the line being executed. */
  line: number;
}

/**
 * A large array would otherwise produce hundreds of thousands of frames, which
 * is both unwatchable and enough to stall the tab. Past the cap we stop
 * recording but keep sorting, so the final frame is still the true result.
 */
export const MAX_FRAMES = 4000;

class Recorder {
  frames: SortFrame[] = [];
  comparisons = 0;
  swaps = 0;
  private truncated = false;
  /** Held so the closing frame highlights where the algorithm ended. */
  lastLine = 0;

  constructor(private readonly array: number[]) {}

  push(line: number, note: string, comparing: number[] = [], swapping: number[] = [], sorted: number[] = []) {
    // Minus one: finish() always appends a closing frame, so the reserved
    // slot is what makes MAX_FRAMES a real ceiling rather than a near miss.
    this.lastLine = line;
    if (this.frames.length >= MAX_FRAMES - 1) { this.truncated = true; return; }
    this.frames.push({
      array: [...this.array],
      comparing, swapping, sorted,
      comparisons: this.comparisons, swaps: this.swaps, note, line,
    });
  }

  /** The closing frame always shows the finished array, cap or no cap. */
  finish() {
    this.frames.push({
      array: [...this.array],
      comparing: [], swapping: [],
      sorted: this.array.map((_, i) => i),
      comparisons: this.comparisons, swaps: this.swaps,
      line: this.lastLine,
      note: this.truncated
        ? `Sorted. Earlier steps were not all recorded — ${MAX_FRAMES} frames is the display limit.`
        : `Sorted in ${this.comparisons} comparisons and ${this.swaps} swaps.`,
    });
    return this.frames;
  }
}

function bubble(a: number[], rec: Recorder) {
  for (let end = a.length - 1; end > 0; end -= 1) {
    let swappedThisPass = false;
    for (let i = 0; i < end; i += 1) {
      rec.comparisons += 1;
      rec.push(3, `Compare ${a[i]} and ${a[i + 1]}.`, [i, i + 1], [],
        Array.from({ length: a.length - 1 - end }, (_, k) => a.length - 1 - k));
      if (a[i]! > a[i + 1]!) {
        [a[i], a[i + 1]] = [a[i + 1]!, a[i]!];
        rec.swaps += 1;
        swappedThisPass = true;
        rec.push(4, `${a[i + 1]} was larger, so they swap.`, [], [i, i + 1]);
      }
    }
    // A clean pass means everything below is already ordered.
    if (!swappedThisPass) return;
  }
}

function insertion(a: number[], rec: Recorder) {
  for (let i = 1; i < a.length; i += 1) {
    const value = a[i]!;
    let j = i - 1;
    rec.push(1, `Take ${value} and slide it back into the sorted prefix.`, [i], [],
      Array.from({ length: i }, (_, k) => k));
    while (j >= 0 && a[j]! > value) {
      rec.comparisons += 1;
      a[j + 1] = a[j]!;
      rec.swaps += 1;
      rec.push(3, `${a[j]} is larger than ${value}, so it shifts right.`, [j], [j + 1]);
      j -= 1;
    }
    if (j >= 0) rec.comparisons += 1;
    a[j + 1] = value;
    rec.push(4, `${value} lands at index ${j + 1}.`, [], [j + 1]);
  }
}

function selection(a: number[], rec: Recorder) {
  for (let i = 0; i < a.length - 1; i += 1) {
    let min = i;
    const done = Array.from({ length: i }, (_, k) => k);
    for (let j = i + 1; j < a.length; j += 1) {
      rec.comparisons += 1;
      rec.push(3, `Is ${a[j]} smaller than the smallest so far, ${a[min]}?`, [j, min], [], done);
      if (a[j]! < a[min]!) min = j;
    }
    if (min !== i) {
      [a[i], a[min]] = [a[min]!, a[i]!];
      rec.swaps += 1;
      rec.push(4, `Swap the smallest remaining value into index ${i}.`, [], [i, min], done);
    }
  }
}

function mergeSort(a: number[], rec: Recorder, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return;
  const mid = Math.floor((lo + hi) / 2);
  mergeSort(a, rec, lo, mid);
  mergeSort(a, rec, mid + 1, hi);

  const left = a.slice(lo, mid + 1);
  const right = a.slice(mid + 1, hi + 1);
  rec.push(4, `Merge the halves [${left}] and [${right}].`,
    Array.from({ length: hi - lo + 1 }, (_, k) => lo + k));

  let i = 0, j = 0, k = lo;
  while (i < left.length && j < right.length) {
    rec.comparisons += 1;
    if (left[i]! <= right[j]!) { a[k] = left[i]!; i += 1; }
    else { a[k] = right[j]!; j += 1; }
    rec.swaps += 1;
    rec.push(5, `Take ${a[k]} into position ${k}.`, [], [k]);
    k += 1;
  }
  while (i < left.length) { a[k] = left[i]!; rec.swaps += 1; rec.push(6, `Copy ${a[k]} across.`, [], [k]); i += 1; k += 1; }
  while (j < right.length) { a[k] = right[j]!; rec.swaps += 1; rec.push(6, `Copy ${a[k]} across.`, [], [k]); j += 1; k += 1; }
}

function quickSort(a: number[], rec: Recorder, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return;
  const pivot = a[hi]!;
  rec.push(2, `Partition around the pivot ${pivot}.`, [hi]);
  let i = lo;
  for (let j = lo; j < hi; j += 1) {
    rec.comparisons += 1;
    rec.push(3, `Is ${a[j]} below the pivot ${pivot}?`, [j, hi]);
    if (a[j]! < pivot) {
      if (i !== j) {
        [a[i], a[j]] = [a[j]!, a[i]!];
        rec.swaps += 1;
        rec.push(4, `Yes — move it into the low side.`, [], [i, j]);
      }
      i += 1;
    }
  }
  [a[i], a[hi]] = [a[hi]!, a[i]!];
  rec.swaps += 1;
  rec.push(5, `The pivot settles at index ${i}, and is now final.`, [], [i], [i]);
  quickSort(a, rec, lo, i - 1);
  quickSort(a, rec, i + 1, hi);
}

/**
 * Records every step of a sort as replayable frames. Pure: the caller's array
 * is copied, never mutated, so the same input always gives the same frames.
 */
export function sortFrames(input: number[], algorithm: SortAlgorithm): SortFrame[] {
  const a = [...input];
  const rec = new Recorder(a);
  rec.push(0, "Starting array.");

  switch (algorithm) {
    case "bubble": bubble(a, rec); break;
    case "insertion": insertion(a, rec); break;
    case "selection": selection(a, rec); break;
    case "merge": mergeSort(a, rec); break;
    case "quick": quickSort(a, rec); break;
  }

  return rec.finish();
}
