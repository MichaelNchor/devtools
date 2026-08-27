import { err, ok, type ToolResult } from "@/lib/types";

function positionToLineColumn(text: string, position: number): { line: number; column: number } {
  const upTo = text.slice(0, Math.max(0, Math.min(position, text.length)));
  const lines = upTo.split("\n");
  return { line: lines.length, column: (lines[lines.length - 1]?.length ?? 0) + 1 };
}

/**
 * Fallback locator for engine messages that carry no "position N" fragment.
 * V8 has moved that fragment around between releases — some releases omit it
 * for tokenizer-level "Unexpected token" errors while keeping it for
 * parser-level "Expected ..." errors. Rather than depend on message wording
 * we don't control, walk the text ourselves and find the first character
 * that cannot start a valid JSON token. If every token up to the end is
 * well-formed (a genuinely truncated document), this falls off the end and
 * returns `text.length`, which is exactly where a truncation error belongs.
 */
function findInvalidTokenOffset(text: string): number {
  const length = text.length;
  let i = 0;
  while (i < length) {
    const ch = text[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") { i += 1; continue; }
    if (ch === "{" || ch === "}" || ch === "[" || ch === "]" || ch === ":" || ch === ",") {
      i += 1;
      continue;
    }
    if (ch === '"') {
      i += 1;
      while (i < length) {
        const stringChar = text[i];
        if (stringChar === "\\") { i += 2; continue; }
        i += 1;
        if (stringChar === '"') break;
      }
      continue;
    }
    if (ch === "-" || (ch !== undefined && ch >= "0" && ch <= "9")) {
      i += 1;
      while (i < length && /[0-9.eE+-]/.test(text[i] ?? "")) i += 1;
      continue;
    }
    if (text.startsWith("true", i)) { i += 4; continue; }
    if (text.startsWith("false", i)) { i += 5; continue; }
    if (text.startsWith("null", i)) { i += 4; continue; }
    return i;
  }
  return length;
}

export function parseJson(text: string): ToolResult<unknown> {
  if (text.trim() === "") return err("Input is empty.", { line: 1, column: 1 });

  try {
    return ok(JSON.parse(text) as unknown);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Invalid JSON.";
    const match = /position (\d+)/.exec(message);
    if (!match) {
      // No position in the message: locate the offending token ourselves.
      // For a genuinely truncated document this walks off the end and lands
      // on `text.length`, the same place the parser gave up.
      return err(message, positionToLineColumn(text, findInvalidTokenOffset(text)));
    }
    // Strip the engine's own position suffix — we render our own, and showing
    // both a character offset and a line number reads as two different errors.
    const clean = message
      .replace(/\s*in JSON at position \d+.*$/, ".")
      .replace(/\s*\(line \d+ column \d+\)/, "");
    return err(clean, positionToLineColumn(text, Number(match[1])));
  }
}
