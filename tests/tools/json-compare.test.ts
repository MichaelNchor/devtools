import { describe, it, expect } from "vitest";
import {
  compareJson, diffValues, computeStats, DEFAULT_COMPARE_OPTIONS, MAX_DEPTH,
  type CompareOptions, type DiffNode,
} from "@/lib/tools/json-compare";

const OPTS = (patch: Partial<CompareOptions> = {}): CompareOptions => ({
  ...DEFAULT_COMPARE_OPTIONS, ...patch,
});

/** Finds a node by its JSON path, for asserting on one place in the tree. */
function at(root: DiffNode, path: string): DiffNode | undefined {
  if (root.path === path) return root;
  for (const child of root.children ?? []) {
    const found = at(child, path);
    if (found) return found;
  }
  return undefined;
}

describe("diffValues — scalars", () => {
  it("marks equal scalars unchanged", () => {
    expect(diffValues(1, 1, OPTS()).kind).toBe("unchanged");
    expect(diffValues("a", "a", OPTS()).kind).toBe("unchanged");
    expect(diffValues(null, null, OPTS()).kind).toBe("unchanged");
  });

  it("marks differing scalars of the same type as changed", () => {
    expect(diffValues(1, 2, OPTS()).kind).toBe("changed");
  });

  it("distinguishes a type change from a value change", () => {
    expect(diffValues("1", 1, OPTS()).kind).toBe("type-changed");
    expect(diffValues(null, 0, OPTS()).kind).toBe("type-changed");
    // An empty object vs an empty array is a type change, not an empty diff.
    expect(diffValues({}, [], OPTS()).kind).toBe("type-changed");
  });
});

describe("diffValues — objects", () => {
  it("is unchanged when key order differs and ignoreKeyOrder is on", () => {
    expect(diffValues({ a: 1, b: 2 }, { b: 2, a: 1 }, OPTS()).kind).toBe("unchanged");
  });

  it("reports added and removed keys", () => {
    const root = diffValues({ a: 1 }, { b: 2 }, OPTS());
    expect(at(root, "$.a")?.kind).toBe("removed");
    expect(at(root, "$.b")?.kind).toBe("added");
    expect(root.kind).toBe("changed");
  });

  it("recurses into nested objects and builds a dotted path", () => {
    const root = diffValues({ u: { name: "a" } }, { u: { name: "b" } }, OPTS());
    expect(at(root, "$.u.name")?.kind).toBe("changed");
    expect(at(root, "$.u")?.kind).toBe("changed");
  });

  it("marks an added subtree at its root only, not every descendant", () => {
    const root = diffValues({}, { u: { a: 1, b: 2 } }, OPTS());
    expect(at(root, "$.u")?.kind).toBe("added");
    expect(computeStats(root).added).toBe(1);
  });
});

describe("diffValues — arrays", () => {
  it("compares positionally in index mode", () => {
    const root = diffValues([1, 2, 3], [1, 9, 3], OPTS());
    expect(at(root, "$[1]")?.kind).toBe("changed");
    expect(at(root, "$[0]")?.kind).toBe("unchanged");
  });

  it("reports a longer right side as additions in index mode", () => {
    expect(at(diffValues([1], [1, 2], OPTS()), "$[1]")?.kind).toBe("added");
  });

  it("reports a longer left side as removals in index mode", () => {
    expect(at(diffValues([1, 2], [1], OPTS()), "$[1]")?.kind).toBe("removed");
  });

  it("sees a reorder as unchanged in value mode but changed in index mode", () => {
    expect(diffValues([1, 2], [2, 1], OPTS({ arrayMatching: "value" })).kind).toBe("unchanged");
    expect(diffValues([1, 2], [2, 1], OPTS({ arrayMatching: "index" })).kind).toBe("changed");
  });

  it("matches objects by a named field in key mode", () => {
    const left = [{ id: "a", v: 1 }, { id: "b", v: 2 }];
    const right = [{ id: "b", v: 2 }, { id: "a", v: 99 }];
    const root = diffValues(left, right, OPTS({ arrayMatching: "key", arrayKeyField: "id" }));
    expect(at(root, "$[id=a].v")?.kind).toBe("changed");
    expect(at(root, "$[id=b]")?.kind).toBe("unchanged");
  });

  it("reports key-mode elements present on only one side", () => {
    const root = diffValues(
      [{ id: "a" }], [{ id: "b" }],
      OPTS({ arrayMatching: "key", arrayKeyField: "id" }),
    );
    expect(at(root, "$[id=a]")?.kind).toBe("removed");
    expect(at(root, "$[id=b]")?.kind).toBe("added");
  });
});

