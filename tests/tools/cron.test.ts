import { describe, it, expect } from "vitest";
import { parseCron, CRON_MACROS } from "@/lib/tools/cron";

const FROM = new Date("2026-01-01T00:00:00Z");
const report = (expression: string, timeZone = "UTC") => {
  const r = parseCron(expression, timeZone, FROM);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
};

describe("parseCron", () => {
  it("describes a five-field expression and breaks out its fields", () => {
    const out = report("0 9 * * 1-5");
    expect(out.description.toLowerCase()).toContain("monday");
    expect(out.hasSeconds).toBe(false);
    expect(out.fields).toHaveLength(5);
    expect(out.fields.map((f) => f.name)).toEqual([
      "minute", "hour", "day of month", "month", "day of week",
    ]);
  });

  it("handles a six-field expression with seconds", () => {
    const out = report("*/30 * * * * *");
    expect(out.hasSeconds).toBe(true);
    expect(out.fields).toHaveLength(6);
    expect(out.fields[0]!.name).toBe("second");
  });

  it("expands and describes a macro", () => {
    const out = report("@daily");
    expect(out.description.length).toBeGreaterThan(0);
    expect(out.nextRuns[0]!.toISOString()).toBe("2026-01-02T00:00:00.000Z");
  });

  it("knows the common macros", () => {
    for (const macro of ["@daily", "@hourly", "@weekly", "@monthly", "@yearly"]) {
      expect(Object.keys(CRON_MACROS)).toContain(macro);
      expect(parseCron(macro, "UTC", FROM).ok, macro).toBe(true);
    }
  });

  it("returns exactly ten strictly increasing runs", () => {
    const runs = report("*/15 * * * *").nextRuns;
    expect(runs).toHaveLength(10);
    for (let i = 1; i < runs.length; i += 1) {
      expect(runs[i]!.getTime(), String(i)).toBeGreaterThan(runs[i - 1]!.getTime());
    }
  });

  it("spaces */15 fifteen minutes apart", () => {
    const runs = report("*/15 * * * *").nextRuns;
    expect(runs[1]!.getTime() - runs[0]!.getTime()).toBe(15 * 60 * 1000);
  });

  it("computes runs in the requested time zone", () => {
    // 09:00 local is a different instant in Tokyo than in UTC.
    const utc = report("0 9 * * *", "UTC").nextRuns[0]!;
    const tokyo = report("0 9 * * *", "Asia/Tokyo").nextRuns[0]!;
    expect(tokyo.getTime()).not.toBe(utc.getTime());
  });

  it("is deterministic from a fixed start, never dependent on now", () => {
    expect(report("0 9 * * *").nextRuns[0]!.toISOString()).toBe("2026-01-01T09:00:00.000Z");
  });

  it("stays strictly increasing across a DST boundary", () => {
    // US DST springs forward on 2026-03-08.
    const r = parseCron("30 2 * * *", "America/New_York", new Date("2026-03-06T00:00:00Z"));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (let i = 1; i < r.value.nextRuns.length; i += 1) {
      expect(r.value.nextRuns[i]!.getTime()).toBeGreaterThan(r.value.nextRuns[i - 1]!.getTime());
    }
  });

  it("rejects an out-of-range field and says which one", () => {
    const r = parseCron("99 * * * *", "UTC", FROM);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message.toLowerCase()).toContain("minute");
  });

  it("rejects the wrong number of fields", () => {
    expect(parseCron("* * *", "UTC", FROM).ok).toBe(false);
    expect(parseCron("* * * * * * *", "UTC", FROM).ok).toBe(false);
  });

  it("rejects an empty expression", () => {
    expect(parseCron("", "UTC", FROM).ok).toBe(false);
  });

  it("rejects an unknown time zone rather than throwing", () => {
    expect(parseCron("0 9 * * *", "Not/AZone", FROM).ok).toBe(false);
  });

  it("gives every field a plain-language description", () => {
    for (const field of report("0 9 * * 1-5").fields) {
      expect(field.describes.length, field.name).toBeGreaterThan(0);
    }
  });
});
