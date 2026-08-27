import { describe, it, expect } from "vitest";
import { generateGuids, GUID_NAMESPACES, DEFAULT_GUID_OPTIONS, type GuidOptions } from "@/lib/tools/guid";

const gen = (patch: Partial<GuidOptions> = {}) =>
  generateGuids({ ...DEFAULT_GUID_OPTIONS, ...patch });
const values = (patch: Partial<GuidOptions> = {}) => {
  const r = gen(patch);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

const RFC = (version: string) =>
  new RegExp(`^[0-9a-f]{8}-[0-9a-f]{4}-${version}[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`);

describe("generateGuids", () => {
  it("emits a v4 with the right version nibble and RFC 4122 variant bits", () => {
    expect(values({ version: "v4" })[0]).toMatch(RFC("4"));
  });

  it("emits a v7 whose leading bits are a sortable timestamp", () => {
    // v7's first 48 bits are a big-endian millisecond timestamp, so GUIDs
    // generated in order must sort lexicographically in that same order.
    const batch = values({ version: "v7", count: 20 });
    expect(batch[0]).toMatch(RFC("7"));
    expect([...batch].sort()).toEqual(batch);
  });

  it("emits a v1", () => {
    expect(values({ version: "v1" })[0]).toMatch(RFC("1"));
  });

  it("returns the requested count, all distinct", () => {
    const batch = values({ version: "v4", count: 10 });
    expect(batch).toHaveLength(10);
    expect(new Set(batch).size).toBe(10);
  });

  it("rejects a count outside 1 to 1000", () => {
    expect(gen({ count: 0 }).ok).toBe(false);
    expect(gen({ count: 1001 }).ok).toBe(false);
    expect(gen({ count: 1000 }).ok).toBe(true);
  });

  it("applies uppercase, braces and hyphen removal, and composes them", () => {
    expect(values({ uppercase: true })[0]).toMatch(/^[0-9A-F-]+$/);
    expect(values({ braces: true })[0]).toMatch(/^\{.*\}$/);
    expect(values({ hyphens: false })[0]).not.toContain("-");
    const all = values({ uppercase: true, braces: true, hyphens: false })[0]!;
    expect(all).toMatch(/^\{[0-9A-F]{32}\}$/);
  });

  it("is deterministic for v5 with the same namespace and name", () => {
    const opts = { version: "v5" as const, namespace: GUID_NAMESPACES[0]!.value, name: "example.com" };
    expect(values(opts)[0]).toBe(values(opts)[0]);
  });

  it("gives different v5 values for different names", () => {
    const base = { version: "v5" as const, namespace: GUID_NAMESPACES[0]!.value };
    expect(values({ ...base, name: "a" })[0]).not.toBe(values({ ...base, name: "b" })[0]);
  });

  it("rejects an invalid namespace UUID rather than throwing", () => {
    const r = gen({ version: "v5", namespace: "not-a-uuid", name: "x" });
    expect(r.ok).toBe(false);
  });

  it("rejects v5 with an empty name", () => {
    expect(gen({ version: "v5", namespace: GUID_NAMESPACES[0]!.value, name: "" }).ok).toBe(false);
  });

  it("ships the four standard namespaces", () => {
    const labels = GUID_NAMESPACES.map((n) => n.label.toLowerCase()).join(" ");
    for (const wanted of ["dns", "url", "oid", "x500"]) expect(labels).toContain(wanted);
  });

  it("sets correct variant bits on every version", () => {
    for (const version of ["v1", "v4", "v5", "v7"] as const) {
      const guid = values({ version, namespace: GUID_NAMESPACES[0]!.value, name: "x" })[0]!;
      expect(guid[19], version).toMatch(/[89ab]/);
    }
  });
});
