import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  readFavourites, toggleFavourite, readRecents, recordRecent,
  RECENTS_STORED,
} from "@/lib/workspace";
import { KEYS } from "@/lib/storage";

const KNOWN = ["json-compare", "base64", "jwt"];

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  } as Partial<Storage>;
}

describe("favourites", () => {
  beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("starts empty", () => {
    expect(readFavourites(KNOWN)).toEqual([]);
  });

  it("drops slugs that are no longer registered", () => {
    localStorage.setItem(KEYS.favourites, JSON.stringify(["base64", "removed-tool"]));
    expect(readFavourites(KNOWN)).toEqual(["base64"]);
  });

  it("ignores a stored value that is not an array", () => {
    localStorage.setItem(KEYS.favourites, JSON.stringify({ nope: true }));
    expect(readFavourites(KNOWN)).toEqual([]);
  });

  it("appends on toggle and removes on re-toggle", () => {
    const once = toggleFavourite("jwt", []);
    expect(once).toEqual(["jwt"]);
    expect(toggleFavourite("jwt", once)).toEqual([]);
  });

  it("preserves pin order", () => {
    const list = toggleFavourite("base64", toggleFavourite("jwt", []));
    expect(list).toEqual(["jwt", "base64"]);
  });
});

describe("recents", () => {
  beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("puts the newest visit first", () => {
    let list = recordRecent("jwt", [], 1000);
    list = recordRecent("base64", list, 2000);
    expect(list.map((r) => r.slug)).toEqual(["base64", "jwt"]);
  });

  it("moves a revisited tool to the front rather than duplicating it", () => {
    let list = recordRecent("jwt", [], 1000);
    list = recordRecent("base64", list, 2000);
    list = recordRecent("jwt", list, 3000);
    expect(list.map((r) => r.slug)).toEqual(["jwt", "base64"]);
    expect(list[0]!.at).toBe(3000);
  });

  it(`caps the stored list at ${RECENTS_STORED}`, () => {
    let list: { slug: string; at: number }[] = [];
    for (let i = 0; i < RECENTS_STORED + 5; i += 1) list = recordRecent(`tool-${i}`, list, i);
    expect(list).toHaveLength(RECENTS_STORED);
    expect(list[0]!.slug).toBe(`tool-${RECENTS_STORED + 4}`);
  });

  it("drops unregistered slugs on read", () => {
    localStorage.setItem(KEYS.recents, JSON.stringify([
      { slug: "base64", at: 2 }, { slug: "removed-tool", at: 1 },
    ]));
    expect(readRecents(KNOWN).map((r) => r.slug)).toEqual(["base64"]);
  });

  it("ignores malformed entries", () => {
    localStorage.setItem(KEYS.recents, JSON.stringify(["base64", { at: 1 }, null]));
    expect(readRecents(KNOWN)).toEqual([]);
  });
});
