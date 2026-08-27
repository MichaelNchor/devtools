import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

function tokensIn(block: string): string[] {
  return [...block.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((m) => m[1]!).sort();
}

function blockFor(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `${selector} block not found`).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("\n}", start));
}

describe("theme tokens", () => {
  const css = readFileSync(path.resolve(__dirname, "../app/globals.css"), "utf8");

  it("defines every :root token in .dark as well", () => {
    const light = new Set(tokensIn(blockFor(css, ":root")));
    const dark = new Set(tokensIn(blockFor(css, ".dark")));
    // --ease-* live in a second :root block that carries no themed values.
    const missing = [...light].filter((t) => !dark.has(t) && !t.startsWith("--ease"));
    expect(missing).toEqual([]);
  });

  it("uses no pure black or pure white as a surface", () => {
    expect(css).not.toMatch(/--bg:\s*#(000000|fff|ffffff)\b/i);
  });
});
