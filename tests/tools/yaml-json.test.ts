import { describe, it, expect } from "vitest";
import { yamlToJson, jsonToYaml, hasCommentsOrAnchors } from "@/lib/tools/yaml-json";

const value = <T,>(r: { ok: true; value: T } | { ok: false; error: { message: string } }): T => {
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

describe("yamlToJson", () => {
  it("converts a mapping", () => {
    expect(value(yamlToJson("a: 1\nb: two", 2))).toBe('{\n  "a": 1,\n  "b": "two"\n}');
  });

  it("converts a nested sequence", () => {
    expect(JSON.parse(value(yamlToJson("list:\n  - 1\n  - 2", 2)))).toEqual({ list: [1, 2] });
  });

  it("honours the indent setting", () => {
    expect(value(yamlToJson("a: 1", 4))).toBe('{\n    "a": 1\n}');
  });

  it("reports the line of a YAML syntax error", () => {
    const r = yamlToJson("a: 1\n  b: [", 2);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.line).toBeGreaterThan(0);
  });

  it("rejects an empty document rather than emitting undefined", () => {
    expect(yamlToJson("   ", 2).ok).toBe(false);
  });
});

describe("jsonToYaml", () => {
  it("converts an object to block style", () => {
    expect(value(jsonToYaml('{"a":1}', { indent: 2, flowStyle: false })).trim()).toBe("a: 1");
  });

  it("emits flow style when asked", () => {
    const out = value(jsonToYaml('{"a":[1,2]}', { indent: 2, flowStyle: true }));
    expect(out).toContain("[");
  });

  it("emits block style by default, which is not flow", () => {
    const out = value(jsonToYaml('{"a":[1,2]}', { indent: 2, flowStyle: false }));
    expect(out).toContain("- 1");
  });

  it("reports a JSON syntax error positionally", () => {
    const r = jsonToYaml("{", { indent: 2, flowStyle: false });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.line).toBe(1);
  });
});

describe("hasCommentsOrAnchors", () => {
  it("sees a comment", () => {
    expect(hasCommentsOrAnchors("a: 1 # note")).toBe(true);
  });

  it("sees an anchor and an alias", () => {
    expect(hasCommentsOrAnchors("a: &anchor 1\nb: *anchor")).toBe(true);
  });

  it("does not mistake a # inside a quoted string for a comment", () => {
    // A false warning teaches users to ignore warnings, so this matters.
    expect(hasCommentsOrAnchors('a: "not # a comment"')).toBe(false);
  });

  it("returns false for plain YAML", () => {
    expect(hasCommentsOrAnchors("a: 1\nb: 2")).toBe(false);
  });
});
