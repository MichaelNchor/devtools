import { describe, it, expect } from "vitest";
import { runRegex, replaceWithRegex, REGEX_LIBRARY, MATCH_CAP } from "@/lib/tools/regex";

const report = (pattern: string, flags: string, text: string) => {
  const r = runRegex(pattern, flags, text);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

describe("runRegex", () => {
  it("finds a single match with its position", () => {
    const out = report("b", "", "abc");
    expect(out.matches).toHaveLength(1);
    expect(out.matches[0]).toMatchObject({ index: 1, text: "b" });
  });

  it("finds every match with the global flag", () => {
    expect(report("a", "g", "aaa").matches.map((m) => m.index)).toEqual([0, 1, 2]);
  });

  it("stops at the first match without the global flag", () => {
    expect(report("a", "", "aaa").matches).toHaveLength(1);
  });

  it("reports numbered capture groups with their positions", () => {
    const out = report("(a)(b)", "", "ab");
    expect(out.matches[0]!.groups).toEqual([
      { name: null, value: "a", index: 0 },
      { name: null, value: "b", index: 1 },
    ]);
  });

  it("reports named capture groups by name", () => {
    const out = report("(?<first>a)(?<second>b)", "", "ab");
    expect(out.matches[0]!.groups.map((g) => g.name)).toEqual(["first", "second"]);
  });

  it("leaves an unmatched optional group undefined rather than empty", () => {
    // "" and "did not participate" are different answers, and the table shows
    // them differently.
    const out = report("(a)?(b)", "", "b");
    expect(out.matches[0]!.groups[0]!.value).toBeUndefined();
  });

  it("returns no matches without erroring when nothing matches", () => {
    expect(report("z", "g", "abc").matches).toEqual([]);
  });

  it("rejects an invalid pattern with the engine's message", () => {
    const r = runRegex("(", "", "abc");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message.length).toBeGreaterThan(0);
  });

  it("rejects an invalid flag combination", () => {
    expect(runRegex("a", "zz", "abc").ok).toBe(false);
  });

  it("does not hang on a pattern that matches the empty string globally", () => {
    // /a*/g against "bbb" matches empty at every position. Without an explicit
    // advance this loops forever, which is the classic version of this bug.
    const out = report("a*", "g", "bbb");
    expect(out.matches.length).toBeLessThanOrEqual(4);
  });

  it("caps the number of matches and says it truncated", () => {
    const out = report("a", "g", "a".repeat(MATCH_CAP + 100));
    expect(out.matches).toHaveLength(MATCH_CAP);
    expect(out.truncated).toBe(true);
  });

  it("flags a nested-quantifier pattern as risky", () => {
    expect(report("(a+)+$", "", "aaa").riskyPattern).toBe(true);
  });

  it("does not flag an ordinary pattern as risky", () => {
    expect(report("^[a-z]+$", "", "abc").riskyPattern).toBe(false);
  });

  it("gives up on a slow global run and reports it timed out", () => {
    const out = runRegex("a", "g", "a".repeat(200), 0);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // A zero budget expires on the first check, so it stops early and says so
    // rather than pretending the result is complete.
    expect(out.value.timedOut).toBe(true);
  });
});

describe("replaceWithRegex", () => {
  it("replaces with a numbered backreference", () => {
    expect(replaceWithRegex("(a)(b)", "g", "ab", "$2$1")).toMatchObject({ ok: true, value: "ba" });
  });

  it("replaces with a named backreference", () => {
    expect(replaceWithRegex("(?<x>a)", "g", "a", "[$<x>]")).toMatchObject({ ok: true, value: "[a]" });
  });

  it("replaces only the first match without the global flag", () => {
    expect(replaceWithRegex("a", "", "aa", "b")).toMatchObject({ ok: true, value: "ba" });
  });

  it("rejects an invalid pattern", () => {
    expect(replaceWithRegex("(", "", "a", "b").ok).toBe(false);
  });
});

describe("REGEX_LIBRARY", () => {
  it("ships patterns that all compile", () => {
    for (const entry of REGEX_LIBRARY) {
      expect(() => new RegExp(entry.pattern, entry.flags), entry.name).not.toThrow();
    }
  });

  it("covers the six patterns the spec names", () => {
    const names = REGEX_LIBRARY.map((e) => e.name.toLowerCase()).join(" ");
    for (const wanted of ["email", "url", "ipv4", "uuid", "iso", "semver"]) {
      expect(names, wanted).toContain(wanted);
    }
  });
});
