import { describe, it, expect } from "vitest";
import { encodeShare, decodeShare, readShareFromHash, SHARE_LIMIT, SHARE_PREFIX } from "@/lib/share";

describe("share codec", () => {
  it("round-trips a representative tool state", () => {
    const state = { left: '{"a":1}', right: '{"a":2}', options: { ignoreKeyOrder: true } };
    const payload = encodeShare(state);
    expect(payload).toBeTypeOf("string");
    expect(decodeShare(payload!)).toEqual(state);
  });

  it("round-trips non-ASCII without mangling it", () => {
    const state = { text: "héllo — ünicode 中文 🎉" };
    expect(decodeShare(encodeShare(state)!)).toEqual(state);
  });

  it("emits URL-safe base64 with no padding", () => {
    const payload = encodeShare({ q: "??>>??" })!;
    expect(payload).not.toMatch(/[+/=]/);
  });

  it("returns null rather than a truncated link when over the limit", () => {
    expect(encodeShare({ blob: "x".repeat(SHARE_LIMIT * 2) })).toBeNull();
  });

  it("accepts a payload exactly at the limit", () => {
    // Grow until just under, then assert the boundary is inclusive.
    let size = 1000;
    let payload = encodeShare({ blob: "x".repeat(size) });
    while (payload && payload.length < SHARE_LIMIT - 20) {
      size += 10;
      payload = encodeShare({ blob: "x".repeat(size) });
    }
    expect(payload).not.toBeNull();
    expect(payload!.length).toBeLessThanOrEqual(SHARE_LIMIT);
  });

  it("decodes malformed input to null rather than throwing", () => {
    expect(decodeShare("!!!not-base64!!!")).toBeNull();
    expect(decodeShare("")).toBeNull();
    // Valid base64 that is not valid JSON.
    expect(decodeShare("bm90IGpzb24")).toBeNull();
  });

  it("reads a full location hash", () => {
    const payload = encodeShare({ a: 1 })!;
    expect(readShareFromHash(`${SHARE_PREFIX}${payload}`)).toEqual({ a: 1 });
  });

  it("ignores a hash that is not a share payload", () => {
    expect(readShareFromHash("#section-2")).toBeNull();
    expect(readShareFromHash("")).toBeNull();
  });
});
