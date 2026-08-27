import { err, ok, type ToolResult } from "@/lib/types";

export interface Base64Options {
  urlSafe: boolean;
  padding: boolean;
}

export const DEFAULT_BASE64_OPTIONS: Base64Options = { urlSafe: false, padding: true };

const STANDARD = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function bytesToBase64(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    const triple = (a << 16) | ((b ?? 0) << 8) | (c ?? 0);
    out += STANDARD[(triple >> 18) & 63]! + STANDARD[(triple >> 12) & 63]!;
    out += b === undefined ? "=" : STANDARD[(triple >> 6) & 63]!;
    out += c === undefined ? "=" : STANDARD[triple & 63]!;
  }
  return out;
}

export function encodeBase64(text: string, options: Base64Options): ToolResult<string> {
  // TextEncoder, never btoa: btoa throws on any code point above U+00FF, so
  // "café" and every emoji would fail.
  let encoded = bytesToBase64(new TextEncoder().encode(text));
  if (options.urlSafe) encoded = encoded.replace(/\+/g, "-").replace(/\//g, "_");
  if (!options.padding) encoded = encoded.replace(/=+$/, "");
  return ok(encoded);
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
}

export function toDataUri(base64: string, mime: string): string {
  return `data:${mime};base64,${base64}`;
}

export function decodeBase64(
  text: string,
  _options: Base64Options,
): ToolResult<{ text: string | null; bytes: Uint8Array }> {
  // Whitespace is stripped because base64 is routinely wrapped at 64 or 76
  // columns, and a pasted PEM body would otherwise look invalid.
  const stripped = text.replace(/\s+/g, "");
  // Both alphabets are accepted on input regardless of the toggle: a token
  // pasted from a URL should just decode.
  const normalised = stripped.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "");

  const badIndex = normalised.split("").findIndex((ch) => !STANDARD.includes(ch));
  if (badIndex !== -1) {
    return err(
      `"${normalised[badIndex]}" is not a base64 character.`,
      { line: 1, column: badIndex + 1 },
    );
  }
  if (normalised.length % 4 === 1) {
    return err("This is not a valid base64 length — one character is left over.");
  }

  const bytes = new Uint8Array(Math.floor((normalised.length * 3) / 4));
  let byteIndex = 0;
  for (let i = 0; i < normalised.length; i += 4) {
    const chunk = [0, 1, 2, 3].map((offset) => {
      const ch = normalised[i + offset];
      return ch === undefined ? -1 : STANDARD.indexOf(ch);
    });
    const triple = (chunk[0]! << 18) | (chunk[1]! << 12)
      | (Math.max(chunk[2]!, 0) << 6) | Math.max(chunk[3]!, 0);
    if (byteIndex < bytes.length) bytes[byteIndex++] = (triple >> 16) & 255;
    if (chunk[2] !== -1 && byteIndex < bytes.length) bytes[byteIndex++] = (triple >> 8) & 255;
    if (chunk[3] !== -1 && byteIndex < bytes.length) bytes[byteIndex++] = triple & 255;
  }

  // fatal: true makes the decoder throw on invalid UTF-8 instead of silently
  // substituting U+FFFD, which is how we learn to offer the hex view.
  let decoded: string | null;
  try {
    decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    decoded = null;
  }

  return ok({ text: decoded, bytes });
}
