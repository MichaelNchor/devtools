import {
  md5, sha1, sha256, sha384, sha512, ripemd160,
  createMD5, createSHA1, createSHA256, createSHA384, createSHA512, createRIPEMD160,
  createHMAC,
} from "hash-wasm";
import { err, ok, type ToolResult } from "@/lib/types";

export type HashAlgorithm = "md5" | "sha1" | "sha256" | "sha384" | "sha512" | "ripemd160";

export const HASH_ALGORITHMS: { value: HashAlgorithm; label: string }[] = [
  { value: "md5", label: "MD5" },
  { value: "sha1", label: "SHA-1" },
  { value: "sha256", label: "SHA-256" },
  { value: "sha384", label: "SHA-384" },
  { value: "sha512", label: "SHA-512" },
  { value: "ripemd160", label: "RIPEMD-160" },
];

export interface HashOptions {
  algorithm: HashAlgorithm;
  encoding: "hex" | "base64";
  /** Non-empty switches the digest to HMAC. */
  hmacKey: string;
}

export const DEFAULT_HASH_OPTIONS: HashOptions = {
  algorithm: "sha256",
  encoding: "hex",
  hmacKey: "",
};

const ONE_SHOT: Record<HashAlgorithm, (data: Uint8Array | string) => Promise<string>> = {
  md5, sha1, sha256, sha384, sha512, ripemd160,
};

/** Incremental hashers, for streaming a file without holding it in memory. */
const INCREMENTAL: Record<HashAlgorithm, () => Promise<{
  init: () => unknown; update: (data: Uint8Array) => unknown; digest: () => string;
}>> = {
  md5: createMD5, sha1: createSHA1, sha256: createSHA256,
  sha384: createSHA384, sha512: createSHA512, ripemd160: createRIPEMD160,
};

function hexToBase64(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  // btoa is safe here: every char is already in the 0-255 range by construction.
  return btoa(binary);
}

function encode(hex: string, encoding: HashOptions["encoding"]): string {
  return encoding === "base64" ? hexToBase64(hex) : hex;
}

export async function hashBytes(
  bytes: Uint8Array,
  options: HashOptions,
): Promise<ToolResult<string>> {
  try {
    if (options.hmacKey) {
      const hasher = await createHMAC(INCREMENTAL[options.algorithm]() as never, options.hmacKey);
      hasher.init();
      hasher.update(bytes);
      return ok(encode(hasher.digest(), options.encoding));
    }
    return ok(encode(await ONE_SHOT[options.algorithm](bytes), options.encoding));
  } catch (cause) {
    return err(cause instanceof Error ? cause.message : "That input could not be hashed.");
  }
}

export async function hashText(text: string, options: HashOptions): Promise<ToolResult<string>> {
  // Encoded to UTF-8 bytes first, so multi-byte text hashes the way every
  // other tool on the planet hashes it.
  return hashBytes(new TextEncoder().encode(text), options);
}

/**
 * Streams a file through an incremental hasher in chunks, so a large file
 * never has to exist in memory all at once.
 */
export async function hashStream(
  file: Blob,
  options: HashOptions,
  chunkSize = 4 * 1024 * 1024,
): Promise<ToolResult<string>> {
  try {
    const hasher = options.hmacKey
      ? await createHMAC(INCREMENTAL[options.algorithm]() as never, options.hmacKey)
      : await INCREMENTAL[options.algorithm]();
    hasher.init();
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      const slice = file.slice(offset, Math.min(offset + chunkSize, file.size));
      hasher.update(new Uint8Array(await slice.arrayBuffer()));
    }
    return ok(encode(hasher.digest(), options.encoding));
  } catch (cause) {
    return err(cause instanceof Error ? cause.message : "That file could not be hashed.");
  }
}

/** Comparison is case- and whitespace-insensitive; an empty side never matches. */
export function digestsMatch(a: string, b: string): boolean {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  return left.length > 0 && right.length > 0 && left === right;
}
