import { err, ok, type ToolResult } from "@/lib/types";

export interface JwtParts {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  /** Base64url, exactly as it appeared. */
  signature: string;
  /** "<header>.<payload>" — the bytes a signature actually covers. */
  signingInput: string;
}

/**
 * Three states, never two. "not-verified" means we did not or could not
 * check; it is NOT a synonym for "invalid", and conflating them would tell a
 * user their good token is broken.
 */
export type VerifyState = "valid" | "invalid" | "not-verified";

export interface ClaimTime {
  claim: string;
  at: Date;
  relative: string;
  state: "ok" | "expired" | "not-yet-valid";
}

function base64UrlToBytes(segment: string): Uint8Array {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/")
    .padEnd(segment.length + ((4 - (segment.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeSegment(segment: string, label: string): ToolResult<Record<string, unknown>> {
  try {
    // Bytes then UTF-8: atob alone mangles any multi-byte claim value.
    const text = new TextDecoder("utf-8", { fatal: true }).decode(base64UrlToBytes(segment));
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return err(`The ${label} is not a JSON object.`);
    }
    return ok(parsed as Record<string, unknown>);
  } catch {
    return err(`The ${label} is not valid base64url-encoded JSON.`);
  }
}

export function decodeJwt(token: string): ToolResult<JwtParts> {
  const trimmed = token.trim();
  if (!trimmed) return err("Paste a token.");

  const segments = trimmed.split(".");
  if (segments.length !== 3) {
    return err(`A JWT has three dot-separated segments; this has ${segments.length}.`);
  }

  const [headerSegment, payloadSegment, signature] = segments as [string, string, string];
  const header = decodeSegment(headerSegment, "header");
  if (!header.ok) return header;
  const payload = decodeSegment(payloadSegment, "payload");
  if (!payload.ok) return payload;

  return ok({
    header: header.value,
    payload: payload.value,
    signature,
    signingInput: `${headerSegment}.${payloadSegment}`,
  });
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000_000], ["month", 2_592_000_000], ["day", 86_400_000],
  ["hour", 3_600_000], ["minute", 60_000], ["second", 1000],
];

function relative(target: number, now: number): string {
  const delta = target - now;
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(delta) >= size) return formatter.format(Math.round(delta / size), unit);
  }
  return formatter.format(0, "second");
}

export function describeTimeClaims(
  payload: Record<string, unknown>,
  now: number = Date.now(),
): ClaimTime[] {
  const out: ClaimTime[] = [];
  for (const claim of ["iat", "nbf", "exp"]) {
    const raw = payload[claim];
    // A non-numeric claim is skipped rather than rendered as Invalid Date.
    if (typeof raw !== "number" || !Number.isFinite(raw)) continue;
    const at = new Date(raw * 1000);
    const state: ClaimTime["state"] =
      claim === "exp" && at.getTime() < now ? "expired"
        : claim === "nbf" && at.getTime() > now ? "not-yet-valid"
          : "ok";
    out.push({ claim, at, relative: relative(at.getTime(), now), state });
  }
  return out;
}

const HMAC_HASH: Record<string, string> = { HS256: "SHA-256", HS384: "SHA-384", HS512: "SHA-512" };

export async function verifyJwt(token: string, key: string): Promise<ToolResult<VerifyState>> {
  const decoded = decodeJwt(token);
  if (!decoded.ok) return decoded;

  const alg = String(decoded.value.header.alg ?? "");

  // alg: "none" is a known forgery vector. There is no key that makes it
  // valid, so this tool refuses to say so under any circumstances.
  if (alg.toLowerCase() === "none") {
    return ok("not-verified");
  }
  if (!key) return ok("not-verified");

  const hash = HMAC_HASH[alg.toUpperCase()];
  if (!hash) {
    // Asymmetric algorithms need a public key in JWK or PEM, which the UI
    // collects separately; anything else we simply cannot check.
    return ok("not-verified");
  }

  try {
    const imported = await globalThis.crypto.subtle.importKey(
      "raw", new TextEncoder().encode(key),
      { name: "HMAC", hash }, false, ["verify"],
    );
    const valid = await globalThis.crypto.subtle.verify(
      "HMAC", imported,
      base64UrlToBytes(decoded.value.signature) as BufferSource,
      new TextEncoder().encode(decoded.value.signingInput),
    );
    return ok(valid ? "valid" : "invalid");
  } catch {
    return ok("not-verified");
  }
}
