import { describe, it, expect } from "vitest";
import { toJsonLines, containerPaths, pathsToDepth } from "@/lib/tools/json-view";

const lines = (value: unknown, collapsed: string[] = []) =>
  toJsonLines(value, new Set(collapsed));
const render = (value: unknown, collapsed: string[] = []) =>
  lines(value, collapsed).map((l) => "  ".repeat(l.depth) + l.text).join("\n");

describe("toJsonLines", () => {
  it("renders a scalar as one line", () => {
    expect(render(42)).toBe("42");
    expect(render("hi")).toBe('"hi"');
    expect(render(null)).toBe("null");
  });

  it("brackets an object across an opening and a closing line", () => {
    expect(render({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it("brackets an array the same way", () => {
    expect(render([1, 2])).toBe("[\n  1,\n  2\n]");
  });

  it("puts a comma after every item except the last", () => {
    expect(render({ a: 1, b: 2 })).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  it("puts a comma after a nested container's closing bracket", () => {
    expect(render({ o: { a: 1 }, b: 2 })).toBe('{\n  "o": {\n    "a": 1\n  },\n  "b": 2\n}');
  });

  it("round-trips: fully expanded output parses back to the same value", () => {
    // The viewer must never misrepresent the data it is showing.
    for (const value of [
      { a: 1, b: [1, 2, { c: null }], d: "x" },
      [[], {}, [{ deep: [true, false] }]],
      { "awkward key": 1, "": 2, unicode: "café 🙂" },
      { n: -1.5e10, big: 1e21 },
    ]) {
      expect(JSON.parse(render(value))).toEqual(value);
    }
  });

  it("renders empty containers on a single line", () => {
    expect(render({ a: {}, b: [] })).toBe('{\n  "a": {},\n  "b": []\n}');
  });

  it("collapses a container to one line with a count", () => {
    expect(render({ o: { a: 1, b: 2 } }, ["$.o"]))
      .toBe('{\n  "o": {…} 2 keys\n}');
  });

  it("says items rather than keys for a collapsed array", () => {
    expect(render({ xs: [1, 2, 3] }, ["$.xs"])).toBe('{\n  "xs": […] 3 items\n}');
  });

  it("keeps the trailing comma on a collapsed container", () => {
    expect(render({ o: { a: 1 }, b: 2 }, ["$.o"]))
      .toBe('{\n  "o": {…} 1 key,\n  "b": 2\n}');
  });

  it("hides descendants of a collapsed node", () => {
    const paths = lines({ a: { b: { c: 1 } } }, ["$.a"]).map((l) => l.path);
    expect(paths).not.toContain("$.a.b");
    expect(paths).not.toContain("$.a.b.c");
  });

  it("collapses the root", () => {
    expect(render({ a: 1 }, ["$"])).toBe("{…} 1 key");
  });

  it("marks which lines can be toggled", () => {
    const open = lines({ a: { b: 1 }, c: 2 }).filter((l) => l.togglePath !== null);
    expect(open.map((l) => l.togglePath)).toEqual(["$", "$.a"]);
  });

  it("uses singular for a single child", () => {
    expect(render({ o: { a: 1 } }, ["$.o"])).toContain("1 key");
    expect(render({ xs: [1] }, ["$.xs"])).toContain("1 item");
  });
});

describe("containerPaths", () => {
  it("lists every collapsible path", () => {
    expect(containerPaths({ a: { b: 1 }, c: [1] })).toEqual(["$", "$.a", "$.c"]);
  });

  it("skips empty containers, which have nothing to collapse", () => {
    expect(containerPaths({ a: {}, b: [] })).toEqual(["$"]);
  });

  it("returns nothing for a scalar", () => {
    expect(containerPaths(42)).toEqual([]);
  });
});

describe("pathsToDepth", () => {
  it("collapses everything below the given depth", () => {
    const value = { a: { b: { c: 1 } }, d: 2 };
    expect(pathsToDepth(value, 1)).toEqual(["$.a"]);
    expect(pathsToDepth(value, 2)).toEqual(["$.a.b"]);
  });

  it("collapses the root at depth 0", () => {
    expect(pathsToDepth({ a: 1 }, 0)).toEqual(["$"]);
  });
});
