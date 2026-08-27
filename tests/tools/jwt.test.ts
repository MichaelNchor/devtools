import { describe, it, expect } from "vitest";
import { decodeJwt, describeTimeClaims, verifyJwt } from "@/lib/tools/jwt";

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
