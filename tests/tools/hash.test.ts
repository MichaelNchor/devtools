import { describe, it, expect } from "vitest";
import {
  hashText, hashBytes, digestsMatch, HASH_ALGORITHMS,
  DEFAULT_HASH_OPTIONS, type HashOptions,
} from "@/lib/tools/hash";

const opts = (patch: Partial<HashOptions> = {}): HashOptions => ({ ...DEFAULT_HASH_OPTIONS, ...patch });
const digest = async (text: string, patch: Partial<HashOptions> = {}) => {
  const r = await hashText(text, opts(patch));
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

// Published vectors. Never invent these — a wrong expectation here would make
// a broken hash look correct.
describe("hashText", () => {
  it("matches the MD5 vector for abc", async () => {
    expect(await digest("abc", { algorithm: "md5" })).toBe("900150983cd24fb0d6963f7d28e17f72");
  });

  it("matches the SHA-1 vector for abc", async () => {
    expect(await digest("abc", { algorithm: "sha1" })).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
  });

  it("matches the SHA-256 vector for abc", async () => {
    expect(await digest("abc", { algorithm: "sha256" }))
      .toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("matches the SHA-512 vector for abc", async () => {
    expect(await digest("abc", { algorithm: "sha512" })).toMatch(/^ddaf35a193617aba/);
  });

  it("matches the SHA-384 vector for abc", async () => {
    expect(await digest("abc", { algorithm: "sha384" })).toMatch(/^cb00753f45a35e8b/);
  });

  it("matches the RIPEMD-160 vector for abc", async () => {
    expect(await digest("abc", { algorithm: "ripemd160" })).toBe("8eb208f7e05d987a9b044a8e98c6b087f15a0bfc");
  });

  it("matches the known empty-input digests", async () => {
    expect(await digest("", { algorithm: "md5" })).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(await digest("", { algorithm: "sha1" })).toBe("da39a3ee5e6b4b0d3255bfef95601890afd80709");
  });

  it("hashes UTF-8 input as its UTF-8 bytes", async () => {
    const viaText = await digest("café");
    const viaBytes = await hashBytes(new TextEncoder().encode("café"), opts());
    expect(viaBytes.ok && viaBytes.value).toBe(viaText);
  });

  it("encodes to base64 that decodes back to the same bytes as the hex form", async () => {
    const hex = await digest("abc");
    const b64 = await digest("abc", { encoding: "base64" });
    const fromB64 = Buffer.from(b64, "base64").toString("hex");
    expect(fromB64).toBe(hex);
  });

  it("matches the HMAC-SHA256 vector", async () => {
    const out = await digest("The quick brown fox jumps over the lazy dog", {
      algorithm: "sha256", hmacKey: "key",
    });
    expect(out).toBe("f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8");
  });

  it("gives a different digest with and without an HMAC key", async () => {
    expect(await digest("abc", { hmacKey: "k" })).not.toBe(await digest("abc"));
  });

  it("offers all six algorithms the spec names, and each produces a digest", async () => {
    expect(HASH_ALGORITHMS).toHaveLength(6);
    for (const algorithm of HASH_ALGORITHMS) {
      expect((await digest("x", { algorithm: algorithm.value })).length, algorithm.value).toBeGreaterThan(0);
    }
  });
});

describe("digestsMatch", () => {
  it("ignores case and surrounding whitespace", () => {
    expect(digestsMatch("ABC123", "  abc123 ")).toBe(true);
  });

  it("rejects a genuine mismatch", () => {
    expect(digestsMatch("abc123", "abc124")).toBe(false);
  });

  it("treats an empty comparison as no match rather than a match", () => {
    expect(digestsMatch("abc", "")).toBe(false);
  });
});
