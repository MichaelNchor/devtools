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
      { path: "$.a", left: 1, right: 9, taken: 9 },
      { path: "$.o.b", left: 2, right: 8, taken: 8 },
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
});
