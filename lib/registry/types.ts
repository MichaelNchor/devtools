import type { LucideIcon } from "lucide-react";

export type ToolGroup = "security" | "data" | "network";

export const GROUP_ORDER: ToolGroup[] = ["security", "data", "network"];

export const GROUP_LABELS: Record<ToolGroup, string> = {
  security: "Security & Identity",
  data: "Data & Formatting",
  network: "Networking & Backend",
};

/**
 * Icon tint per group, so a wall of sixteen cards is scannable by shape as
 * well as by reading. Safe under the Status Escape Rule because the group is
 * ALWAYS also written out beside these icons — in the dashboard heading, the
 * rail heading, and the palette row — so the colour is redundant encoding,
 * never the only carrier.
 *
 * Deliberately drawn from the brand hues (primary, accent, sky) and never the
 * status family (up, rose, warn), which would make a category look like a
 * verdict.
 */
export const GROUP_TONE: Record<ToolGroup, string> = {
  security: "bg-accent-tint text-accent-strong",
  data: "bg-primary-tint text-primary-strong",
  network: "bg-sky-tint text-sky",
};

/**
 * Solid fills, for small decorative marks. A tint at roughly 1.15:1 against
 * the canvas is invisible at three pixels wide, so chips and dots use these.
 */
export const GROUP_DOT: Record<ToolGroup, string> = {
  security: "bg-accent-strong",
  data: "bg-primary-strong",
  network: "bg-sky",
};

/**
 * Per-tool icon colour. Purely decorative: it encodes nothing, so it cannot
 * violate the Status Escape Rule — group is carried by the heading beside the
 * cards, not by these. Sixteen icons in three colours read as a rigid grid;
 * spreading them over six hues is what makes the wall scannable.
 *
 * Every hue was measured against its own tint in both themes and clears
 * 4.5:1, including the status families, which are safe on a dashboard card
 * because there is no status being reported.
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
  "json-to-code": "bg-accent-tint text-accent-strong",
  base64: "bg-up-tint text-up",
  epoch: "bg-warn-tint text-warn",
  regex: "bg-rose-tint text-rose",
  "yaml-json": "bg-sky-tint text-sky",
  "sql-format": "bg-up-tint text-up",
  // Networking & Backend
  "ip-calculator": "bg-sky-tint text-sky",
  "curl-convert": "bg-accent-tint text-accent-strong",
  "http-inspector": "bg-primary-tint text-primary-strong",
  cron: "bg-warn-tint text-warn",
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
