import type { LucideIcon } from "lucide-react";

export type ToolGroup = "security" | "data" | "network" | "concepts";

export const GROUP_ORDER: ToolGroup[] = ["security", "data", "network", "concepts"];

export const GROUP_LABELS: Record<ToolGroup, string> = {
  security: "Security & Identity",
  data: "Data & Formatting",
  network: "Networking & Backend",
  concepts: "Algorithms & Concepts",
};

/** Ink wells. Group is written beside the icon, so colour is not the carrier. */
export const GROUP_TONE: Record<ToolGroup, string> = {
  security: "bg-surface-2 text-fg",
  data: "bg-surface-2 text-fg",
  network: "bg-surface-2 text-fg",
  concepts: "bg-surface-2 text-fg",
};

export const GROUP_DOT: Record<ToolGroup, string> = {
  security: "bg-fg",
  data: "bg-fg",
  network: "bg-fg",
  concepts: "bg-fg",
};

export function toneFor(_slug: string, group: ToolGroup): string {
  return GROUP_TONE[group];
}

export const GROUP_TEXT: Record<ToolGroup, string> = {
  security: "text-fg-muted",
  data: "text-fg-muted",
  network: "text-fg-muted",
  concepts: "text-fg-muted",
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
