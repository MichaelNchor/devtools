import { describe, it, expect } from "vitest";
import {
  decodeJwt, describeTimeClaims, verifyJwt, signJwt, signJwtWithHeader, SIGNING_ALGORITHMS,
  epochToLocalInput, localInputToEpoch, withTimeClaim, removeTimeClaim,
  TIME_CLAIMS, TIME_PRESETS,
} from "@/lib/tools/jwt";

const b64url = (obj: unknown) =>
  Buffer.from(JSON.stringify(obj)).toString("base64url");
const token = (header: unknown, payload: unknown, signature = "sig") =>
  `${b64url(header)}.${b64url(payload)}.${signature}`;

/** Signs with WebCrypto so no real secret is ever committed to the repo. */
async function signHs256(payload: object, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const input = `${b64url(header)}.${b64url(payload)}`;
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  return `${input}.${Buffer.from(new Uint8Array(mac)).toString("base64url")}`;
}

describe("decodeJwt", () => {
  it("splits a well-formed token into header, payload and signature", () => {
    const r = decodeJwt(token({ alg: "HS256", typ: "JWT" }, { sub: "abc" }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.header).toEqual({ alg: "HS256", typ: "JWT" });
    expect(r.value.payload).toEqual({ sub: "abc" });
    expect(r.value.signature).toBe("sig");
  });

  it("decodes a payload containing multi-byte UTF-8", () => {
    // atob would mangle this; base64url then UTF-8 decoding is required.
    const r = decodeJwt(token({ alg: "HS256" }, { name: "café 🙂" }));
    expect(r.ok && r.value.payload.name).toBe("café 🙂");
  });

  it("still decodes when the signature is garbage", () => {
    // Decoding is not verification. Refusing here would hide the claims the
    // user is trying to read.
    expect(decodeJwt(token({ alg: "HS256" }, { a: 1 }, "!!!not-a-signature")).ok).toBe(true);
  });

  it("rejects a token without three segments", () => {
    expect(decodeJwt("only.two").ok).toBe(false);
    expect(decodeJwt("a.b.c.d").ok).toBe(false);
  });

  it("names which segment failed to decode", () => {
    const r = decodeJwt(`###.${b64url({ a: 1 })}.sig`);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message.toLowerCase()).toContain("header");
  });

  it("rejects an empty token", () => {
    expect(decodeJwt("").ok).toBe(false);
  });

  it("exposes the signing input, which is what verification signs over", () => {
    const t = token({ alg: "HS256" }, { a: 1 });
    const r = decodeJwt(t);
    expect(r.ok && r.value.signingInput).toBe(t.split(".").slice(0, 2).join("."));
  });
});

describe("describeTimeClaims", () => {
  const now = Date.UTC(2026, 0, 1) / 1000;

  it("marks a past exp as expired", () => {
    const [claim] = describeTimeClaims({ exp: now - 3600 }, now * 1000);
    expect(claim).toMatchObject({ claim: "exp", state: "expired" });
  });

  it("marks a future exp as ok", () => {
    expect(describeTimeClaims({ exp: now + 3600 }, now * 1000)[0]!.state).toBe("ok");
  });

  it("marks a future nbf as not-yet-valid", () => {
    expect(describeTimeClaims({ nbf: now + 3600 }, now * 1000)[0]!.state).toBe("not-yet-valid");
  });

  it("renders iat without ever calling it invalid", () => {
    const [claim] = describeTimeClaims({ iat: now - 99999 }, now * 1000);
    expect(claim).toMatchObject({ claim: "iat", state: "ok" });
  });

  it("returns nothing when there are no time claims, rather than inventing rows", () => {
    expect(describeTimeClaims({ sub: "x" }, now * 1000)).toEqual([]);
  });

  it("ignores a non-numeric time claim instead of rendering an Invalid Date", () => {
    expect(describeTimeClaims({ exp: "soon" }, now * 1000)).toEqual([]);
  });

  it("renders each claim as an absolute time and a relative phrase", () => {
    const [claim] = describeTimeClaims({ exp: now + 3600 }, now * 1000);
    expect(claim!.at.toISOString()).toBe("2026-01-01T01:00:00.000Z");
    expect(claim!.relative.length).toBeGreaterThan(0);
  });
});

