import { describe, it, expect } from "vitest";
import { parseJson } from "@/lib/json/parse";

describe("parseJson", () => {
  it("parses valid JSON", () => {
    const result = parseJson('{"a":1}');
    expect(result).toEqual({ ok: true, value: { a: 1 } });
  });

  it("parses top-level scalars", () => {
    expect(parseJson("42")).toEqual({ ok: true, value: 42 });
    expect(parseJson("null")).toEqual({ ok: true, value: null });
  });

  it("reports line and column for a syntax error", () => {
    const result = parseJson('{\n  "a": 1,\n  "b": bad\n}');
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.line).toBe(3);
    expect(result.error.column).toBeGreaterThan(1);
  });

  it("points at line 1 for a first-line error", () => {
    const result = parseJson("{bad}");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.line).toBe(1);
  });

  it("gives empty input its own message", () => {
    const result = parseJson("   ");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error.message).toMatch(/empty/i);
  });

  it("never throws, whatever it is handed", () => {
    for (const input of ["", "[", "{", '{"a"', " ", "[1,]"]) {
      expect(() => parseJson(input)).not.toThrow();
    }
  });
});
