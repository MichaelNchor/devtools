import { v1 as uuidV1, v5 as uuidV5, validate as uuidValidate } from "uuid";
import { err, ok, type ToolResult } from "@/lib/types";

export type GuidVersion = "v1" | "v4" | "v5" | "v7";

export interface GuidOptions {
  version: GuidVersion;
  /** 1–1000 per spec. */
  count: number;
  uppercase: boolean;
  braces: boolean;
  hyphens: boolean;
  /** Namespace UUID, used by v5 only. */
  namespace: string;
  /** Name to hash into the namespace, used by v5 only. */
  name: string;
}

export const GUID_NAMESPACES: { value: string; label: string }[] = [
  { value: "6ba7b810-9dad-11d1-80b4-00c04fd430c8", label: "DNS" },
  { value: "6ba7b811-9dad-11d1-80b4-00c04fd430c8", label: "URL" },
  { value: "6ba7b812-9dad-11d1-80b4-00c04fd430c8", label: "OID" },
  { value: "6ba7b814-9dad-11d1-80b4-00c04fd430c8", label: "X500" },
];

export const DEFAULT_GUID_OPTIONS: GuidOptions = {
  version: "v4",
  count: 5,
  uppercase: false,
  braces: false,
  hyphens: true,
  namespace: GUID_NAMESPACES[0]!.value,
  name: "",
};

const MAX_COUNT = 1000;

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function format(raw: string): string {
  const h = raw.replace(/-/g, "");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** v4: 122 random bits with the version and variant nibbles pinned. */
function randomV4(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return format(hex(bytes));
}

/**
 * v7: a 48-bit big-endian millisecond timestamp followed by random bits, so
 * values generated in order also SORT in that order — the whole point of v7.
 * A per-call counter keeps two GUIDs made in the same millisecond ordered.
 */
let lastMillis = 0;
let sequence = 0;

function randomV7(): string {
  const now = Date.now();
  if (now === lastMillis) sequence += 1; else { lastMillis = now; sequence = 0; }

  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  for (let i = 0; i < 6; i += 1) {
    bytes[i] = Number((BigInt(now) >> BigInt(8 * (5 - i))) & 0xffn);
  }
  // Twelve bits of monotonic counter live in the version-tagged block.
  bytes[6] = 0x70 | ((sequence >> 8) & 0x0f);
  bytes[7] = sequence & 0xff;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return format(hex(bytes));
}

function decorate(guid: string, options: GuidOptions): string {
  let out = options.hyphens ? guid : guid.replace(/-/g, "");
  if (options.uppercase) out = out.toUpperCase();
  if (options.braces) out = `{${out}}`;
  return out;
}

export function generateGuids(options: GuidOptions): ToolResult<string[]> {
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > MAX_COUNT) {
    return err(`Count must be a whole number between 1 and ${MAX_COUNT}.`);
  }

  if (options.version === "v5") {
    if (!uuidValidate(options.namespace)) return err("The namespace must be a valid UUID.");
    if (!options.name) return err("Enter a name to hash into the namespace.");
  }

  const out: string[] = [];
  for (let i = 0; i < options.count; i += 1) {
    let guid: string;
    switch (options.version) {
      case "v4": guid = randomV4(); break;
      case "v7": guid = randomV7(); break;
      case "v1": guid = uuidV1(); break;
      // v5 is a namespace + name hash, so every one in a batch is identical
      // by definition. That is what determinism means; it is not a bug.
      case "v5": guid = uuidV5(options.name, options.namespace); break;
    }
    out.push(decorate(guid, options));
  }
  return ok(out);
}
