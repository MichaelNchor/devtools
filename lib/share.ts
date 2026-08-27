/**
 * Tool state encoded into the URL hash, so a link can carry a payload.
 *
 * Two deliberate limits:
 *   - Only tools with `handlesSecrets: false` may call this. A share button on
 *     the JWT or Hash tool is an invitation to leak a token.
 *   - Over SHARE_LIMIT characters we return null and the caller disables the
 *     button. Long URLs are truncated unpredictably by mail clients and chat
 *     apps, and silently producing a broken link is worse than refusing.
 */

export const SHARE_LIMIT = 8192;
export const SHARE_PREFIX = "#s=";

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(payload: string): Uint8Array {
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export function encodeShare(state: unknown): string | null {
  try {
    const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(state)));
    return payload.length > SHARE_LIMIT ? null : payload;
  } catch {
    return null;
  }
}

export function decodeShare<T>(payload: string): T | null {
  if (!payload) return null;
  try {
    return JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as T;
  } catch {
    // A hand-edited or clipped link. Opening the tool empty beats an error.
    return null;
  }
}

export function readShareFromHash<T>(hash: string): T | null {
  if (!hash.startsWith(SHARE_PREFIX)) return null;
  return decodeShare<T>(hash.slice(SHARE_PREFIX.length));
}
