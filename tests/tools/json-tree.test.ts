import { describe, it, expect } from "vitest";
import { toTreeRows } from "@/lib/tools/json-tree";

const paths = (value: unknown, collapsed: string[] = []) =>
  toTreeRows(value, new Set(collapsed)).map((r) => r.path);

describe("toTreeRows", () => {
  it("emits one row for a scalar document", () => {
    const rows = toTreeRows(42, new Set());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ path: "$", kind: "scalar", depth: 0, hasChildren: false });
  });

  it("gives every node a JSON path that matches JSON Compare's notation", () => {
    expect(paths({ users: [{ id: 1 }] })).toEqual(["$", "$.users", "$.users[0]", "$.users[0].id"]);
  });

  it("hides the children of a collapsed node but keeps the node itself", () => {
    expect(paths({ users: [{ id: 1 }] }, ["$.users"])).toEqual(["$", "$.users"]);
  });

  it("still hides descendants when an ancestor is collapsed", () => {
    expect(paths({ a: { b: { c: 1 } } }, ["$.a"])).toEqual(["$", "$.a"]);
  });

  it("reports child counts so a collapsed node can say what it hides", () => {
    const row = toTreeRows({ a: 1, b: 2 }, new Set())[0]!;
    expect(row).toMatchObject({ kind: "object", childCount: 2, hasChildren: true });
  });

  it("treats an empty object as having no children", () => {
    expect(toTreeRows({}, new Set())[0]).toMatchObject({ childCount: 0, hasChildren: false });
  });

  it("previews a scalar as its JSON form", () => {
    const rows = toTreeRows({ s: "x", n: 1, b: true, z: null }, new Set());
    expect(rows.map((r) => r.preview).slice(1)).toEqual(['"x"', "1", "true", "null"]);
  });

  it("previews a container by shape rather than dumping it", () => {
    expect(toTreeRows({ a: [1, 2] }, new Set())[1]!.preview).toBe("[2]");
    expect(toTreeRows({ a: { b: 1 } }, new Set())[1]!.preview).toBe("{1}");
  });

  it("carries the raw value so a row can copy it", () => {
    expect(toTreeRows({ a: { b: 1 } }, new Set())[1]!.value).toEqual({ b: 1 });
  });

  it("indents by depth", () => {
    const rows = toTreeRows({ a: { b: 1 } }, new Set());
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2]);
  });

  it("numbers array elements by index and gives them no key label", () => {
    const rows = toTreeRows(["x"], new Set());
    expect(rows[1]).toMatchObject({ path: "$[0]", key: 0 });
  });
});
