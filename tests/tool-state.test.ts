import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { initialToolState, mayPersist, shareGate } from "@/components/tool/useToolState";
import { encodeShare, SHARE_LIMIT, SHARE_PREFIX } from "@/lib/share";
import { KEYS } from "@/lib/storage";
import type { ToolMeta } from "@/lib/registry/types";

interface State { text: string; mode: string }
const DEFAULTS: State = { text: "", mode: "encode" };
const isValid = (v: unknown): v is State =>
  typeof v === "object" && v !== null &&
  typeof (v as State).text === "string" && typeof (v as State).mode === "string";

const open: ToolMeta = {
  slug: "base64", name: "Base64", tagline: "Base64", blurb: "b", group: "network",
  icon: (() => null) as never, aliases: ["b64"], handlesSecrets: false,
};
const secret: ToolMeta = { ...open, slug: "jwt", name: "JWT", handlesSecrets: true };

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  } as Partial<Storage>;
}

describe("initialToolState", () => {
  beforeEach(() => vi.stubGlobal("localStorage", memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("falls back to defaults with nothing stored and no hash", () => {
    expect(initialToolState(open, DEFAULTS, "", isValid)).toEqual(DEFAULTS);
  });

  it("restores stored state", () => {
    localStorage.setItem(KEYS.tool("base64"), JSON.stringify({ text: "hi", mode: "decode" }));
    expect(initialToolState(open, DEFAULTS, "", isValid)).toEqual({ text: "hi", mode: "decode" });
  });

  it("lets a share hash win over stored state", () => {
    localStorage.setItem(KEYS.tool("base64"), JSON.stringify({ text: "stored", mode: "decode" }));
    const hash = `${SHARE_PREFIX}${encodeShare({ text: "shared", mode: "encode" })}`;
    expect(initialToolState(open, DEFAULTS, hash, isValid)).toEqual({ text: "shared", mode: "encode" });
  });

  it("discards stored state of the wrong shape rather than opening broken", () => {
    localStorage.setItem(KEYS.tool("base64"), JSON.stringify({ text: 42 }));
    expect(initialToolState(open, DEFAULTS, "", isValid)).toEqual(DEFAULTS);
  });

  it("discards a malformed share hash", () => {
    expect(initialToolState(open, DEFAULTS, `${SHARE_PREFIX}!!!`, isValid)).toEqual(DEFAULTS);
  });

  it("ignores BOTH stored state and a share hash for a secret-handling tool", () => {
    localStorage.setItem(KEYS.tool("jwt"), JSON.stringify({ text: "eyJhbG", mode: "decode" }));
    const hash = `${SHARE_PREFIX}${encodeShare({ text: "leaked", mode: "decode" })}`;
    expect(initialToolState(secret, DEFAULTS, hash, isValid)).toEqual(DEFAULTS);
  });
});

describe("mayPersist — the write gate", () => {
  it("allows persistence for a tool that handles no secrets", () => {
    expect(mayPersist(open)).toBe(true);
  });

  it("refuses persistence for a secret-handling tool", () => {
    expect(mayPersist(secret)).toBe(false);
  });
});

describe("shareGate — the share gate", () => {
  it("refuses to share a secret-handling tool at all", () => {
    expect(shareGate(secret, { text: "eyJhbG", mode: "decode" })).toEqual({ shareable: false });
  });

  it("refuses when the tool exposes no share state", () => {
    expect(shareGate(open, undefined)).toEqual({ shareable: false });
  });

  it("produces a payload for an ordinary tool", () => {
    const gate = shareGate(open, { text: "hi", mode: "encode" });
    expect(gate.shareable).toBe(true);
    if (!gate.shareable) throw new Error("unreachable");
    expect(gate.payload).toBeTypeOf("string");
  });

  it("marks state past the ceiling shareable but with no payload, so the button disables", () => {
    const gate = shareGate(open, { text: "x".repeat(SHARE_LIMIT * 2), mode: "encode" });
    expect(gate.shareable).toBe(true);
    if (!gate.shareable) throw new Error("unreachable");
    expect(gate.payload).toBeNull();
  });
});
