import { err, ok, type ToolResult } from "@/lib/types";

export type EpochUnit = "s" | "ms" | "us";

/** JS Date accepts ±8.64e15 ms from the epoch. Past that it is Invalid Date. */
const MAX_MS = 8.64e15;

export const EPOCH_ZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Europe/Paris",
  "Africa/Lagos", "Africa/Johannesburg", "Asia/Dubai", "Asia/Kolkata",
  "Asia/Shanghai", "Asia/Tokyo", "Australia/Sydney",
];

const TO_MS: Record<EpochUnit, number> = { s: 1000, ms: 1, us: 0.001 };

/**
 * Picks the unit from magnitude. A second-precision timestamp for any date
 * near now has ten digits, milliseconds thirteen, microseconds sixteen — so
 * the digit count is the signal, and the sign is irrelevant to it.
 */
export function detectUnit(value: number): EpochUnit {
  const magnitude = Math.abs(value);
  if (magnitude >= 1e14) return "us";
  if (magnitude >= 1e11) return "ms";
  return "s";
}

export function epochToDate(value: number, unit: EpochUnit): ToolResult<Date> {
  if (!Number.isFinite(value)) return err("Enter a number.");
  const ms = value * TO_MS[unit];
  if (Math.abs(ms) > MAX_MS) {
    return err("That is outside the range of dates this browser can represent.");
  }
  return ok(new Date(ms));
}

export function dateToEpoch(text: string): ToolResult<number> {
  const trimmed = text.trim();
  if (!trimmed) return err("Enter a date.");
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return err("That is not a date this browser recognises.");
  return ok(parsed);
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000_000], ["month", 2_592_000_000], ["day", 86_400_000],
  ["hour", 3_600_000], ["minute", 60_000], ["second", 1000],
];

function relativeTo(date: Date, now: number): string {
  const delta = date.getTime() - now;
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, size] of RELATIVE_STEPS) {
    if (Math.abs(delta) >= size) return formatter.format(Math.round(delta / size), unit);
  }
  return formatter.format(0, "second");
}

function inZone(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone, dateStyle: "medium", timeStyle: "long",
    }).format(date);
  } catch {
    // An unknown IANA zone — from an old share link, or a browser with a
    // trimmed ICU build. Say so rather than throwing the page away.
    return `${date.toISOString()} (zone "${timeZone}" unavailable)`;
  }
}

export function formatDate(date: Date, timeZone: string): {
  iso: string; utc: string; local: string; zoned: string; rfc2822: string; relative: string;
} {
  return {
    iso: date.toISOString(),
    utc: date.toUTCString(),
    local: date.toString(),
    zoned: inZone(date, timeZone),
    // toUTCString is already RFC 1123, the modern form of RFC 2822's date.
    rfc2822: date.toUTCString(),
    relative: relativeTo(date, Date.now()),
  };
}
