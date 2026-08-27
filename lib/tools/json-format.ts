import { parseJson } from "@/lib/json/parse";
import { ok, type ToolResult } from "@/lib/types";

export type IndentStyle = "2" | "4" | "tab";
export type SortMode = "off" | "asc" | "desc";

export interface FormatOptions {
  indent: IndentStyle;
  sort: SortMode;
  /** Wins over `indent` — a minified document has no indentation to set. */
  minify: boolean;
}

export const DEFAULT_FORMAT_OPTIONS: FormatOptions = {
  indent: "2",
  sort: "off",
  minify: false,
};

const INDENT: Record<IndentStyle, string | number> = { "2": 2, "4": 4, tab: "\t" };

/**
 * Rebuilds the value with object keys in the requested order. Arrays are
 * rebuilt but never reordered: their order is data, not presentation.
 */
function sortValue(value: unknown, mode: Exclude<SortMode, "off">): unknown {
  if (Array.isArray(value)) return value.map((item) => sortValue(item, mode));
  if (typeof value !== "object" || value === null) return value;

  const entries = Object.entries(value as Record<string, unknown>);
  entries.sort(([a], [b]) => (mode === "asc" ? a.localeCompare(b) : b.localeCompare(a)));
  // Insertion order IS key order for JSON.stringify, so rebuilding the object
  // in sorted order is what actually applies the sort.
  const out: Record<string, unknown> = {};
  for (const [key, nested] of entries) out[key] = sortValue(nested, mode);
  return out;
}

export function formatJson(text: string, options: FormatOptions): ToolResult<string> {
  const parsed = parseJson(text);
  if (!parsed.ok) return parsed;

  const value = options.sort === "off" ? parsed.value : sortValue(parsed.value, options.sort);
  return ok(JSON.stringify(value, null, options.minify ? undefined : INDENT[options.indent]));
}
