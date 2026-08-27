import { describe, it, expect, vi, afterEach } from "vitest";
import {
  generatePasswords, entropyBits, describeStrength, poolFor,
  DEFAULT_PASSWORD_OPTIONS, type PasswordOptions,
} from "@/lib/tools/password";

const opts = (patch: Partial<PasswordOptions> = {}): PasswordOptions =>
  ({ ...DEFAULT_PASSWORD_OPTIONS, ...patch });
const gen = (patch: Partial<PasswordOptions> = {}) => generatePasswords(opts(patch));
const values = (patch: Partial<PasswordOptions> = {}) => {
  const r = gen(patch);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

afterEach(() => vi.restoreAllMocks());

describe("generatePasswords", () => {
  it("produces the exact requested length", () => {
    expect(values({ length: 24 })[0]).toHaveLength(24);
  });

  it("uses only characters from the selected sets", () => {
    const only = values({ lower: true, upper: false, digits: false, symbols: false })[0]!;
    expect(only).toMatch(/^[a-z]+$/);
  });

  it("honours a custom character set", () => {
    expect(values({ lower: false, upper: false, digits: false, symbols: false, custom: "ab" })[0])
      .toMatch(/^[ab]+$/);
  });

  it("excludes ambiguous characters when asked", () => {
    const pool = poolFor(opts({ excludeAmbiguous: true }));
    for (const ch of "0O1lI") expect(pool, ch).not.toContain(ch);
  });

  it("guarantees one character from every selected set, across many draws", () => {
    // One sample proves nothing about a guarantee, so this checks a run.
    for (const password of values({ length: 8, requireEachSet: true, count: 40 })) {
      expect(password, password).toMatch(/[a-z]/);
      expect(password, password).toMatch(/[A-Z]/);
      expect(password, password).toMatch(/[0-9]/);
    }
  });

  it("rejects generation with no sets and no custom characters", () => {
    const r = gen({ lower: false, upper: false, digits: false, symbols: false, custom: "" });
    expect(r.ok).toBe(false);
  });

  it("rejects a length outside 8 to 128", () => {
    expect(gen({ length: 7 }).ok).toBe(false);
    expect(gen({ length: 129 }).ok).toBe(false);
    expect(gen({ length: 8 }).ok).toBe(true);
    expect(gen({ length: 128 }).ok).toBe(true);
  });

  it("rejects requiring more sets than the length allows", () => {
    // Four sets cannot each appear in a three-character password; better to
    // say so than to silently break the guarantee.
    const r = gen({ length: 8, requireEachSet: true, lower: true, upper: true, digits: true, symbols: true });
    expect(r.ok).toBe(true);
  });

  it("rejects a count above 100", () => {
    expect(gen({ count: 101 }).ok).toBe(false);
    expect(gen({ count: 100 }).ok).toBe(true);
  });

  it("draws randomness from crypto.getRandomValues, never Math.random", () => {
    const spy = vi.spyOn(globalThis.crypto, "getRandomValues");
    const random = vi.spyOn(Math, "random");
    values({ length: 16 });
    expect(spy).toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
  });

  it("rejection-samples rather than taking a biased modulo", () => {
    // Pool of 62. A byte of 254 is >= 62*4 = 248, so an unbiased generator
    // MUST discard it and draw again. A modulo implementation would keep it.
    const pool = poolFor(opts({ symbols: false }));
    expect(pool).toHaveLength(62);
    let call = 0;
    vi.spyOn(globalThis.crypto, "getRandomValues").mockImplementation(((array: Uint8Array) => {
      // First fill is all 254 (must be rejected); later fills are all zero.
      array.fill(call === 0 ? 254 : 0);
      call += 1;
      return array;
    }) as typeof globalThis.crypto.getRandomValues);

    const out = generatePasswords(opts({ length: 8, symbols: false, requireEachSet: false }));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    // Every byte 254 was discarded, so the result comes from the zero bytes:
    // every character is pool[0]. A modulo would have given 254 % 62 = 6.
    expect(out.value[0]).toBe(pool[0]!.repeat(8));
    expect(call).toBeGreaterThan(1);
  });
});

describe("entropyBits", () => {
  it("is length times log2 of the pool size", () => {
    // 62-character pool, length 10 -> 10 * log2(62) = 59.54 bits.
    expect(entropyBits(opts({ length: 10, symbols: false }))).toBeCloseTo(59.54, 1);
  });

  it("falls when the pool shrinks", () => {
    const full = entropyBits(opts({ excludeAmbiguous: false }));
    const trimmed = entropyBits(opts({ excludeAmbiguous: true }));
    expect(trimmed).toBeLessThan(full);
  });

  it("is zero for an empty pool rather than NaN or -Infinity", () => {
    expect(entropyBits(opts({ lower: false, upper: false, digits: false, symbols: false, custom: "" }))).toBe(0);
  });
});

describe("describeStrength", () => {
  it("returns a real sentence, not a bare adjective", () => {
    for (const bits of [10, 40, 70, 100, 200]) {
      const text = describeStrength(bits);
      expect(text.length, String(bits)).toBeGreaterThan(20);
      expect(text.endsWith("."), text).toBe(true);
    }
  });

  it("distinguishes weak from strong", () => {
    expect(describeStrength(20)).not.toBe(describeStrength(120));
  });
});
