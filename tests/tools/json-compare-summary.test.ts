import { describe, it, expect } from "vitest";
import { diffValues, DEFAULT_COMPARE_OPTIONS } from "@/lib/tools/json-compare";
import { summarise } from "@/lib/tools/json-compare-summary";

const summaryFor = (left: unknown, right: unknown) =>
  summarise(diffValues(left, right, DEFAULT_COMPARE_OPTIONS));

describe("summarise", () => {
  it("returns nothing for identical documents", () => {
    expect(summaryFor({ a: 1 }, { a: 1 })).toEqual([]);
  });

  it("groups items by classification", () => {
    const groups = summaryFor({ drop: 1, edit: 2 }, { edit: 3, gain: 4 });
    expect(groups.map((g) => g.kind).sort()).toEqual(["added", "changed", "removed"]);
  });

  it("orders groups added, removed, changed, type-changed", () => {
    const groups = summaryFor(
      { drop: 1, edit: 2, retype: "3" },
      { edit: 9, retype: 3, gain: 4 },
    );
    expect(groups.map((g) => g.kind)).toEqual(["added", "removed", "changed", "type-changed"]);
  });

  it("lists each difference by its JSON path", () => {
    const groups = summaryFor({ users: [{ email: "a" }] }, { users: [{ email: "b" }] });
    const changed = groups.find((g) => g.kind === "changed");
    expect(changed?.items.map((i) => i.path)).toEqual(["$.users[0].email"]);
  });

  it("carries both values on a changed item so the summary can show them", () => {
    const item = summaryFor({ a: 1 }, { a: 2 }).find((g) => g.kind === "changed")?.items[0];
    expect(item).toMatchObject({ path: "$.a", left: 1, right: 2 });
  });

  it("reports an added subtree once, at its root", () => {
    const groups = summaryFor({}, { u: { a: 1, b: 2 } });
    expect(groups.find((g) => g.kind === "added")?.items.map((i) => i.path)).toEqual(["$.u"]);
  });

  it("omits a group with no items rather than showing it empty", () => {
    const groups = summaryFor({ a: 1 }, { a: 2 });
    expect(groups).toHaveLength(1);
    expect(groups[0]!.kind).toBe("changed");
  });

  it("gives every group a spelled-out label, since colour never stands alone", () => {
    for (const group of summaryFor({ drop: 1 }, { gain: 2 })) {
      expect(group.label.length).toBeGreaterThan(0);
    }
  });

  it("reports how many values each difference covers", () => {
    // "Type changed at $.handler" is a different size of problem depending on
    // whether it discarded one value or a whole subtree, and the summary
    // should not present those identically.
    const groups = summaryFor(
      { retries: 3, handler: { type: "queue", dlq: { enabled: true, max: 5 } } },
      { retries: "three", handler: "inline" },
    );
    const typed = groups.find((g) => g.kind === "type-changed")!;
    const byPath = Object.fromEntries(typed.items.map((i) => [i.path, i.size]));

    expect(byPath["$.retries"]).toBe(1);
    expect(byPath["$.handler"]).toBe(3);
  });

  it("sizes an added or removed subtree by what it contains", () => {
    const added = summaryFor({}, { probes: { liveness: "/a", readiness: "/b" } });
    expect(added.find((g) => g.kind === "added")!.items[0]!.size).toBe(2);

    const removed = summaryFor({ gone: [1, 2, 3] }, {});
    expect(removed.find((g) => g.kind === "removed")!.items[0]!.size).toBe(3);
  });

  it("sizes a plain scalar change as one", () => {
    const groups = summaryFor({ a: 1 }, { a: 2 });
    expect(groups[0]!.items[0]!.size).toBe(1);
  });

  it("totals each group's size, so a heading can state the scale", () => {
    const groups = summaryFor({ a: 1, b: 2 }, { a: 9, b: 8 });
    expect(groups.find((g) => g.kind === "changed")!.size).toBe(2);
  });
});
