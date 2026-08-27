import { err, ok, type ToolResult } from "@/lib/types";

export interface PasswordOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  /** Extra characters beyond the standard sets. */
  custom: string;
  excludeAmbiguous: boolean;
  /** Force at least one character from each selected set. */
  requireEachSet: boolean;
  count: number;
}

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?";
/** Characters that read alike in most fonts. */
const AMBIGUOUS = "0O1lI";

export const MIN_LENGTH = 8;
export const MAX_LENGTH = 128;
export const MAX_COUNT = 100;

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 20,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  custom: "",
  excludeAmbiguous: false,
  requireEachSet: true,
  count: 1,
};

function trim(set: string, options: PasswordOptions): string {
  return options.excludeAmbiguous
    ? [...set].filter((c) => !AMBIGUOUS.includes(c)).join("")
    : set;
}

/** The selected sets, each already filtered, with empties dropped. */
export function setsFor(options: PasswordOptions): string[] {
  return [
    options.lower ? trim(LOWER, options) : "",
    options.upper ? trim(UPPER, options) : "",
    options.digits ? trim(DIGITS, options) : "",
    options.symbols ? trim(SYMBOLS, options) : "",
    trim(options.custom, options),
  ].filter((set) => set.length > 0);
}

export function poolFor(options: PasswordOptions): string {
  // Deduplicated: a character appearing in two sets must not be twice as
  // likely, and it would also overstate the entropy.
  return [...new Set(setsFor(options).join(""))].join("");
}

/**
 * One uniformly random index into a pool of `size`.
 *
 * Rejection sampling, not modulo. `byte % size` is biased whenever 256 is not
 * a multiple of size — with a 62-character pool the first 8 characters would
 * come up measurably more often, which is exactly the flaw a password
 * generator must not have.
 */
function randomIndex(size: number): number {
  const limit = Math.floor(256 / size) * size;
  const buffer = new Uint8Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buffer);
    const value = buffer[0]!;
    if (value < limit) return value % size;
  }
}

function shuffle(characters: string[]): string[] {
  // Fisher-Yates, drawing each index from the same unbiased source.
  for (let i = characters.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    const a = characters[i]!;
    characters[i] = characters[j]!;
    characters[j] = a;
  }
  return characters;
}

export function entropyBits(options: PasswordOptions): number {
  const pool = poolFor(options);
  if (pool.length === 0) return 0;
  return options.length * Math.log2(pool.length);
}

export function describeStrength(bits: number): string {
  if (bits < 28) return "Very weak — this would fall to an offline guessing attack almost immediately.";
  if (bits < 50) return "Weak — fine for a throwaway login, not for anything you care about.";
  if (bits < 70) return "Reasonable — comparable to a decent human-chosen passphrase.";
  if (bits < 100) return "Strong — beyond practical offline brute force with today's hardware.";
  return "Very strong — far beyond any foreseeable brute-force capability.";
}

export function generatePasswords(options: PasswordOptions): ToolResult<string[]> {
  if (!Number.isInteger(options.length) || options.length < MIN_LENGTH || options.length > MAX_LENGTH) {
    return err(`Length must be a whole number between ${MIN_LENGTH} and ${MAX_LENGTH}.`);
  }
  if (!Number.isInteger(options.count) || options.count < 1 || options.count > MAX_COUNT) {
    return err(`Count must be a whole number between 1 and ${MAX_COUNT}.`);
  }

  const sets = setsFor(options);
  const pool = poolFor(options);
  if (pool.length === 0) return err("Select at least one character set, or add custom characters.");

  if (options.requireEachSet && sets.length > options.length) {
    return err(`A ${options.length}-character password cannot contain one of each of ${sets.length} sets.`);
  }

  const out: string[] = [];
  for (let n = 0; n < options.count; n += 1) {
    const characters: string[] = [];

    // Seed one character per set first so the guarantee holds by construction
    // rather than by re-rolling until it happens to be satisfied.
    if (options.requireEachSet) {
      for (const set of sets) characters.push(set[randomIndex(set.length)]!);
    }
    while (characters.length < options.length) {
      characters.push(pool[randomIndex(pool.length)]!);
    }

    // Without the shuffle the seeded characters would always sit in set order
    // at the front, which is a pattern an attacker can exploit.
    out.push(shuffle(characters).join(""));
  }

  return ok(out);
}
