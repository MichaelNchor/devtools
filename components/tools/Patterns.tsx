"use client";

import { useMemo, useState } from "react";
import { PATTERNS_META } from "@/lib/registry/metas";
import {
  PATTERNS, TOPICS, PREP_SPLIT, PRIORITY_LABELS,
  learningOrder, totalTarget, type Priority,
} from "@/lib/tools/patterns";
import { PATTERNS_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { Segmented } from "@/components/ui/Segmented";
import { CodeSwitcher } from "@/components/tool/CodeSwitcher";
import { cx } from "@/lib/cx";

const PRIORITY_TONE: Record<Priority, string> = {
  1: "bg-rose-tint text-rose",
  2: "bg-warn-tint text-warn",
  3: "bg-surface-2 text-fg-muted",
};

export function Patterns() {
  const meta = PATTERNS_META;
  const [view, setView] = useState<"patterns" | "roadmap" | "split">("patterns");
  const [open, setOpen] = useState<string | null>(PATTERNS[0]!.name);
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PATTERNS;
    return PATTERNS.filter((p) =>
      [p.name, p.signal, p.idea, ...p.problems].join(" ").toLowerCase().includes(q));
  }, [query]);

  const order = learningOrder();

  return (
    <ToolShell
      meta={meta}
      examples={PATTERNS_EXAMPLES}
      onLoadExample={(example) => {
        setView((example.state.view as typeof view) ?? "patterns");
        setQuery((example.state.query as string) ?? "");
        if (example.state.open) setOpen(example.state.open as string);
      }}
      options={
        <>
          <Segmented
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: "patterns", label: "Patterns" },
              { value: "roadmap", label: "Roadmap" },
              { value: "split", label: "Prep split" },
            ]}
          />
          {view === "patterns" ? (
            <label className="flex items-center gap-2">
              <span className="eyebrow">Filter</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Filter patterns"
                placeholder="sliding window, cycle, top k…"
                className="h-9 w-56 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
            </label>
          ) : null}
        </>
      }
    >
      {view === "patterns" ? (
        <div className="flex flex-col gap-2.5">
          <p className="text-[12.5px] leading-relaxed text-fg-muted">
            Read the <span className="text-fg">signal</span>, not the problem name.
            &ldquo;Find the complement&rdquo; is a hash map before it is Two Sum —
            that recognition is what is actually being tested.
          </p>

          {shown.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-[12.5px] text-fg-muted">
              No pattern matches &ldquo;{query}&rdquo;.
            </p>
          ) : shown.map((pattern) => {
            const isOpen = open === pattern.name;
            return (
              <div key={pattern.name} className="overflow-hidden rounded-lg border border-border bg-surface">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : pattern.name)}
                  className="flex w-full items-baseline gap-3 px-3.5 py-3 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]"
                >
                  <span aria-hidden className="w-2 shrink-0 font-ui text-[11px] text-fg-muted">
                    {isOpen ? "▾" : "▸"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-ui text-[13px] font-semibold text-fg">{pattern.name}</span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-fg-muted">
                      {pattern.signal}
                    </span>
                  </span>
                  <span className="hidden shrink-0 font-ui text-[11.5px] text-fg-muted tabular sm:block">
                    {pattern.time}
                  </span>
                </button>

                {isOpen ? (
                  <div className="border-t border-border px-3.5 py-3">
                    <p className="text-[12.5px] leading-relaxed text-fg-2">{pattern.idea}</p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-ui text-[11.5px] text-fg-muted tabular">
                      <span>time {pattern.time}</span>
                      <span>space {pattern.space}</span>
                    </div>

                    <div className="mt-2.5">
                      <CodeSwitcher
                        title="Implementation"
                        pseudocodeLabel="Idea"
                        defaultTab="csharp"
                        pseudocode={[pattern.idea]}
                        implementations={pattern.code}
                      />
                    </div>

                    <p className="mt-2.5 text-[12px] text-fg-muted">
                      <span className="eyebrow mr-2">Practise</span>
                      {pattern.problems.join(" · ")}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : view === "roadmap" ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border border-border bg-inset px-4 py-3">
            <p className="text-[12.5px] leading-relaxed text-fg-2">
              About <span className="font-ui text-fg">{totalTarget()}</span> well-understood
              problems beats five hundred half-remembered ones. For each, be able to say
              why the approach works, what it costs in time and space, and which edge
              cases exist — that is the difference between recall and understanding.
            </p>
          </div>

          <ol className="flex flex-col gap-2">
            {order.map((topic, index) => (
              <li
                key={topic.name}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3.5 py-2.5"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-2 font-ui text-[12px] text-fg-2 tabular">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-ui text-[13px] font-semibold text-fg">{topic.name}</span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-fg-muted">{topic.note}</span>
                </span>
                {topic.target ? (
                  <span className="shrink-0 font-ui text-[11.5px] text-fg-muted tabular">
                    ~{topic.target} problems
                  </span>
                ) : null}
              </li>
            ))}
          </ol>

          <div className="mt-2 grid gap-3 md:grid-cols-3">
            {([1, 2, 3] as Priority[]).map((priority) => (
              <div key={priority} className="rounded-lg border border-border bg-surface p-3.5">
                <span className={cx("inline-block rounded-sm px-1.5 py-0.5 font-ui text-[11px] font-semibold", PRIORITY_TONE[priority])}>
                  {PRIORITY_LABELS[priority]}
                </span>
                <ul className="mt-2 flex flex-col gap-1">
                  {TOPICS.filter((t) => t.priority === priority).map((t) => (
                    <li key={t.name} className="text-[12px] text-fg-muted">{t.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[12.5px] leading-relaxed text-fg-muted">
            A rough split for a mid-level backend role. Big-tech-style interviews
            push DSA up to 40–50%; almost everywhere else, system design and real
            production experience carry as much weight as LeetCode does.
          </p>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            {PREP_SPLIT.map((slice) => (
              <div key={slice.area} className="flex items-center gap-3 border-b border-border px-3.5 py-2.5 last:border-0">
                <span className="w-40 shrink-0 font-ui text-[12.5px] font-semibold text-fg">{slice.area}</span>
                {/* The bar is reinforcement; the figure beside it is the fact. */}
                <span className="hidden h-2 flex-1 overflow-hidden rounded-full bg-surface-2 sm:block">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${slice.share * 2}%` }} />
                </span>
                <span className="w-10 shrink-0 text-right font-ui text-[12.5px] text-fg tabular">{slice.share}%</span>
                <span className="hidden w-64 shrink-0 text-[12px] text-fg-muted lg:block">{slice.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ToolShell>
  );
}
