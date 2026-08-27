import { describe, it, expect } from "vitest";
import { formatJson, DEFAULT_FORMAT_OPTIONS } from "@/lib/tools/json-format";

const run = (text: string, patch: Partial<typeof DEFAULT_FORMAT_OPTIONS> = {}) =>
  formatJson(text, { ...DEFAULT_FORMAT_OPTIONS, ...patch });

const value = (text: string, patch: Partial<typeof DEFAULT_FORMAT_OPTIONS> = {}) => {
  const result = run(text, patch);
  if (!result.ok) throw new Error(`expected ok, got: ${result.error.message}`);
  return result.value;
};

describe("formatJson", () => {
  it("beautifies with two spaces by default", () => {
    expect(value('{"a":1}')).toBe('{\n  "a": 1\n}');
  });

  it("beautifies with four spaces", () => {
    expect(value('{"a":1}', { indent: "4" })).toBe('{\n    "a": 1\n}');
  });

  it("beautifies with tabs", () => {
    expect(value('{"a":1}', { indent: "tab" })).toBe('{\n\t"a": 1\n}');
  });

  it("minifies, ignoring the indent setting", () => {
    expect(value('{\n  "a": 1\n}', { minify: true, indent: "4" })).toBe('{"a":1}');
  });

  it("sorts keys ascending", () => {
    expect(value('{"b":1,"a":2}', { sort: "asc", minify: true })).toBe('{"a":2,"b":1}');
  });

  it("sorts keys descending", () => {
    expect(value('{"a":1,"b":2}', { sort: "desc", minify: true })).toBe('{"b":2,"a":1}');
  });

  it("leaves key order alone when sorting is off", () => {
    expect(value('{"b":1,"a":2}', { minify: true })).toBe('{"b":1,"a":2}');
  });

  it("sorts recursively, not just at the root", () => {
    expect(value('{"o":{"b":1,"a":2}}', { sort: "asc", minify: true })).toBe('{"o":{"a":2,"b":1}}');
  });

  it("sorts objects nested inside arrays", () => {
    expect(value('[{"b":1,"a":2}]', { sort: "asc", minify: true })).toBe('[{"a":2,"b":1}]');
  });

  it("never reorders array elements, which are positional", () => {
    // Sorting keys is safe; sorting elements would change what the data means.
    expect(value("[3,1,2]", { sort: "asc", minify: true })).toBe("[3,1,2]");
  });

  it("reports the position of a syntax error", () => {
    const result = run('{"a": }');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.line).toBe(1);
    expect(result.error.column).toBeGreaterThan(0);
  });

  it("reports the line of an error in a multi-line document", () => {
    const result = run('{\n  "a": 1,\n  "b": @\n}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.line).toBe(3);
    expect(result.error.column).toBe(8);
  });

  it("points at end-of-document when every token is individually well formed", () => {
    // parseJson locates errors by walking for the first character that cannot
    // START a valid token. A misplaced but well-formed token — a "}" where a
    // value belongs — passes that walk, so the position falls to the end. This
    // is the documented fallback, asserted here so nobody 'fixes' it by
    // accident and starts depending on V8 error-message wording instead.
    const result = run('{\n  "a": 1,\n  "b": }\n}');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.line).toBe(4);
  });

  it("formats a bare scalar document", () => {
    expect(value("42")).toBe("42");
  });

  it("round-trips an empty object and an empty array", () => {
    expect(value("{}", { minify: true })).toBe("{}");
    expect(value("[]", { minify: true })).toBe("[]");
  });

  it("preserves non-ASCII characters rather than escaping them", () => {
    expect(value('{"k":"café"}', { minify: true })).toBe('{"k":"café"}');
  });

  it("rejects an empty document with a message, not a crash", () => {
    expect(run("").ok).toBe(false);
  });
});
