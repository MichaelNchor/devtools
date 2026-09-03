import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

function tokensIn(block: string): string[] {
  // Matches anywhere on a line, NOT just at line start. The status families
  // are written three tokens to a line, and a line-anchored regex drops all
  // eight of them from BOTH sets — which makes the parity assertion below
  // pass even when one side is missing a token entirely.
  return [...block.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]!).sort();
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

  it("sees tokens packed several to a line", () => {
    // Without this, a line-anchored regex in tokensIn() would silently exclude
    // the status families from the parity check and nothing would notice.
    const light = tokensIn(blockFor(css, ":root"));
    expect(light).toContain("--up-tint");
    expect(light).toContain("--warn");
    expect(light.length).toBeGreaterThanOrEqual(49);
  });

  it("separates the canvas from the card by value", () => {
    // The card IS deliberately pure white — ported verbatim, and job-copilot's
    // own note explains the choice: cards sit on a tinted canvas and are lifted
    // by a blue-grey shadow. What must never happen is the canvas matching the
    // card, because then nothing separates a card from the page.
    const light = blockFor(css, ":root");
    const bg = /--bg:\s*(#[0-9a-f]{6})/i.exec(light)?.[1]?.toUpperCase();
    const surface = /--surface:\s*(#[0-9a-f]{6})/i.exec(light)?.[1]?.toUpperCase();
    expect(surface).not.toBe("#FFFFFF");
    expect(surface).not.toBe("#000000");
    expect(bg).not.toBe(surface);
    expect(bg).not.toBe("#000000");
    expect(bg).not.toBe("#FFFFFF");
  });
});
