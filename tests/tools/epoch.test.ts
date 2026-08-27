import { describe, it, expect } from "vitest";
import { detectUnit, epochToDate, dateToEpoch, formatDate } from "@/lib/tools/epoch";

describe("detectUnit", () => {
  it("reads a ten-digit value as seconds", () => {
    expect(detectUnit(1_700_000_000)).toBe("s");
  });

  it("reads a thirteen-digit value as milliseconds", () => {
    expect(detectUnit(1_700_000_000_000)).toBe("ms");
  });

  it("reads a sixteen-digit value as microseconds", () => {
    expect(detectUnit(1_700_000_000_000_000)).toBe("us");
  });

  it("reads 0 as seconds rather than guessing wildly", () => {
    expect(detectUnit(0)).toBe("s");
  });

  it("detects by magnitude on negative values too", () => {
    // Pre-1970 timestamps are negative; magnitude is what carries the unit.
    expect(detectUnit(-1_700_000_000)).toBe("s");
    expect(detectUnit(-1_700_000_000_000)).toBe("ms");
  });
});

describe("epochToDate", () => {
  it("converts seconds", () => {
    const r = epochToDate(0, "s");
    expect(r.ok && r.value.toISOString()).toBe("1970-01-01T00:00:00.000Z");
  });

  it("converts milliseconds", () => {
    const r = epochToDate(1_700_000_000_000, "ms");
    expect(r.ok && r.value.toISOString()).toBe("2023-11-14T22:13:20.000Z");
  });

  it("converts microseconds", () => {
    const r = epochToDate(1_700_000_000_000_000, "us");
    expect(r.ok && r.value.toISOString()).toBe("2023-11-14T22:13:20.000Z");
  });

  it("handles a pre-1970 negative value", () => {
    const r = epochToDate(-1, "s");
    expect(r.ok && r.value.toISOString()).toBe("1969-12-31T23:59:59.000Z");
  });

  it("rejects a value outside the representable date range", () => {
    expect(epochToDate(1e18, "s").ok).toBe(false);
  });

  it("rejects NaN rather than producing an Invalid Date", () => {
    expect(epochToDate(Number.NaN, "s").ok).toBe(false);
  });
});

describe("dateToEpoch", () => {
  it("parses an ISO 8601 string to milliseconds", () => {
    expect(dateToEpoch("2023-11-14T22:13:20.000Z")).toMatchObject({ ok: true, value: 1_700_000_000_000 });
  });

  it("parses a date-only string", () => {
    expect(dateToEpoch("1970-01-01")).toMatchObject({ ok: true, value: 0 });
  });

  it("rejects text that is not a date", () => {
    expect(dateToEpoch("not a date").ok).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(dateToEpoch("").ok).toBe(false);
  });
});

describe("formatDate", () => {
  const at = new Date("2023-11-14T22:13:20.000Z");

  it("renders ISO, UTC and RFC 2822 forms", () => {
    const out = formatDate(at, "UTC");
    expect(out.iso).toBe("2023-11-14T22:13:20.000Z");
    expect(out.utc).toContain("2023");
    expect(out.rfc2822).toContain("Tue");
  });

  it("renders the chosen IANA zone, not just local time", () => {
    const tokyo = formatDate(at, "Asia/Tokyo");
    const utc = formatDate(at, "UTC");
    expect(tokyo.zoned).not.toBe(utc.zoned);
  });

  it("describes distance from now in words", () => {
    const soon = new Date(Date.now() + 60_000);
    expect(formatDate(soon, "UTC").relative).toMatch(/in |from now/);
  });

  it("falls back rather than throwing on an unknown zone", () => {
    // An old share link could carry a zone this browser does not know.
    expect(() => formatDate(at, "Not/AZone")).not.toThrow();
  });
});
