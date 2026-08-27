import { GROUP_LABELS, GROUP_ORDER, type ToolGroup, type ToolMeta } from "./types";

/**
 * Scores one haystack against a query. Higher is better; 0 means no match.
 *
 * The tiers matter more than the numbers: an exact hit beats a prefix, a
 * prefix beats a word-start, and a scattered subsequence comes last so that
 * typing "de" surfaces "Debugger" above "delta".
 */
/** Aliases must rank below a real name's word-start match (60). */
const ALIAS_CAP = 50;

function score(haystack: string, query: string): number {
  const h = haystack.toLowerCase();
  if (h === query) return 100;
  if (h.startsWith(query)) return 80;
  // Word start: after a space or a hyphen.
  if (new RegExp(`(^|[\\s-])${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(h)) return 60;
  if (h.includes(query)) return 40;

  // Subsequence: every query character appears in order, not necessarily
  // adjacent. Cheapest match, so it ranks last.
  let i = 0;
  for (const char of h) {
    if (char === query[i]) i += 1;
    if (i === query.length) return 20;
  }
  return 0;
}

export function searchTools(metas: ToolMeta[], query: string): ToolMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...metas];

  return metas
    .map((meta, index) => {
      const best = Math.max(
        score(meta.name, q),
        score(meta.slug, q),
        // An alias is a weaker signal than the real name, so it is capped
        // BELOW the word-start tier (60). At 70 an alias would outrank a real
        // name's word-start match, which is what "de" -> Debugger tests for.
        ...meta.aliases.map((a) => Math.min(score(a, q), ALIAS_CAP)),
      );
      return { meta, best, index };
    })
    .filter((row) => row.best > 0)
    // Ties fall back to registry order, which is the order a human curated.
    .sort((a, b) => b.best - a.best || a.index - b.index)
    .map((row) => row.meta);
}

export function groupTools(
  metas: ToolMeta[],
): { group: ToolGroup; label: string; tools: ToolMeta[] }[] {
  return GROUP_ORDER
    .map((group) => ({
      group,
      label: GROUP_LABELS[group],
      tools: metas.filter((m) => m.group === group),
    }))
    // A group with nothing in it is absent, not empty — the spec's rule that
    // an empty surface never renders as blank space.
    .filter((section) => section.tools.length > 0);
}
