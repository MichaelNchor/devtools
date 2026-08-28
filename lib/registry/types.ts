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
