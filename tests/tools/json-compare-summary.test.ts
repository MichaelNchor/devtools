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
});
