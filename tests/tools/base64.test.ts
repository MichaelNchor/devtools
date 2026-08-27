import { describe, it, expect } from "vitest";
import {
  encodeBase64, decodeBase64, bytesToHex, toDataUri, DEFAULT_BASE64_OPTIONS,
} from "@/lib/tools/base64";

const opts = (patch: Partial<typeof DEFAULT_BASE64_OPTIONS> = {}) => ({ ...DEFAULT_BASE64_OPTIONS, ...patch });

const enc = (text: string, patch = {}) => {
  const r = encodeBase64(text, opts(patch));
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

describe("encodeBase64", () => {
  it("encodes ASCII", () => {
    expect(enc("hello")).toBe("aGVsbG8=");
  });

  it("encodes multi-byte UTF-8 that btoa would reject", () => {
    // btoa("café") throws InvalidCharacterError. Going through TextEncoder is
    // the whole point of this tool having a transform at all.
    expect(enc("café")).toBe("Y2Fmw6k=");
  });

  it("encodes emoji outside the basic plane", () => {
    expect(enc("🙂")).toBe("8J+Zgg==");
  });

  it("drops padding when asked", () => {
    expect(enc("hello", { padding: false })).toBe("aGVsbG8");
  });

  it("uses the URL-safe alphabet when asked", () => {
    // Bytes chosen to produce both + and / in the standard alphabet.
    const standard = enc("ûÿ¾");
    expect(standard).toContain("+");
    const urlSafe = enc("ûÿ¾", { urlSafe: true });
    expect(urlSafe).not.toContain("+");
    expect(urlSafe).not.toContain("/");
  });

  it("encodes the empty string as the empty string", () => {
    expect(enc("")).toBe("");
  });
});

describe("decodeBase64", () => {
  const dec = (text: string, patch = {}) => decodeBase64(text, opts(patch));

  it("round-trips ASCII", () => {
    const r = dec("aGVsbG8=");
    expect(r.ok && r.value.text).toBe("hello");
  });

  it("round-trips multi-byte UTF-8", () => {
    const r = dec("Y2Fmw6k=");
    expect(r.ok && r.value.text).toBe("café");
  });

  it("accepts input with no padding", () => {
    const r = dec("aGVsbG8");
    expect(r.ok && r.value.text).toBe("hello");
  });

  it("accepts the URL-safe alphabet regardless of the toggle", () => {
    // A pasted URL-safe token should decode without the user first flipping a
    // switch — the alphabet is detectable from the characters themselves.
    const r = dec("8J-Zgg==");
    expect(r.ok && r.value.text).toBe("🙂");
  });

  it("ignores surrounding whitespace and newlines", () => {
    const r = dec("aGVs\nbG8=\n");
    expect(r.ok && r.value.text).toBe("hello");
  });

  it("reports the position of an invalid character", () => {
    const r = dec("aGV$bG8=");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.column).toBe(4);
    expect(r.error.message).toContain("$");
  });

  it("rejects a length that cannot be base64", () => {
    expect(dec("a").ok).toBe(false);
  });

  it("returns null text but real bytes for data that is not UTF-8", () => {
    // 0xFF is never a valid UTF-8 lead byte. The bytes still decoded fine, so
    // the tool offers a hex view rather than claiming the input was bad.
    const r = dec("/w==");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.text).toBeNull();
    expect(Array.from(r.value.bytes)).toEqual([255]);
  });

  it("decodes the empty string to empty bytes", () => {
    const r = dec("");
    expect(r.ok && r.value.text).toBe("");
  });
});

describe("helpers", () => {
  it("renders bytes as spaced uppercase hex", () => {
    expect(bytesToHex(new Uint8Array([0, 15, 255]))).toBe("00 0F FF");
  });

  it("builds a data URI", () => {
    expect(toDataUri("aGk=", "text/plain")).toBe("data:text/plain;base64,aGk=");
  });
});