describe("diffValues — comparison options", () => {
  it("treats numbers inside the tolerance as equal", () => {
    expect(diffValues(1.0001, 1.0002, OPTS({ numericTolerance: 0.001 })).kind).toBe("unchanged");
    expect(diffValues(1.0001, 1.9, OPTS({ numericTolerance: 0.001 })).kind).toBe("changed");
  });

  it("collapses whitespace when asked", () => {
    expect(diffValues("a  b", " a b ", OPTS({ ignoreWhitespace: true })).kind).toBe("unchanged");
    expect(diffValues("a  b", " a b ", OPTS({ ignoreWhitespace: false })).kind).toBe("changed");
  });

  it("ignores string case when asked", () => {
    expect(diffValues("Hello", "hello", OPTS({ ignoreCase: true })).kind).toBe("unchanged");
    // Keys are structural, so ignoreCase must NOT merge two different keys.
    expect(diffValues({ A: 1 }, { a: 1 }, OPTS({ ignoreCase: true })).kind).toBe("changed");
  });
});

describe("computeStats", () => {
  it("counts leaves for changes and subtree roots for add/remove", () => {
    const root = diffValues(
      { keep: 1, drop: 2, edit: 3, retype: "4" },
      { keep: 1, edit: 30, retype: 4, gain: { deep: true } },
      OPTS(),
    );
    const stats = computeStats(root);
    expect(stats.removed).toBe(1);     // drop
    expect(stats.added).toBe(1);       // gain, counted once not twice
    expect(stats.changed).toBe(1);     // edit
    expect(stats.typeChanged).toBe(1); // retype
  });

  it("reports zero differences for identical input", () => {
    const stats = computeStats(diffValues({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] }, OPTS()));
    expect(stats).toMatchObject({ added: 0, removed: 0, changed: 0, typeChanged: 0 });
  });
});

describe("compareJson", () => {
  it("is insensitive to formatting — reformatting one side yields no diff", () => {
    const result = compareJson('{"a":1,"b":[2,3]}', '{\n  "a": 1,\n  "b": [ 2, 3 ]\n}', OPTS());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(computeStats(result.value.root)).toMatchObject({
      added: 0, removed: 0, changed: 0, typeChanged: 0,
    });
  });

  it("names the failing side and carries a position", () => {
    const result = compareJson("{bad}", "{}", OPTS());
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.message).toMatch(/left/i);
    expect(result.error.line).toBe(1);
  });

  it("names the right side when that is the broken one", () => {
    const result = compareJson("{}", "{bad}", OPTS());
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.message).toMatch(/right/i);
  });

  it("takes the last value for a duplicate key, matching JSON.parse", () => {
    const result = compareJson('{"a":1,"a":2}', '{"a":2}', OPTS());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(computeStats(result.value.root).changed).toBe(0);
  });

  it("reports rather than overflowing on structures deeper than MAX_DEPTH", () => {
    let deep = "null";
    for (let i = 0; i < MAX_DEPTH + 50; i += 1) deep = `{"a":${deep}}`;
    const result = compareJson(deep, deep, OPTS());
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.message).toMatch(/deep/i);
  });

  it("handles a 10,000-element array without hanging", () => {
    const left = JSON.stringify(Array.from({ length: 10_000 }, (_, i) => i));
    const right = JSON.stringify(Array.from({ length: 10_000 }, (_, i) => (i === 5000 ? -1 : i)));
    const started = Date.now();
    const result = compareJson(left, right, OPTS());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("unreachable");
    expect(computeStats(result.value.root).changed).toBe(1);
    expect(Date.now() - started).toBeLessThan(3000);
  });
});
