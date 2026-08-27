import { describe, it, expect } from "vitest";
import { diffValues, DEFAULT_COMPARE_OPTIONS } from "@/lib/tools/json-compare";
import { toRows } from "@/lib/tools/json-compare-rows";

const rowsFor = (left: unknown, right: unknown) =>
  toRows(diffValues(left, right, DEFAULT_COMPARE_OPTIONS));

describe("toRows", () => {
  it("emits both panes for an unchanged scalar", () => {
    const rows = rowsFor(1, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      gutter: " ", leftText: "1", rightText: "1", isDifference: false,
    });
  });

  it("brackets an object with an opening and a closing row", () => {
    expect(rowsFor({ a: 1 }, { a: 1 }).map((r) => r.leftText)).toEqual(["{", '"a": 1', "}"]);
  });

  it("blanks the left pane for an added key and marks the gutter", () => {
    const added = rowsFor({}, { a: 1 }).find((r) => r.path === "$.a");
    expect(added).toMatchObject({
      gutter: "+", leftText: null, rightText: '"a": 1', isDifference: true,
    });
  });

  it("blanks the right pane for a removed key", () => {
    expect(rowsFor({ a: 1 }, {}).find((r) => r.path === "$.a")).toMatchObject({
      gutter: "-", rightText: null,
    });
  });

  it("shows both values on a changed row", () => {
    expect(rowsFor({ a: 1 }, { a: 2 }).find((r) => r.path === "$.a")).toMatchObject({
      gutter: "~", leftText: '"a": 1', rightText: '"a": 2',
    });
  });

  it("uses ! for a type change", () => {
    expect(rowsFor({ a: "1" }, { a: 1 }).find((r) => r.path === "$.a")?.gutter).toBe("!");
  });

  it("never emits a row that is blank on both sides", () => {
    // Every row occupies one line in BOTH panes; a null is a blank line, not
    // a missing one. That invariant is what keeps the panes aligned.
    const rows = rowsFor({ a: 1, gone: 2 }, { a: 1, added: 3 });
    expect(rows.every((r) => r.leftText !== null || r.rightText !== null)).toBe(true);
  });

  it("indents nested structures by depth", () => {
    expect(rowsFor({ u: { n: 1 } }, { u: { n: 1 } }).find((r) => r.path === "$.u.n")?.depth).toBe(2);
  });

  it("renders array elements without a key label", () => {
    expect(rowsFor([1], [1]).map((r) => r.leftText)).toEqual(["[", "1", "]"]);
  });

  it("expands an added object across its own rows", () => {
    const rows = rowsFor({}, { u: { a: 1 } });
    const differing = rows.filter((r) => r.isDifference);
    expect(differing.map((r) => r.path)).toContain("$.u");
    expect(differing.map((r) => r.path)).toContain("$.u.a");
    expect(differing.every((r) => r.leftText === null)).toBe(true);
  });

  it("renders a value-matched object element as JSON, not [object Object]", () => {
    // Value matching collapses a matched pair into one childless node even when
    // the element is an object, so the row model has to serialise containers.
    const rows = toRows(
      diffValues([{ a: 1 }], [{ a: 1 }], { ...DEFAULT_COMPARE_OPTIONS, arrayMatching: "value" }),
    );
    expect(rows.map((r) => r.leftText)).toEqual(["[", '{"a":1}', "]"]);
  });

  it("does not count a container as a difference just because a child changed", () => {
    // computeStats applies the same rule; if the braces counted, "jump to next
    // difference" would stop on the opening and closing brace of every document.
    const rows = rowsFor({ a: 1 }, { a: 2 });
    expect(rows.filter((r) => r.isDifference).map((r) => r.path)).toEqual(["$.a"]);
  });

  it("assigns sequential indices for jump-to-next-difference", () => {
    const rows = rowsFor({ a: 1, b: 2 }, { a: 9, b: 8 });
    expect(rows.map((r) => r.index)).toEqual(rows.map((_, i) => i));
  });
});
