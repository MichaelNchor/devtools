import type { ToolEntry, ToolMeta } from "./types";

export * from "./types";
export { searchTools, groupTools } from "./search";

/**
 * The single source of truth. Every tool registers here exactly once and
 * appears in four places: the rail, the ⌘K palette, the dashboard, and the
 * [slug] route. Declaration order is display order within a group.
 */
export const TOOLS: ToolEntry[] = [];

export function allMetas(): ToolMeta[] {
  return TOOLS.map((entry) => entry.meta);
}

export function toolBySlug(slug: string): ToolEntry | undefined {
  return TOOLS.find((entry) => entry.meta.slug === slug);
}
