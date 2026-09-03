import type { LucideIcon } from "lucide-react";

export type ToolGroup = "security" | "data" | "network" | "concepts";

export const GROUP_ORDER: ToolGroup[] = ["security", "data", "network", "concepts"];

export const GROUP_LABELS: Record<ToolGroup, string> = {
  security: "Security & Identity",
  data: "Data & Formatting",
  network: "Networking & Backend",
  concepts: "Algorithms & Concepts",
};

/**
 * Group tone, for a category mark. Safe under the Status Escape Rule because
 * the group is ALWAYS written out beside these — in the dashboard heading, the
 * rail heading and the palette row — so colour is redundant, never the carrier.
 */
export const GROUP_TONE: Record<ToolGroup, string> = {
  security: "bg-accent-tint text-accent-strong",
  data: "bg-primary-tint text-primary-strong",
  network: "bg-sky-tint text-sky",
  concepts: "bg-up-tint text-up",
};

/** Solid marks. A tint at three pixels wide is invisible; these are not. */
export const GROUP_DOT: Record<ToolGroup, string> = {
  security: "bg-accent-strong",
  data: "bg-primary-strong",
  network: "bg-sky",
  concepts: "bg-up",
};

/**
 * Per-tool icon colour. Purely decorative — it encodes nothing, so it cannot
 * violate the Status Escape Rule. Sixteen tiles in one colour read as a grid
 * to be searched; spreading them over six hues makes the wall scannable.
 *
 * Every hue is measured against its own tint in both themes and clears 4.5:1.
 */
export const TOOL_TONE: Record<string, string> = {
  // Security & Identity
  guid: "bg-primary-tint text-primary-strong",
  password: "bg-rose-tint text-rose",
  hash: "bg-accent-tint text-accent-strong",
  jwt: "bg-warn-tint text-warn",
  // Data & Formatting
  "json-compare": "bg-sky-tint text-sky",
  "json-format": "bg-primary-tint text-primary-strong",
  "json-merge": "bg-up-tint text-up",
  "json-to-code": "bg-accent-tint text-accent-strong",
  base64: "bg-up-tint text-up",
  epoch: "bg-warn-tint text-warn",
  regex: "bg-rose-tint text-rose",
  "yaml-json": "bg-sky-tint text-sky",
  "sql-format": "bg-primary-tint text-primary-strong",
  // Networking & Backend
  "ip-calculator": "bg-sky-tint text-sky",
  "curl-convert": "bg-accent-tint text-accent-strong",
  "http-inspector": "bg-primary-tint text-primary-strong",
  cron: "bg-warn-tint text-warn",
  // Algorithms & Concepts
  sorting: "bg-up-tint text-up",
  bst: "bg-sky-tint text-sky",
  pathfinding: "bg-accent-tint text-accent-strong",
  "big-o": "bg-rose-tint text-rose",
  patterns: "bg-warn-tint text-warn",
};

/** Falls back to the group tone for any tool not listed above. */
export function toneFor(slug: string, group: ToolGroup): string {
  return TOOL_TONE[slug] ?? GROUP_TONE[group];
}

/** The same hues without a fill, for icons sitting directly on a surface. */
export const GROUP_TEXT: Record<ToolGroup, string> = {
  security: "text-accent-strong",
  data: "text-primary-strong",
  network: "text-sky",
  concepts: "text-up",
};

export interface ToolMeta {
  /** URL segment. Permanent once shipped — links depend on it. */
  slug: string;
  name: string;
  /**
   * Two to four words. This is what a card shows, because a wall of sixteen
   * full sentences is a wall to read rather than scan.
   */
  tagline: string;
  /** One line, sentence case. Shown on the tool page under its title. */
  blurb: string;
  group: ToolGroup;
  icon: LucideIcon;
  /** Extra ⌘K search terms beyond the name and slug. */
  aliases: string[];
  /**
   * True for tools that take tokens, keys, or generated credentials. Gates
   * BOTH localStorage persistence and URL sharing, so the two can never
   * disagree about whether a secret may leave the tab.
   */
  handlesSecrets: boolean;
}

export interface ToolExample {
  /** Short, concrete, and specific. "Nested config", not "Example 2". */
  name: string;
  /** One line on what this example is for. Shown under the name. */
  blurb: string;
  /** The state patch loading this example applies. */
  state: Record<string, unknown>;
}

export interface ToolEntry {
  meta: ToolMeta;
  Component: React.ComponentType;
  /**
   * Worked examples, most useful first. Held on the entry rather than inside
   * the component so the registry suite can assert every tool has some — an
   * empty page should teach, not sit blank.
   *
   * The first one doubles as the tool's default sample.
   */
  examples: ToolExample[];
}
