import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readJson, writeJson, remove, KEYS , removeByPrefix, TOOL_KEY_PREFIX } from "@/lib/storage";

function installStorage(impl: Partial<Storage>) {
  vi.stubGlobal("localStorage", impl as Storage);
}

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  } as Partial<Storage>;
}

describe("storage", () => {
  beforeEach(() => installStorage(memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("round-trips a value", () => {
    writeJson("k", { a: 1 });
    expect(readJson("k", null)).toEqual({ a: 1 });
  });

  it("returns the fallback for a missing key", () => {
    expect(readJson("nope", "default")).toBe("default");
  });

  it("returns the fallback for malformed stored JSON", () => {
    localStorage.setItem("bad", "{not json");
    expect(readJson("bad", 42)).toBe(42);
  });

  it("returns the fallback when localStorage access throws", () => {
    installStorage({
      get getItem(): never { throw new DOMException("blocked"); },
    } as unknown as Partial<Storage>);
    expect(readJson("k", "safe")).toBe("safe");
  });

  it("swallows write failures", () => {
    installStorage({
      getItem: () => null,
      setItem: () => { throw new DOMException("QuotaExceeded"); },
      removeItem: () => {},
    });
    expect(() => writeJson("k", { big: true })).not.toThrow();
  });

  it("does not throw when localStorage is entirely absent", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readJson("k", "safe")).toBe("safe");
    expect(() => writeJson("k", 1)).not.toThrow();
    expect(() => remove("k")).not.toThrow();
  });

  it("namespaces tool keys under devtools:", () => {
    expect(KEYS.tool("json-compare")).toBe("devtools:tool:json-compare");
    expect(KEYS.favourites).toBe("devtools:favourites");
    // The pre-paint script in app/layout.tsx reads a bare `theme`, so this one
    // key must NOT be namespaced.
    expect(KEYS.theme).toBe("theme");
  });


  it("removes only the keys under a prefix, leaving everything else", () => {
    // Settings clears stored tool inputs. It must not take theme, favourites,
    // recents, or the rail state with it.
    const data: Record<string, string> = {
      "devtools:tool:json-compare": "a",
      "devtools:tool:base64": "b",
      "devtools:favourites": "keep",
      "devtools:recents": "keep",
      "devtools:rail": "keep",
      theme: "keep",
    };
    vi.stubGlobal("localStorage", {
      get length() { return Object.keys(data).length; },
      key: (i: number) => Object.keys(data)[i] ?? null,
      getItem: (k: string) => data[k] ?? null,
      setItem: (k: string, v: string) => { data[k] = v; },
      removeItem: (k: string) => { delete data[k]; },
    });

    expect(removeByPrefix(TOOL_KEY_PREFIX)).toBe(2);
    expect(Object.keys(data).sort()).toEqual([
      "devtools:favourites", "devtools:rail", "devtools:recents", "theme",
    ]);
  });

  it("reports zero removals when storage is unavailable rather than throwing", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(removeByPrefix(TOOL_KEY_PREFIX)).toBe(0);
  });
});
