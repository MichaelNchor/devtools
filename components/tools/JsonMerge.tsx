"use client";

import { useMemo } from "react";
import { Eraser, Merge } from "lucide-react";
import { JSON_MERGE_META } from "@/lib/registry/metas";
import {
  mergeJson, DEFAULT_MERGE_OPTIONS,
  type ArrayStrategy, type ConflictKind, type MergeOptions,
} from "@/lib/tools/json-merge";
import { JSON_MERGE_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Segmented } from "@/components/ui/Segmented";
import { CodeArea } from "@/components/ui/CodeArea";
import { Panel, EmptyOutput } from "@/components/ui/Panel";
import { JsonPanel } from "@/components/ui/JsonPanel";
import { JsonViewer } from "@/components/ui/JsonViewer";

interface State {
  left: string;
  right: string;
  options: MergeOptions;
  indent: number;
}

const DEFAULTS: State = { left: "", right: "", options: DEFAULT_MERGE_OPTIONS, indent: 2 };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  if (typeof c.left !== "string" || typeof c.right !== "string") return false;
  if (typeof c.indent !== "number" || !Number.isFinite(c.indent)) return false;
  if (typeof c.options !== "object" || c.options === null) return false;
  return typeof c.options.keyField === "string"
    && ["auto", "union", "concat", "replace", "by-key"].includes(c.options.arrays)
    && ["left", "right"].includes(c.options.onConflict);
}

const CONFLICT_KIND: Record<ConflictKind, { glyph: string; label: string; tone: string }> = {
  subtree: { glyph: "!", label: "object replaced", tone: "bg-rose-tint text-rose" },
  type: { glyph: "~", label: "type changed", tone: "bg-warn-tint text-warn" },
  value: { glyph: "·", label: "value differs", tone: "bg-surface-2 text-fg-2" },
};

/** Long values are unreadable in a table cell; the full text stays in title. */
function preview(value: unknown): { short: string; full: string } {
  const full = JSON.stringify(value) ?? String(value);
  return { full, short: full.length > 44 ? `${full.slice(0, 43)}…` : full };
}

