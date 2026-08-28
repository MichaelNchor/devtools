"use client";

import { useMemo } from "react";
import { Eraser, Regex as RegexIcon } from "lucide-react";
import { REGEX_META } from "@/lib/registry/metas";
import { runRegex, replaceWithRegex, REGEX_LIBRARY } from "@/lib/tools/regex";
import { REGEX_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { CodeArea } from "@/components/ui/CodeArea";
import { cx } from "@/lib/cx";

const FLAGS = ["g", "i", "m", "s", "u", "y"] as const;

interface State {
  pattern: string;
  flags: string;
  text: string;
  replacement: string;
}

const DEFAULTS: State = { pattern: "", flags: "g", text: "", replacement: "" };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return typeof c.pattern === "string" && typeof c.flags === "string"
    && typeof c.text === "string" && typeof c.replacement === "string";
}

/** Splits the text into matched and unmatched runs for highlighting. */
function segments(text: string, matches: { index: number; text: string }[]) {
  const out: { text: string; matched: boolean }[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.index > cursor) out.push({ text: text.slice(cursor, match.index), matched: false });
    if (match.text.length > 0) out.push({ text: match.text, matched: true });
    cursor = Math.max(cursor, match.index + match.text.length);
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), matched: false });
  return out;
}

export function RegexTester() {
  const meta = REGEX_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);

  const result = useMemo(
    () => (state.pattern ? runRegex(state.pattern, state.flags, state.text) : null),
    [state.pattern, state.flags, state.text],
  );
  const replaced = useMemo(
    () => (state.pattern && state.replacement
      ? replaceWithRegex(state.pattern, state.flags, state.text, state.replacement)
      : null),
    [state.pattern, state.flags, state.text, state.replacement],
  );

  const report = result?.ok ? result.value : null;

  function toggleFlag(flag: string) {
    update({
      flags: state.flags.includes(flag)
        ? state.flags.replace(flag, "")
        : state.flags + flag,
    });
  }

  return (
    <ToolShell
      meta={meta}
      examples={REGEX_EXAMPLES}
      onLoadExample={(example) => update(example.state as Partial<State>)}
      isEmpty={!state.pattern.trim()}
      emptyHint={"Write a pattern to see live matches, a capture-group table, and a replacement preview."}
      shareState={state}
      actions={
        <>
          <Button size="sm" onClick={reset}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
        </>
      }
      options={
        <>
          <div role="group" aria-label="Regex flags" className="flex items-center gap-1">
            <span className="eyebrow mr-1">Flags</span>
            {FLAGS.map((flag) => (
              <button
                key={flag}
                type="button"
                aria-pressed={state.flags.includes(flag)}
                onClick={() => toggleFlag(flag)}
                className={cx(
                  "h-7 w-7 rounded-md font-ui text-[12px] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                  state.flags.includes(flag)
                    ? "bg-primary text-on-primary"
                    : "bg-surface-2 text-fg-muted hover:text-fg",
                )}
              >
                {flag}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Library</span>
            <Select
              value=""
              ariaLabel="Load a common pattern"
              onChange={(name) => {
                const entry = REGEX_LIBRARY.find((e) => e.name === name);
                if (entry) update({ pattern: entry.pattern, flags: entry.flags });
              }}
              options={[
                { value: "", label: "Choose…" },
                ...REGEX_LIBRARY.map((e) => ({ value: e.name, label: e.name })),
              ]}
            />
          </label>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="font-ui text-[15px] text-fg-muted">/</span>
          <input
            value={state.pattern}
            onChange={(e) => update({ pattern: e.target.value })}
            aria-label="Regular expression"
            placeholder="pattern"
            spellCheck={false}
            className="h-11 flex-1 rounded-md border border-border bg-surface px-3 font-ui text-[14px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
          <span className="font-ui text-[15px] text-fg-muted">/{state.flags}</span>
        </div>

        {result && !result.ok ? <ErrorNote error={result.error} /> : null}

        {report?.riskyPattern ? (
          // Honest wording: this is a shape warning, not a guarantee.
          <p className="rounded-md bg-warn-tint px-3 py-2 text-[12.5px] text-warn">
            ! Nested quantifiers — this pattern may backtrack catastrophically on
            some inputs. Matching is not interruptible once it starts.
          </p>
        ) : null}

        {report?.truncated ? (
          <p className="rounded-md bg-warn-tint px-3 py-2 text-[12.5px] text-warn">
            ! Showing the first {report.matches.length} matches only.
          </p>
        ) : null}

        {report?.timedOut ? (
          <p className="rounded-md bg-warn-tint px-3 py-2 text-[12.5px] text-warn">
            ! Stopped early — this pattern was taking too long over your text.
          </p>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p className="eyebrow">Test text</p>
            <CodeArea
              value={state.text}
              onChange={(text) => update({ text })}
              ariaLabel="Test text"
              placeholder="Text to match against"
              className="h-40"
            />
            {report ? (
              <div className="min-h-24 overflow-auto rounded-md border border-border bg-surface p-3">
                <p className="eyebrow mb-1.5">
                  {report.matches.length} match{report.matches.length === 1 ? "" : "es"}
                </p>
                <pre className="whitespace-pre-wrap break-words font-ui text-[12.5px] text-fg">
                  {segments(state.text, report.matches).map((part, index) => (
                    <span
                      key={index}
                      className={part.matched ? "rounded-sm bg-up-tint text-up underline decoration-dotted" : ""}
                    >
                      {part.text}
                    </span>
                  ))}
                </pre>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <p className="eyebrow">Capture groups</p>
            <div className="min-h-24 max-h-64 overflow-auto rounded-md border border-border bg-surface">
              {report && report.matches.length > 0 ? (
                <table className="w-full font-ui text-[12px]">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="text-left text-fg-muted">
                      <th className="px-2 py-1 font-medium">#</th>
                      <th className="px-2 py-1 font-medium">Group</th>
                      <th className="px-2 py-1 font-medium">Value</th>
                      <th className="px-2 py-1 font-medium">At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.matches.flatMap((match, matchIndex) =>
                      match.groups.map((group, groupIndex) => (
                        <tr key={`${matchIndex}-${groupIndex}`} className="border-t border-border">
                          <td className="px-2 py-1 text-fg-muted tabular">{matchIndex + 1}</td>
                          <td className="px-2 py-1 text-fg">{group.name ?? groupIndex + 1}</td>
                          <td className="px-2 py-1 text-fg">
                            {group.value === undefined
                              ? <span className="text-fg-muted">did not participate</span>
                              : JSON.stringify(group.value)}
                          </td>
                          <td className="px-2 py-1 text-fg-muted tabular">
                            {group.index === -1 ? "—" : group.index}
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              ) : (
                <p className="p-3 text-[12.5px] text-fg-muted">
                  No captures yet. Groups appear here once the pattern matches.
                </p>
              )}
            </div>

            <p className="eyebrow">Replace preview</p>
            <input
              value={state.replacement}
              onChange={(e) => update({ replacement: e.target.value })}
              aria-label="Replacement"
              placeholder="$1 or $<name>"
              className="h-9 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
            {replaced?.ok ? (
              <div className="flex items-start gap-2">
                <pre className="min-w-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-md border border-border bg-surface p-3 font-ui text-[12.5px] text-fg">
                  {replaced.value}
                </pre>
                <CopyButton text={replaced.value} label="Copy" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
