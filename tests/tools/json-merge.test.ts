import { describe, it, expect } from "vitest";
import { mergeJson, DEFAULT_MERGE_OPTIONS, type MergeOptions } from "@/lib/tools/json-merge";

const run = (a: string, b: string, patch: Partial<MergeOptions> = {}) =>
  mergeJson(a, b, { ...DEFAULT_MERGE_OPTIONS, ...patch });

const merged = (a: string, b: string, patch: Partial<MergeOptions> = {}) => {
  const r = run(a, b, patch);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

const j = (v: unknown) => JSON.stringify(v);

describe("mergeJson — objects", () => {
  it("unions keys from both sides", () => {
    expect(merged(j({ a: 1 }), j({ b: 2 })).value).toEqual({ a: 1, b: 2 });
  });

  it("merges nested objects rather than replacing them wholesale", () => {
    // A shallow merge would drop `keep`, which is the usual bug.
    expect(merged(j({ o: { keep: 1 } }), j({ o: { add: 2 } })).value)
      .toEqual({ o: { keep: 1, add: 2 } });
  });

  it("lets the right side win a scalar conflict by default", () => {
    expect(merged(j({ a: 1 }), j({ a: 2 })).value).toEqual({ a: 2 });
  });

  it("can let the left side win instead", () => {
    expect(merged(j({ a: 1 }), j({ a: 2 }), { onConflict: "left" }).value).toEqual({ a: 1 });
  });

  it("reports every conflict rather than resolving one silently", () => {
    const out = merged(j({ a: 1, o: { b: 2 } }), j({ a: 9, o: { b: 8 } }));
    expect(out.conflicts).toEqual([
      { path: "$.a", left: 1, right: 9, taken: 9, kind: "value", lost: 0 },
      { path: "$.o.b", left: 2, right: 8, taken: 8, kind: "value", lost: 0 },
    ]);
  });

  it("does not call a matching value a conflict", () => {
    expect(merged(j({ a: 1 }), j({ a: 1 })).conflicts).toEqual([]);
  });

  it("treats a type change as a conflict too", () => {
    const out = merged(j({ a: { deep: 1 } }), j({ a: "flat" }));
    expect(out.conflicts).toHaveLength(1);
    expect(out.value).toEqual({ a: "flat" });
  });

  it("keeps a null that is genuinely present", () => {
    expect(merged(j({ a: 1 }), j({ a: null })).value).toEqual({ a: null });
  });
});

describe("mergeJson — arrays", () => {
  it("unions arrays without repeating items, by default", () => {
    expect(merged(j({ xs: [1, 2] }), j({ xs: [2, 3] })).value).toEqual({ xs: [1, 2, 3] });
  });

  it("deduplicates by VALUE, not by reference, for objects", () => {
    const out = merged(j({ xs: [{ id: 1 }] }), j({ xs: [{ id: 1 }, { id: 2 }] }));
    expect(out.value).toEqual({ xs: [{ id: 1 }, { id: 2 }] });
  });

  it("ignores key order when deciding two objects are the same item", () => {
    const out = merged(j({ xs: [{ a: 1, b: 2 }] }), j({ xs: [{ b: 2, a: 1 }] }));
    expect((out.value as { xs: unknown[] }).xs).toHaveLength(1);
  });

  it("removes duplicates within one side too", () => {
    expect(merged(j({ xs: [1, 1, 2] }), j({ xs: [] })).value).toEqual({ xs: [1, 2] });
  });

  it("can concatenate instead, keeping every item", () => {
    expect(merged(j({ xs: [1, 2] }), j({ xs: [2, 3] }), { arrays: "concat" }).value)
      .toEqual({ xs: [1, 2, 2, 3] });
  });

  it("can let the right array replace the left entirely", () => {
    expect(merged(j({ xs: [1, 2] }), j({ xs: [9] }), { arrays: "replace" }).value)
      .toEqual({ xs: [9] });
  });

  it("merges arrays of objects by a key field when asked", () => {
    const out = merged(
      j({ xs: [{ id: 1, name: "a" }] }),
      j({ xs: [{ id: 1, role: "admin" }, { id: 2, name: "b" }] }),
      { arrays: "by-key", keyField: "id" },
    );
    expect(out.value).toEqual({
      xs: [{ id: 1, name: "a", role: "admin" }, { id: 2, name: "b" }],
    });
  });

  it("falls back to appending items that have no key", () => {
    const out = merged(
      j({ xs: [{ id: 1 }] }), j({ xs: [{ noKey: true }] }),
      { arrays: "by-key", keyField: "id" },
    );
    expect((out.value as { xs: unknown[] }).xs).toHaveLength(2);
  });
});

describe("mergeJson — roots and errors", () => {
  it("merges two root arrays", () => {
    expect(merged(j([1, 2]), j([2, 3])).value).toEqual([1, 2, 3]);
  });

  it("reports which side failed to parse", () => {
    const left = run("{bad", j({ a: 1 }));
    expect(left.ok).toBe(false);
    if (left.ok) return;
    expect(left.error.message.toLowerCase()).toContain("left");

    const right = run(j({ a: 1 }), "{bad");
    expect(right.ok).toBe(false);
    if (right.ok) return;
    expect(right.error.message.toLowerCase()).toContain("right");
  });

  it("rejects an empty side rather than merging with nothing", () => {
    expect(run("", j({ a: 1 })).ok).toBe(false);
  });

  it("counts what it did, so the result can be summarised", () => {
    const out = merged(j({ a: 1, b: 2 }), j({ b: 9, c: 3 }));
    expect(out.stats).toMatchObject({ added: 1, conflicts: 1 });
  });

  it("never mutates the parsed inputs", () => {
    // The merge builds a new value; sharing a nested object would let a later
    // edit to the result reach back into one of the sources.
    const out = merged(j({ o: { a: 1 } }), j({ o: { b: 2 } }));
    const value = out.value as { o: Record<string, unknown> };
    value.o.a = 99;
    expect(merged(j({ o: { a: 1 } }), j({ o: { b: 2 } })).value).toEqual({ o: { a: 1, b: 2 } });
  });

  it("classifies a plain value swap as a value conflict", () => {
    const out = merged(j({ a: "1.0.0" }), j({ a: "2.0.0" }));
    expect(out.conflicts[0]).toMatchObject({ kind: "value" });
  });

  it("classifies a changed JSON type as a type conflict", () => {
    // 3 becoming "three" is a different kind of surprise from 3 becoming 4.
    const out = merged(j({ retries: 3 }), j({ retries: "three" }));
    expect(out.conflicts[0]).toMatchObject({ kind: "type" });
  });

  it("classifies a dropped object or array as a subtree conflict", () => {
    // This is the dangerous one: a whole branch of data is discarded.
    const dropped = merged(j({ h: { a: 1, b: { c: 2 } } }), j({ h: "inline" }));
    expect(dropped.conflicts[0]).toMatchObject({ kind: "subtree" });

    const arr = merged(j({ h: [1, 2, 3] }), j({ h: null }));
    expect(arr.conflicts[0]).toMatchObject({ kind: "subtree" });
  });

  it("counts how many values a dropped subtree took with it", () => {
    // "A whole object was replaced" is only meaningful with a size beside it.
    const out = merged(j({ h: { a: 1, b: { c: 2, d: 3 } } }), j({ h: "inline" }));
    expect(out.conflicts[0]!.lost).toBe(3);
  });

  it("reports no loss for a scalar conflict", () => {
    expect(merged(j({ a: 1 }), j({ a: 2 })).conflicts[0]!.lost).toBe(0);
  });

  it("counts subtree losses separately in the stats", () => {
    const out = merged(j({ h: { a: 1 }, x: 1 }), j({ h: "gone", x: 2 }));
    expect(out.stats).toMatchObject({ conflicts: 2, subtreesDropped: 1 });
  });

  it("auto-detects the identity field and merges records on it", () => {
    // The real-world case: two config files each holding one host that is the
    // SAME host. Nothing is called "id", so a fixed default key cannot help.
    const host = (indexes: unknown[]) => j({
      Hosts: [{ Url: "xxx", Alias: "insurance-merchant", Indexes: indexes }],
    });
    const out = merged(
      host([{ Index: "policies", Alias: "a" }]),
      host([{ Index: "policies", Alias: "a" }, { Index: "policies_sandbox", Alias: "b" }]),
      { arrays: "auto" },
    );
    const value = out.value as { Hosts: { Indexes: unknown[] }[] };
    expect(value.Hosts).toHaveLength(1);
    expect(value.Hosts[0]!.Indexes).toHaveLength(2);
  });

  it("says which field it matched on, so the choice is not invisible", () => {
    const out = merged(
      j({ xs: [{ Alias: "a", n: 1 }] }),
      j({ xs: [{ Alias: "a", n: 2 }, { Alias: "b" }] }),
      { arrays: "auto" },
    );
    expect(out.stats.matchedOn).toEqual({ "$.xs": "Alias" });
  });

  it("prefers a conventional identity name over any other unique field", () => {
    const out = merged(
      j({ xs: [{ id: 1, code: "x" }] }),
      j({ xs: [{ id: 1, code: "y" }] }),
      { arrays: "auto" },
    );
    expect(out.stats.matchedOn["$.xs"]).toBe("id");
  });

  it("never treats a boolean as an identity", () => {
    // Two items sharing `enabled: true` are not the same record.
    const out = merged(
      j({ xs: [{ enabled: true, v: 1 }] }),
      j({ xs: [{ enabled: true, v: 2 }] }),
      { arrays: "auto" },
    );
    expect((out.value as { xs: unknown[] }).xs).toHaveLength(2);
  });

  it("falls back to union when no field identifies the items", () => {
    const out = merged(j({ xs: [1, 2] }), j({ xs: [2, 3] }), { arrays: "auto" });
    expect(out.value).toEqual({ xs: [1, 2, 3] });
    expect(out.stats.matchedOn).toEqual({});
  });

  it("does not match on a field that repeats within one side", () => {
    // `kind` is shared by two items on the left, so it identifies nothing.
    const out = merged(
      j({ xs: [{ kind: "a", n: 1 }, { kind: "a", n: 2 }] }),
      j({ xs: [{ kind: "a", n: 3 }] }),
      { arrays: "auto" },
    );
    expect(out.stats.matchedOn).toEqual({});
  });

  it("still deduplicates identical records under auto", () => {
    const out = merged(
      j({ xs: [{ id: 1, n: 1 }] }),
      j({ xs: [{ id: 1, n: 1 }] }),
      { arrays: "auto" },
    );
    expect((out.value as { xs: unknown[] }).xs).toEqual([{ id: 1, n: 1 }]);
  });
});