describe("verifyJwt", () => {
  it("reports valid for the correct HS256 secret", async () => {
    const t = await signHs256({ sub: "a" }, "topsecret");
    expect(await verifyJwt(t, "topsecret")).toMatchObject({ ok: true, value: "valid" });
  });

  it("reports invalid for the wrong secret", async () => {
    const t = await signHs256({ sub: "a" }, "topsecret");
    expect(await verifyJwt(t, "wrong")).toMatchObject({ ok: true, value: "invalid" });
  });

  it("reports not-verified with no key, never invalid", async () => {
    // "We did not check" and "it failed" are different answers, and conflating
    // them would let a user believe a good token is broken.
    const t = await signHs256({ sub: "a" }, "topsecret");
    expect(await verifyJwt(t, "")).toMatchObject({ ok: true, value: "not-verified" });
  });

  it("reports not-verified for an unsupported algorithm, naming it", async () => {
    const r = await verifyJwt(token({ alg: "XYZ999" }, { a: 1 }), "k");
    expect(r.ok && r.value).toBe("not-verified");
  });

  it("NEVER reports valid for alg none", async () => {
    // The classic JWT attack. The tool must not endorse it under any key.
    for (const alg of ["none", "None", "NONE"]) {
      const r = await verifyJwt(`${b64url({ alg })}.${b64url({ a: 1 })}.`, "anything");
      expect(r.ok && r.value, alg).toBe("not-verified");
    }
  });

  it("reports invalid for a tampered payload under the right secret", async () => {
    const t = await signHs256({ sub: "a" }, "topsecret");
    const [h, , s] = t.split(".");
    const tampered = `${h}.${b64url({ sub: "admin" })}.${s}`;
    expect(await verifyJwt(tampered, "topsecret")).toMatchObject({ ok: true, value: "invalid" });
  });
});

describe("signJwt", () => {
  const payload = { sub: "ada", name: "Ada Lovelace" };

  it("produces a token that verifies against the same secret", async () => {
    const signed = await signJwt("HS256", payload, "topsecret");
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;
    expect(await verifyJwt(signed.value, "topsecret")).toMatchObject({ ok: true, value: "valid" });
  });

  it("produces a token that fails against a different secret", async () => {
    const signed = await signJwt("HS256", payload, "topsecret");
    if (!signed.ok) return;
    expect(await verifyJwt(signed.value, "wrong")).toMatchObject({ ok: true, value: "invalid" });
  });

  it("round-trips: what it signs is what decodeJwt reads back", async () => {
    const signed = await signJwt("HS256", payload, "k");
    if (!signed.ok) return;
    const decoded = decodeJwt(signed.value);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) return;
    expect(decoded.value.payload).toEqual(payload);
    expect(decoded.value.header).toEqual({ alg: "HS256", typ: "JWT" });
  });

  it("signs with each supported algorithm, and each verifies", async () => {
    for (const alg of SIGNING_ALGORITHMS) {
      const signed = await signJwt(alg, payload, "k");
      expect(signed.ok, alg).toBe(true);
      if (!signed.ok) continue;
      expect((await verifyJwt(signed.value, "k")), alg).toMatchObject({ value: "valid" });
    }
  });

  it("produces different signatures for different algorithms", async () => {
    const a = await signJwt("HS256", payload, "k");
    const b = await signJwt("HS512", payload, "k");
    if (!a.ok || !b.ok) return;
    expect(a.value).not.toBe(b.value);
  });

  it("emits base64url with no padding, as the spec requires", async () => {
    const signed = await signJwt("HS256", { a: "?".repeat(10) }, "k");
    if (!signed.ok) return;
    expect(signed.value).not.toContain("=");
    expect(signed.value).not.toContain("+");
    expect(signed.value).not.toContain("/");
  });

  it("survives multi-byte claim values", async () => {
    const signed = await signJwt("HS256", { name: "café 🙂" }, "k");
    if (!signed.ok) return;
    const decoded = decodeJwt(signed.value);
    expect(decoded.ok && decoded.value.payload.name).toBe("café 🙂");
  });

  it("refuses to sign without a secret", async () => {
    // An unsigned token is not a signed one, and pretending otherwise is the
    // exact confusion this tool exists to prevent.
    expect((await signJwt("HS256", payload, "")).ok).toBe(false);
  });

  it("refuses a payload that is not a JSON object", async () => {
    expect((await signJwt("HS256", [1, 2] as unknown as Record<string, unknown>, "k")).ok).toBe(false);
  });

  it("offers only the algorithms it can actually sign", async () => {
    // No RS or ES here: those need a private key, not a shared secret, and
    // listing them would promise something the tool cannot do.
    expect(SIGNING_ALGORITHMS).toEqual(["HS256", "HS384", "HS512"]);
  });
});

