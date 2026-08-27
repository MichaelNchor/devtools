/**
 * Every read and write is guarded. Private-mode browsers and browsers with
 * site data blocked throw on access rather than returning null, and an
 * unguarded read in a component body takes the whole render down with it.
 *
 * Nothing here reaches the network. This module is the only place in the app
 * that touches localStorage.
 */

export const KEYS = {
  // Bare, not namespaced: the blocking script in app/layout.tsx reads this
  // before any bundle has loaded and cannot import from here.
  theme: "theme",
  favourites: "devtools:favourites",
  recents: "devtools:recents",
  rail: "devtools:rail",
  tool: (slug: string) => `devtools:tool:${slug}`,
} as const;

function store(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = store()?.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    // Malformed JSON, a blocked store, or a getter that throws. A stale or
    // corrupt value is never worth a crash — the caller gets its default.
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    store()?.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or writes blocked. Persistence is a convenience here,
    // never a correctness requirement, so failing silently is correct.
  }
}

export function remove(key: string): void {
  try {
    store()?.removeItem(key);
  } catch {
    // See writeJson.
  }
}
