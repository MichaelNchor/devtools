import type { LucideIcon } from "lucide-react";

export type ToolGroup = "security" | "data" | "network";

export const GROUP_ORDER: ToolGroup[] = ["security", "data", "network"];

export const GROUP_LABELS: Record<ToolGroup, string> = {
  security: "Security & Identity",
  data: "Data & Formatting",
  network: "Networking & Backend",
};

export interface ToolMeta {
  /** URL segment. Permanent once shipped — links depend on it. */
  slug: string;
  name: string;
  /** One line, sentence case. Shown on the dashboard card and the tool page. */
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

export interface ToolEntry {
  meta: ToolMeta;
  Component: React.ComponentType;
  /**
   * The state patch this tool's "Load sample" button applies. Held on the
   * entry rather than inside the component so the registry suite can assert
   * every tool has one — an empty page should teach, not sit blank.
   */
  sample: Record<string, unknown>;
}
