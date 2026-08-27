import { CronExpressionParser } from "cron-parser";
import cronstrue from "cronstrue";
import { err, ok, type ToolResult } from "@/lib/types";

export interface CronField {
  name: string;
  value: string;
  /** Plain-language reading of this field alone. */
  describes: string;
}

export interface CronReport {
  description: string;
  fields: CronField[];
  nextRuns: Date[];
  hasSeconds: boolean;
}

export const CRON_MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};

const FIVE_FIELD_NAMES = ["minute", "hour", "day of month", "month", "day of week"];
const SIX_FIELD_NAMES = ["second", ...FIVE_FIELD_NAMES];

const RANGES: Record<string, string> = {
  second: "0-59",
  minute: "0-59",
  hour: "0-23",
  "day of month": "1-31",
  month: "1-12",
  "day of week": "0-6",
};

const RUN_COUNT = 10;

function describeField(name: string, value: string): string {
  if (value === "*") return `every ${name}`;
  if (value.startsWith("*/")) return `every ${value.slice(2)} ${name}s`;
  if (value.includes("-")) return `${name} ${value.replace("-", " through ")}`;
  if (value.includes(",")) return `${name} ${value.split(",").join(", ")}`;
  return `${name} ${value}`;
}

/** Turns a library error into a message that names the offending field. */
function explain(message: string, names: string[], parts: string[]): string {
  const range = /expected range (\d+)-(\d+)/.exec(message);
  if (range) {
    const wanted = `${range[1]}-${range[2]}`;
    const index = names.findIndex((name) => RANGES[name] === wanted);
    if (index !== -1) {
      return `The ${names[index]} field ("${parts[index] ?? "?"}") is out of range — it must be within ${wanted}.`;
    }
  }
  return message;
}

export function parseCron(
  expression: string,
  timeZone: string,
  from: Date = new Date(),
): ToolResult<CronReport> {
  const trimmed = expression.trim();
  if (!trimmed) return err("Enter a cron expression, such as 0 9 * * 1-5.");

  const expanded = CRON_MACROS[trimmed.toLowerCase()] ?? trimmed;
  const parts = expanded.split(/\s+/);
  if (parts.length !== 5 && parts.length !== 6) {
    return err(`A cron expression has 5 fields, or 6 with seconds; this has ${parts.length}.`);
  }

  const hasSeconds = parts.length === 6;
  const names = hasSeconds ? SIX_FIELD_NAMES : FIVE_FIELD_NAMES;

  // Validated before use: an unknown zone would otherwise throw from deep
  // inside the iterator with a message that means nothing to the user.
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format(from);
  } catch {
    return err(`"${timeZone}" is not a time zone this browser knows.`);
  }

  let nextRuns: Date[];
  try {
    const iterator = CronExpressionParser.parse(expanded, { currentDate: from, tz: timeZone });
    nextRuns = Array.from({ length: RUN_COUNT }, () => iterator.next().toDate());
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "That expression could not be parsed.";
    return err(explain(message, names, parts));
  }

  let description: string;
  try {
    description = cronstrue.toString(expanded, { verbose: false });
  } catch {
    // The schedule is still computable even when the humaniser gives up.
    description = "This schedule could not be described in words.";
  }

  return ok({
    description,
    hasSeconds,
    nextRuns,
    fields: names.map((name, index) => ({
      name,
      value: parts[index] ?? "*",
      describes: describeField(name, parts[index] ?? "*"),
    })),
  });
}
