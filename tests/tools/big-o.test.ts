import { describe, it, expect } from "vitest";
import {
  STRUCTURES, ALGORITHMS, COMPLEXITY_ORDER, severity, operationsAt,
} from "@/lib/tools/big-o";

describe("reference data", () => {
  it("uses only known complexities everywhere", () => {
    for (const row of STRUCTURES) {
      for (const c of [row.access, row.search, row.insert, row.remove, row.space]) {
        expect(COMPLEXITY_ORDER, `${row.name}: ${c}`).toContain(c);
      }
    }
    for (const row of ALGORITHMS) {
      for (const c of [row.best, row.average, row.worst, row.space]) {
        expect(COMPLEXITY_ORDER, `${row.name}: ${c}`).toContain(c);
      }
    }
  });

  it("never claims a best case worse than the worst case", () => {
    for (const row of ALGORITHMS) {
      expect(severity(row.best), row.name).toBeLessThanOrEqual(severity(row.worst));
      expect(severity(row.average), row.name).toBeLessThanOrEqual(severity(row.worst));
    }
  });

  it("gives every row a note that says something", () => {
    for (const row of [...STRUCTURES, ...ALGORITHMS]) {
      expect(row.note.length, row.name).toBeGreaterThan(30);
    }
  });
});

describe("severity", () => {
  it("runs from 0 for constant to 1 for factorial", () => {
    expect(severity("O(1)")).toBe(0);
    expect(severity("O(n!)")).toBe(1);
  });

  it("increases monotonically through the order", () => {
    for (let i = 1; i < COMPLEXITY_ORDER.length; i += 1) {
      expect(severity(COMPLEXITY_ORDER[i]!)).toBeGreaterThan(severity(COMPLEXITY_ORDER[i - 1]!));
    }
  });
});

describe("operationsAt", () => {
  it("computes the familiar values", () => {
    expect(operationsAt("O(1)", 1000)).toBe(1);
    expect(operationsAt("O(n)", 1000)).toBe(1000);
    expect(operationsAt("O(log n)", 1024)).toBe(10);
    expect(operationsAt("O(n²)", 100)).toBe(10000);
  });

  it("orders growth correctly at a realistic n", () => {
    const n = 1000;
    const counts = COMPLEXITY_ORDER.map((c) => operationsAt(c, n));
    for (let i = 1; i < counts.length; i += 1) {
      expect(counts[i]!, COMPLEXITY_ORDER[i]).toBeGreaterThanOrEqual(counts[i - 1]!);
    }
  });

  it("returns Infinity rather than a wrong number when the count overflows", () => {
    // 2^1000 and 1000! are not representable; claiming a figure would be a lie.
    expect(operationsAt("O(2ⁿ)", 1000)).toBe(Infinity);
    expect(operationsAt("O(n!)", 1000)).toBe(Infinity);
  });

  it("handles n of 0 and 1 without producing NaN", () => {
    for (const c of COMPLEXITY_ORDER) {
      expect(Number.isNaN(operationsAt(c, 0)), c).toBe(false);
      expect(Number.isNaN(operationsAt(c, 1)), c).toBe(false);
    }
  });
});
