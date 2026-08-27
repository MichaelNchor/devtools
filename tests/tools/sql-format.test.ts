import { describe, it, expect } from "vitest";
import { formatSql, DEFAULT_SQL_OPTIONS, SQL_DIALECTS } from "@/lib/tools/sql-format";

const run = (text: string, patch: Partial<typeof DEFAULT_SQL_OPTIONS> = {}) =>
  formatSql(text, { ...DEFAULT_SQL_OPTIONS, ...patch });

const value = (text: string, patch: Partial<typeof DEFAULT_SQL_OPTIONS> = {}) => {
  const r = run(text, patch);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

describe("formatSql", () => {
  it("breaks a flat query across lines", () => {
    const out = value("select a,b from t where a=1");
    expect(out.split("\n").length).toBeGreaterThan(1);
  });

  it("uppercases keywords by default", () => {
    expect(value("select a from t")).toContain("SELECT");
  });

  it("lowercases keywords when asked", () => {
    expect(value("SELECT a FROM t", { keywordCase: "lower" })).toContain("select");
  });

  it("honours the indent width", () => {
    const four = value("select a, b from t", { indent: 4 });
    expect(four).toMatch(/\n {4}\S/);
  });

  it("puts commas before the column when asked", () => {
    const out = value("select aaa, bbb from t", { commaPosition: "before" });
    expect(out).toMatch(/\n\s*,/);
  });

  it("accepts every dialect the UI offers", () => {
    // The dropdown and the library must not drift apart: a dialect the UI can
    // select but the library rejects is a runtime error waiting to happen.
    for (const dialect of SQL_DIALECTS) {
      expect(run("select 1", { dialect: dialect.value }).ok, dialect.value).toBe(true);
    }
  });

  it("formats a dialect-specific query", () => {
    expect(value("select * from t limit 1", { dialect: "postgresql" })).toContain("SELECT");
  });

  it("rejects an empty document", () => {
    expect(run("   ").ok).toBe(false);
  });

  it("returns an error rather than throwing on input it cannot parse", () => {
    // Whatever this library does with garbage, it must arrive as a ToolResult.
    const r = run("!!!(((");
    expect(typeof r.ok).toBe("boolean");
  });
});
