import { describe, it, expect } from "vitest";
import {
  PATTERNS, TOPICS, PREP_SPLIT, learningOrder, totalTarget,
} from "@/lib/tools/patterns";
import { LANGUAGES } from "@/lib/tools/languages";

describe("PATTERNS", () => {
  it("covers the fifteen patterns", () => {
    expect(PATTERNS).toHaveLength(15);
  });

  it("leads every pattern with a recognition signal, not a restatement", () => {
    // The whole premise: you match on the signal, not the problem name.
    for (const p of PATTERNS) {
      expect(p.signal.length, p.name).toBeGreaterThan(20);
      expect(p.idea.length, p.name).toBeGreaterThan(30);
    }
  });

  it("states time and space for every pattern", () => {
    for (const p of PATTERNS) {
      expect(p.time, p.name).toMatch(/^O\(/);
      expect(p.space, p.name).toMatch(/^O\(/);
    }
  });

  it("ships a real implementation in every language, for every pattern", () => {
    // A missing language would render an empty code panel with no warning,
    // so this is checked per pattern per language rather than in aggregate.
    for (const p of PATTERNS) {
      for (const { value, label } of LANGUAGES) {
        expect(p.code[value], `${p.name}: ${label}`).toBeTruthy();
        expect(p.code[value].length, `${p.name}: ${label}`).toBeGreaterThan(50);
      }
      expect(p.problems.length, p.name).toBeGreaterThanOrEqual(3);
    }
  });

  it("does not paste the same snippet into two languages", () => {
    for (const p of PATTERNS) {
      const snippets = LANGUAGES.map((l) => p.code[l.value]);
      expect(new Set(snippets).size, p.name).toBe(snippets.length);
    }
  });

  it("uses distinct names", () => {
    const names = PATTERNS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("TOPICS", () => {
  it("uses only the three priority tiers", () => {
    for (const t of TOPICS) expect([1, 2, 3], t.name).toContain(t.priority);
  });

  it("gives the learning order contiguous positions from 1", () => {
    const order = learningOrder();
    expect(order.map((t) => t.order)).toEqual(order.map((_, i) => i + 1));
  });

  it("starts the order with Big-O, since everything else is stated in it", () => {
    expect(learningOrder()[0]!.name).toBe("Big-O");
  });

  it("puts dynamic programming last, after recursion is comfortable", () => {
    expect(learningOrder().at(-1)!.name).toBe("Dynamic Programming");
  });

  it("targets a realistic number of problems, not five hundred", () => {
    const total = totalTarget();
    expect(total).toBeGreaterThanOrEqual(100);
    expect(total).toBeLessThanOrEqual(180);
  });

  it("explains every topic", () => {
    for (const t of TOPICS) expect(t.note.length, t.name).toBeGreaterThan(20);
  });
});

describe("PREP_SPLIT", () => {
  it("sums to exactly 100 percent", () => {
    expect(PREP_SPLIT.reduce((sum, s) => sum + s.share, 0)).toBe(100);
  });

  it("does not let DSA dominate a backend split", () => {
    // The point being made: for most backend roles it is about a third.
    expect(PREP_SPLIT.find((s) => s.area === "DSA")!.share).toBeLessThanOrEqual(35);
  });
});