export function JsonMerge() {
  const meta = JSON_MERGE_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);

  const result = useMemo(
    () => (state.left.trim() && state.right.trim()
      ? mergeJson(state.left, state.right, state.options)
      : null),
    [state.left, state.right, state.options],
  );

  const output = result?.ok ? JSON.stringify(result.value.value, null, state.indent) : "";
  const setOption = (patch: Partial<MergeOptions>) =>
    update({ options: { ...state.options, ...patch } });

  return (
    <ToolShell
      meta={meta}
      shareState={state}
      examples={JSON_MERGE_EXAMPLES}
      onLoadExample={(example) => update(example.state as Partial<State>)}
      isEmpty={!state.left.trim() && !state.right.trim()}
      emptyHint="Paste JSON into both panes to combine them into one document — nested objects merged, records matched on their identity field, and repeated items dropped."
      actions={
        <>
          <Button size="sm" onClick={reset}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
          {output ? <CopyButton text={output} label="Copy merged" /> : null}
        </>
      }
      options={
        <>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Arrays</span>
            <Select
              value={state.options.arrays}
              ariaLabel="How to combine arrays"
              onChange={(arrays: ArrayStrategy) => setOption({ arrays })}
              options={[
                { value: "auto", label: "Auto (match records, else union)" },
                { value: "union", label: "Union (no repeats)" },
                { value: "concat", label: "Concatenate (keep all)" },
                { value: "by-key", label: "Merge by key field" },
                { value: "replace", label: "Right replaces left" },
              ]}
            />
          </label>

          {state.options.arrays === "by-key" ? (
            <label className="flex items-center gap-2">
              <span className="eyebrow">Key field</span>
              <input
                value={state.options.keyField}
                onChange={(e) => setOption({ keyField: e.target.value })}
                aria-label="Field that identifies an array item"
                className="h-9 w-24 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]"
              />
            </label>
          ) : null}

          <Segmented
            label="On conflict"
            value={state.options.onConflict}
            onChange={(onConflict) => setOption({ onConflict })}
            options={[
              { value: "left", label: "Left wins" },
              { value: "right", label: "Right wins" },
            ]}
          />

          <label className="flex items-center gap-2">
            <span className="eyebrow">Indent</span>
            <Select
              value={String(state.indent)}
              ariaLabel="Indent width"
              onChange={(indent) => update({ indent: Number(indent) })}
              options={[{ value: "2", label: "2 spaces" }, { value: "4", label: "4 spaces" }]}
            />
          </label>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {result && !result.ok ? <ErrorNote error={result.error} /> : null}

        {result?.ok ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border bg-surface px-3 py-2 font-ui text-[12px] tabular">
            <span className="text-up">+{result.value.stats.added} keys added</span>
            <span className={result.value.stats.conflicts > 0 ? "text-warn" : "text-fg-muted"}>
              {result.value.stats.conflicts > 0 ? "! " : ""}
              {result.value.stats.conflicts} conflict
              {result.value.stats.conflicts === 1 ? "" : "s"}
            </span>
            {result.value.stats.subtreesDropped > 0 ? (
              <span className="text-rose">
                ! {result.value.stats.subtreesDropped} whole
                {result.value.stats.subtreesDropped === 1 ? " object" : " objects"} replaced
              </span>
            ) : null}
            <span className="text-fg-muted">
              {result.value.stats.deduplicated} duplicate
              {result.value.stats.deduplicated === 1 ? "" : "s"} dropped
            </span>
            {Object.keys(result.value.stats.matchedOn).length > 0 ? (
              <span className="text-sky">
                matched records on{" "}
                {[...new Set(Object.values(result.value.stats.matchedOn))]
                  .map((f) => `"${f}"`)
                  .join(", ")}
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="grid min-h-0 gap-3 lg:grid-cols-2">
          <JsonPanel
            title="Left"
            subtitle="The base document"
            className="h-workspace-sm"
            value={state.left}
            onChange={(left) => update({ left })}
            ariaLabel="Left JSON"
            placeholder="Paste the base JSON"
          />
          <JsonPanel
            title="Right"
            subtitle="Merged on top of the base"
            className="h-workspace-sm"
            value={state.right}
            onChange={(right) => update({ right })}
            ariaLabel="Right JSON"
            placeholder="Paste the JSON to merge in"
          />
        </div>

        {result?.ok && result.value.conflicts.length > 0 ? (
          <Panel
            title={`${result.value.conflicts.length} conflict${result.value.conflicts.length === 1 ? "" : "s"}`}
            subtitle={`Both sides had a value here. ${state.options.onConflict === "left" ? "Left" : "Right"} was kept.`}
          >
            <div className="max-h-72 overflow-auto">
              <table className="w-full font-ui text-[12px]">
                <thead className="sticky top-0 bg-surface text-left text-fg-muted">
                  <tr>
                    <th className="px-3 py-1.5 font-medium">Path</th>
                    <th className="px-3 py-1.5 font-medium">What happened</th>
                    <th className="px-3 py-1.5 font-medium">Discarded</th>
                    <th className="px-3 py-1.5 font-medium">Kept</th>
                  </tr>
                </thead>
                <tbody>
                  {result.value.conflicts.map((conflict) => {
                    const kind = CONFLICT_KIND[conflict.kind];
                    const discarded = preview(
                      state.options.onConflict === "left" ? conflict.right : conflict.left,
                    );
                    const kept = preview(conflict.taken);
                    return (
                      <tr key={conflict.path} className="border-t border-border align-top">
                        <td className="px-3 py-2 text-[var(--code-key)]">{conflict.path}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block rounded-sm px-1.5 py-0.5 ${kind.tone}`}>
                            <span aria-hidden>{kind.glyph} </span>{kind.label}
                          </span>
                          {conflict.lost > 0 ? (
                            <span className="ml-2 text-rose">
                              {conflict.lost} value{conflict.lost === 1 ? "" : "s"} lost
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-fg-muted line-through" title={discarded.full}>
                          {discarded.short}
                        </td>
                        <td className="px-3 py-2 text-fg" title={kept.full}>{kept.short}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : null}

        {result?.ok && Object.keys(result.value.stats.matchedOn).length > 0 ? (
          <Panel
            title="Matched records"
            subtitle="Arrays of records were combined on a detected identity field"
          >
            <div className="max-h-40 overflow-auto">
              {Object.entries(result.value.stats.matchedOn).map(([path, field]) => (
                <div key={path} className="flex items-baseline gap-3 border-b border-border px-3 py-1.5 last:border-0">
                  <code className="font-ui text-[12px] text-[var(--code-key)]">{path}</code>
                  <span className="font-ui text-[12px] text-fg-muted">
                    matched on <span className="text-fg">{field}</span>
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        <Panel
          title="Merged"
          subtitle="Both documents combined"
          className="min-h-[16rem]"
          actions={output ? <CopyButton text={output} label="Copy" /> : null}
        >
          {result?.ok && output ? (
            <JsonViewer value={result.value.value} className="h-full" />
          ) : (
            <EmptyOutput>The merged document will appear here.</EmptyOutput>
          )}
        </Panel>

      </div>
    </ToolShell>
  );
}
