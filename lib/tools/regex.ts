import { err, ok, type ToolResult } from "@/lib/types";

export interface RegexMatch {
  index: number;
  text: string;
  groups: { name: string | null; value: string | undefined; index: number }[];
}

export interface RegexReport {
  matches: RegexMatch[];
  /** Hit MATCH_CAP; there are more matches than are shown. */
  truncated: boolean;
  /** The budget expired mid-run; the match list is incomplete. */
  timedOut: boolean;
  /** Static shape warning — nested quantifiers, which can blow up. */
  riskyPattern: boolean;
}

export const MATCH_CAP = 5000;
const DEFAULT_BUDGET_MS = 250;

export const REGEX_LIBRARY: { name: string; pattern: string; flags: string }[] = [
  { name: "Email", pattern: "[\\w.+-]+@[\\w-]+\\.[\\w.-]+", flags: "g" },
  { name: "URL", pattern: "https?://[^\\s\"'<>]+", flags: "g" },
  { name: "IPv4", pattern: "\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b", flags: "g" },
  { name: "UUID", pattern: "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}", flags: "gi" },
  { name: "ISO date", pattern: "\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})?)?", flags: "g" },
  { name: "Semver", pattern: "\\bv?\\d+\\.\\d+\\.\\d+(?:-[\\w.]+)?(?:\\+[\\w.]+)?\\b", flags: "g" },
];

/**
 * A quantifier applied to an already-quantified group — (a+)+, (a*)*, (a+)*
 * and friends. That shape is what turns linear input into exponential work,
 * so it is worth warning about BEFORE the user pastes a long test string.
 * Purely a shape check: it neither proves nor disproves a blow-up.
 */
function looksRisky(pattern: string): boolean {
  return /\([^()]*[+*][^()]*\)\s*[+*]/.test(pattern);
}

function compile(pattern: string, flags: string, withIndices = false): ToolResult<RegExp> {
  // `d` is added internally, never shown to the user, so group positions are
  // exact. Deduped, because the user may have typed it themselves.
  const effective = withIndices && !flags.includes("d") ? `${flags}d` : flags;
  try {
    return ok(new RegExp(pattern, effective));
  } catch (cause) {
    return err(cause instanceof Error ? cause.message : "That is not a valid regular expression.");
  }
}

/**
 * Names the capture groups in index order by reading the pattern, because the
 * engine does not expose that mapping. `match.groups` is keyed by name with no
 * hint of which number each name belongs to, and matching names to values by
 * VALUE breaks the moment two groups capture the same text.
 */
function groupNames(pattern: string): (string | null)[] {
  const names: (string | null)[] = [];
  for (let i = 0; i < pattern.length; i += 1) {
    if (pattern[i] === "\\") { i += 1; continue; }
    if (pattern[i] !== "(") continue;
    const rest = pattern.slice(i + 1);
    // (?: (?= (?! (?<= (?<! are all non-capturing.
    if (/^\?(?::|=|!|<=|<!)/.test(rest)) continue;
    const named = /^\?<([A-Za-z_$][\w$]*)>/.exec(rest);
    names.push(named ? named[1]! : null);
  }
  return names;
}

function describeGroups(match: RegExpExecArray, names: (string | null)[]): RegexMatch["groups"] {
  // Positions come from the `d` flag's indices, which are exact and absolute
  // within the test text. Without it there is no honest per-group position.
  const indices = (match as RegExpExecArray & { indices?: (readonly [number, number] | undefined)[] }).indices;
  return match.slice(1).map((value, offset) => ({
    name: names[offset] ?? null,
    value,
    index: indices?.[offset + 1]?.[0] ?? -1,
  }));
}

export function runRegex(
  pattern: string,
  flags: string,
  text: string,
  budgetMs: number = DEFAULT_BUDGET_MS,
): ToolResult<RegexReport> {
  // Validate the user's flags exactly as typed first, so a bad flag is
  // reported against what they wrote rather than against our augmented copy.
  const validated = compile(pattern, flags);
  if (!validated.ok) return validated;

  const compiled = compile(pattern, flags, true);
  if (!compiled.ok) return compiled;

  const regex = compiled.value;
  const names = groupNames(pattern);
  const riskyPattern = looksRisky(pattern);
  const matches: RegexMatch[] = [];
  let truncated = false;
  let timedOut = false;

  if (!regex.global) {
    const single = regex.exec(text);
    if (single) matches.push({ index: single.index, text: single[0], groups: describeGroups(single, names) });
    return ok({ matches, truncated, timedOut, riskyPattern });
  }

  const startedAt = Date.now();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push({ index: match.index, text: match[0], groups: describeGroups(match, names) });

    // A zero-width match leaves lastIndex where it was, so without this the
    // loop never advances and the tab hangs.
    if (match[0] === "") regex.lastIndex += 1;

    if (matches.length >= MATCH_CAP) { truncated = true; break; }
    // Checked BETWEEN matches. A single pathological match cannot be
    // interrupted from here — see the note at the top of this task.
    if (Date.now() - startedAt >= budgetMs) { timedOut = true; break; }
  }

  return ok({ matches, truncated, timedOut, riskyPattern });
}

export function replaceWithRegex(
  pattern: string,
  flags: string,
  text: string,
  replacement: string,
): ToolResult<string> {
  const compiled = compile(pattern, flags);
  if (!compiled.ok) return compiled;
  try {
    return ok(text.replace(compiled.value, replacement));
  } catch (cause) {
    return err(cause instanceof Error ? cause.message : "That replacement could not be applied.");
  }
}
