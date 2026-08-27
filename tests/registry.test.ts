import { describe, it, expect } from "vitest";
import { searchTools, groupTools } from "@/lib/registry/search";
import { TOOLS, allMetas, toolBySlug, GROUP_ORDER } from "@/lib/registry";
import type { ToolMeta } from "@/lib/registry/types";

const FIXTURES: ToolMeta[] = [
  { slug: "json-compare", name: "JSON Compare", blurb: "Diff two JSON documents structurally.", group: "data", icon: (() => null) as never, aliases: ["diff", "delta"], handlesSecrets: false },
  { slug: "jwt", name: "JWT Debugger", blurb: "Decode and verify tokens.", group: "security", icon: (() => null) as never, aliases: ["token", "jsonwebtoken"], handlesSecrets: true },
  { slug: "base64", name: "Base64", blurb: "Encode and decode.", group: "network", icon: (() => null) as never, aliases: ["b64"], handlesSecrets: false },
];

describe("searchTools", () => {
  it("returns everything for an empty query, in input order", () => {
    expect(searchTools(FIXTURES, "").map((t) => t.slug)).toEqual(["json-compare", "jwt", "base64"]);
  });

  it("matches on name, case-insensitively", () => {
    expect(searchTools(FIXTURES, "json com").map((t) => t.slug)).toEqual(["json-compare"]);
  });

  it("matches on an alias", () => {
    expect(searchTools(FIXTURES, "b64").map((t) => t.slug)).toEqual(["base64"]);
  });

  it("matches on slug", () => {
    expect(searchTools(FIXTURES, "jwt").map((t) => t.slug)).toEqual(["jwt"]);
  });

  it("ranks a name prefix above an alias match", () => {
    // "d" prefixes no name; it opens the alias "diff" and the word "Debugger".
    const ranked = searchTools(FIXTURES, "de").map((t) => t.slug);
    expect(ranked[0]).toBe("jwt"); // "Debugger" word-start beats "delta" alias
  });

  it("matches subsequences so 'jsncmp' finds JSON Compare", () => {
    expect(searchTools(FIXTURES, "jsncmp").map((t) => t.slug)).toEqual(["json-compare"]);
  });

  it("returns nothing for a query that matches nothing", () => {
    expect(searchTools(FIXTURES, "zzzzz")).toEqual([]);
  });
});

describe("groupTools", () => {
  it("returns groups in GROUP_ORDER, skipping empty ones", () => {
    const grouped = groupTools(FIXTURES.filter((t) => t.group !== "network"));
    expect(grouped.map((g) => g.group)).toEqual(["security", "data"]);
    expect(grouped[0]!.label).toBe("Security & Identity");
  });

  it("preserves input order within a group", () => {
    const two: ToolMeta[] = [
      { ...FIXTURES[0]!, slug: "a" },
      { ...FIXTURES[0]!, slug: "b" },
    ];
    expect(groupTools(two)[0]!.tools.map((t) => t.slug)).toEqual(["a", "b"]);
  });
});

describe("registry invariants", () => {
  const metas = allMetas();

  it("has unique, kebab-case, permanent slugs", () => {
    const slugs = metas.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("gives every tool a blurb, a valid group, and at least one alias", () => {
    for (const m of metas) {
      expect(m.blurb.length, m.slug).toBeGreaterThan(0);
      expect(GROUP_ORDER, m.slug).toContain(m.group);
      expect(m.aliases.length, m.slug).toBeGreaterThan(0);
      expect(m.aliases.every((a) => a.trim().length > 0), m.slug).toBe(true);
    }
  });

  it("marks exactly the secret-handling tools as handlesSecrets", () => {
    // Grows to ["hash", "jwt", "password"] once Plan 2 lands. Every other
    // tool must be false — this is what gates persistence AND sharing.
    const secrets = metas.filter((m) => m.handlesSecrets).map((m) => m.slug).sort();
    expect(secrets.every((s) => ["hash", "jwt", "password"].includes(s))).toBe(true);
  });

  it("resolves every slug back to its entry", () => {
    for (const m of metas) expect(toolBySlug(m.slug)?.meta.slug).toBe(m.slug);
    expect(toolBySlug("does-not-exist")).toBeUndefined();
  });

  it("has at least one registered tool", () => {
    expect(TOOLS.length).toBeGreaterThan(0);
  });
});
