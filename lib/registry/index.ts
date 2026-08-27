import { JsonCompare } from "@/components/tools/JsonCompare";
import { JSON_COMPARE_SAMPLE } from "@/lib/tools/json-compare-sample";
import { JSON_COMPARE_META } from "./metas";
import type { ToolEntry, ToolMeta } from "./types";

export * from "./types";
export * from "./metas";
export { searchTools, groupTools } from "./search";

/**
 * The single source of truth. Every tool registers here exactly once and
 * appears in four places: the rail, the ⌘K palette, the dashboard, and the
 * [slug] route. Declaration order is display order within a group.
 *
 * `Component` is the tool's client component itself, never a wrapper closure
 * that passes it props. The [slug] route renders these from the server, and a
 * prop-passing wrapper would try to serialise the meta's icon and fail the
 * build. Each tool imports the meta it needs from ./metas instead.
 */
export const TOOLS: ToolEntry[] = [
  { meta: JSON_COMPARE_META, Component: JsonCompare, sample: JSON_COMPARE_SAMPLE },
];

export function allMetas(): ToolMeta[] {
  return TOOLS.map((entry) => entry.meta);
}

export function toolBySlug(slug: string): ToolEntry | undefined {
  return TOOLS.find((entry) => entry.meta.slug === slug);
}