describe("signJwtWithHeader", () => {
  it("keeps other header fields, so a kid survives re-signing", async () => {
    // Dropping a kid would produce a token that looks correct here and is
    // rejected by whatever actually consumes it.
    const signed = await signJwtWithHeader(
      { alg: "HS256", typ: "JWT", kid: "key-2024" }, { sub: "a" }, "k",
    );
    expect(signed.ok).toBe(true);
    if (!signed.ok) return;
    const decoded = decodeJwt(signed.value);
    expect(decoded.ok && decoded.value.header).toEqual({ alg: "HS256", typ: "JWT", kid: "key-2024" });
  });

  it("still verifies with the extra header field present", async () => {
    const signed = await signJwtWithHeader({ alg: "HS256", kid: "x" }, { sub: "a" }, "k");
    if (!signed.ok) return;
    expect(await verifyJwt(signed.value, "k")).toMatchObject({ value: "valid" });
  });

  it("refuses an algorithm it cannot sign, naming it", async () => {
    const out = await signJwtWithHeader({ alg: "RS256" }, { a: 1 }, "k");
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error.message).toContain("RS256");
  });

  it("refuses alg none outright", async () => {
    expect((await signJwtWithHeader({ alg: "none" }, { a: 1 }, "k")).ok).toBe(false);
  });

  it("refuses a header that is not an object", async () => {
    expect((await signJwtWithHeader([] as unknown as Record<string, unknown>, { a: 1 }, "k")).ok).toBe(false);
  });
});

describe("time claim editing", () => {
  it("round-trips an epoch through the picker's format, to the minute", () => {
    // Absolute strings depend on the machine's zone, so this asserts the
    // round trip rather than a literal — the property that actually matters.
    for (const seconds of [0, 1516239022, 1767225600, -86400]) {
      const toMinute = Math.floor(seconds / 60) * 60;
      expect(localInputToEpoch(epochToLocalInput(seconds))).toBe(toMinute);
    }
  });

  it("rejects an unparseable picker value", () => {
    expect(localInputToEpoch("")).toBeNull();
    expect(localInputToEpoch("not a date")).toBeNull();
  });

  it("adds a claim that was not there", () => {
    const out = withTimeClaim('{"sub":"a"}', "exp", 1516242622);
    expect(out.ok && JSON.parse(out.value)).toEqual({ sub: "a", exp: 1516242622 });
  });

  it("replaces a claim that was", () => {
    const out = withTimeClaim('{"exp":1,"sub":"a"}', "exp", 999);
    expect(out.ok && JSON.parse(out.value)).toEqual({ exp: 999, sub: "a" });
  });

  it("leaves every other claim untouched", () => {
    const out = withTimeClaim('{"sub":"a","admin":true,"roles":["x"]}', "iat", 5);
    expect(out.ok && JSON.parse(out.value)).toEqual({
      sub: "a", admin: true, roles: ["x"], iat: 5,
    });
  });

  it("writes whole seconds, never milliseconds or a fraction", () => {
    // A JWT time claim is NumericDate — seconds. Writing milliseconds here
    // would produce a token that looks fine and expires in the year 50000.
    const out = withTimeClaim('{}', "exp", 1516242622.9);
    expect(out.ok && JSON.parse(out.value).exp).toBe(1516242622);
  });

  it("removes a claim", () => {
    const out = removeTimeClaim('{"exp":1,"sub":"a"}', "exp");
    expect(out.ok && JSON.parse(out.value)).toEqual({ sub: "a" });
  });

  it("reports invalid JSON rather than silently rewriting it", () => {
    expect(withTimeClaim("{broken", "exp", 1).ok).toBe(false);
    expect(removeTimeClaim("{broken", "exp").ok).toBe(false);
  });

  it("offers presets that land in the future for exp", () => {
    const now = Math.floor(Date.now() / 1000);
    for (const preset of TIME_PRESETS) {
      if (preset.seconds > 0) expect(now + preset.seconds, preset.label).toBeGreaterThan(now);
    }
    expect(TIME_PRESETS.some((p) => p.seconds === 0)).toBe(true);
  });

  it("names the three registered time claims", () => {
    expect(TIME_CLAIMS).toEqual(["iat", "nbf", "exp"]);
  });
});
