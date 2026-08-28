import { describe, it, expect } from "vitest";
import {
  sortFrames, SORT_ALGORITHMS, MAX_FRAMES, PSEUDOCODE, type SortAlgorithm,
} from "@/lib/tools/sorting";

const run = (input: number[], algorithm: SortAlgorithm = "bubble") => sortFrames(input, algorithm);
const sorted = (input: number[]) => [...input].sort((a, b) => a - b);

describe("sortFrames", () => {
  it("ends with the array fully sorted, for every algorithm", () => {
    const input = [5, 3, 8, 1, 9, 2, 7];
    for (const algo of SORT_ALGORITHMS) {
      const frames = run(input, algo.value);
      expect(frames.at(-1)!.array, algo.value).toEqual(sorted(input));
    }
  });

  it("never mutates the caller's array", () => {
    const input = [3, 1, 2];
    run(input);
    expect(input).toEqual([3, 1, 2]);
  });

  it("starts from the input untouched", () => {
    expect(run([3, 1, 2])[0]!.array).toEqual([3, 1, 2]);
  });

  it("marks every element sorted in the final frame", () => {
    for (const algo of SORT_ALGORITHMS) {
      const last = run([4, 2, 7, 1], algo.value).at(-1)!;
      expect(last.sorted.length, algo.value).toBe(4);
    }
  });

  it("counts comparisons and swaps, and both only ever increase", () => {
    const frames = run([5, 1, 4, 2, 8]);
    for (let i = 1; i < frames.length; i += 1) {
      expect(frames[i]!.comparisons).toBeGreaterThanOrEqual(frames[i - 1]!.comparisons);
      expect(frames[i]!.swaps).toBeGreaterThanOrEqual(frames[i - 1]!.swaps);
    }
    expect(frames.at(-1)!.comparisons).toBeGreaterThan(0);
  });

  it("does no swaps on already-sorted input, but still compares", () => {
    const frames = run([1, 2, 3, 4], "bubble");
    expect(frames.at(-1)!.swaps).toBe(0);
    expect(frames.at(-1)!.comparisons).toBeGreaterThan(0);
  });

  it("handles an empty array and a single element without erroring", () => {
    expect(run([]).at(-1)!.array).toEqual([]);
    expect(run([7]).at(-1)!.array).toEqual([7]);
  });

  it("handles duplicates", () => {
    expect(run([3, 1, 3, 1]).at(-1)!.array).toEqual([1, 1, 3, 3]);
  });

  it("handles negative numbers", () => {
    expect(run([3, -1, 0, -5]).at(-1)!.array).toEqual([-5, -1, 0, 3]);
  });

  it("highlights indices that are within range", () => {
    for (const algo of SORT_ALGORITHMS) {
      for (const frame of run([4, 2, 7, 1, 9], algo.value)) {
        for (const i of [...frame.comparing, ...frame.swapping, ...frame.sorted]) {
          expect(i, `${algo.value} index ${i}`).toBeGreaterThanOrEqual(0);
          expect(i, `${algo.value} index ${i}`).toBeLessThan(5);
        }
      }
    }
  });

  it("produces more frames for a harder input than an easy one", () => {
    // A reversed array is the worst case for bubble sort; a sorted one is best.
    const easy = run([1, 2, 3, 4, 5, 6], "bubble").length;
    const hard = run([6, 5, 4, 3, 2, 1], "bubble").length;
    expect(hard).toBeGreaterThan(easy);
  });

  it("describes what each frame is doing, for the caption", () => {
    for (const frame of run([3, 1, 2])) {
      expect(frame.note.length).toBeGreaterThan(0);
    }
  });

  it("offers five algorithms, each with a stated complexity", () => {
    expect(SORT_ALGORITHMS).toHaveLength(5);
    for (const algo of SORT_ALGORITHMS) {
      expect(algo.best.length, algo.value).toBeGreaterThan(0);
      expect(algo.average.length, algo.value).toBeGreaterThan(0);
      expect(algo.worst.length, algo.value).toBeGreaterThan(0);
      expect(algo.space.length, algo.value).toBeGreaterThan(0);
      expect(algo.blurb.length, algo.value).toBeGreaterThan(20);
    }
  });

  it("caps frames so a large array cannot hang the tab", () => {
    const big = Array.from({ length: 200 }, (_, i) => 200 - i);
    const frames = run(big, "bubble");
    expect(frames.length).toBeLessThanOrEqual(MAX_FRAMES);
    // Even when truncated, the last frame must still show the sorted result.
    expect(frames.at(-1)!.array).toEqual(sorted(big));
  });


  it("points every frame at a real line of its algorithm's pseudocode", () => {
    // The highlighted line is how the animation explains itself. An index
    // past the end of the listing would highlight nothing at all.
    for (const algo of SORT_ALGORITHMS) {
      const lines = PSEUDOCODE[algo.value];
      for (const frame of run([5, 2, 9, 1], algo.value)) {
        expect(frame.line, `${algo.value}: ${frame.note}`).toBeGreaterThanOrEqual(0);
        expect(frame.line, `${algo.value}: ${frame.note}`).toBeLessThan(lines.length);
      }
    }
  });

  it("ships pseudocode for every algorithm", () => {
    for (const algo of SORT_ALGORITHMS) {
      const lines = PSEUDOCODE[algo.value];
      expect(lines.length, algo.value).toBeGreaterThanOrEqual(4);
      for (const line of lines) expect(line.length, algo.value).toBeGreaterThan(0);
    }
  });

  it("visits more than one pseudocode line during a run", () => {
    // A run stuck on one line would mean the mapping was never wired up.
    for (const algo of SORT_ALGORITHMS) {
      const lines = new Set(run([4, 1, 3, 2], algo.value).map((f) => f.line));
      expect(lines.size, algo.value).toBeGreaterThan(1);
    }
  });
});
