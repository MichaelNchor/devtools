"use client";

import { useMemo } from "react";
import { Eraser, FileJson } from "lucide-react";
import { JSON_FORMAT_META } from "@/lib/registry/metas";
import {
  formatJson, DEFAULT_FORMAT_OPTIONS,
  type FormatOptions, type IndentStyle, type SortMode,
} from "@/lib/tools/json-format";
import { JSON_FORMAT_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Segmented } from "@/components/ui/Segmented";
import { CodeArea } from "@/components/ui/CodeArea";
import { JsonCode } from "@/components/ui/JsonCode";
import { JsonTree } from "./JsonTree";

interface State {
  input: string;
  options: FormatOptions;
  view: "raw" | "tree";
}

const DEFAULTS: State = { input: "", options: DEFAULT_FORMAT_OPTIONS, view: "raw" };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as State;
  if (typeof candidate.input !== "string") return false;
  if (typeof candidate.options !== "object" || candidate.options === null) return false;
  const o = candidate.options;
  return typeof o.minify === "boolean"
    && ["2", "4", "tab"].includes(o.indent)
    && ["off", "asc", "desc"].includes(o.sort)
    && ["raw", "tree"].includes(candidate.view);
}

export function JsonFormat() {
  const meta = JSON_FORMAT_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);

  const result = useMemo(
    () => (state.input.trim() ? formatJson(state.input, state.options) : null),
    [state.input, state.options],
  );

  // The tree renders the parsed value, which is exactly the formatted output
  // read back. Parsing the OUTPUT rather than the input means the tree always
  // agrees with what the raw view shows.
  const parsed = useMemo(() => {
    if (!result?.ok) return null;
    try { return JSON.parse(result.value) as unknown; } catch { return null; }
  }, [result]);

  const setOption = (patch: Partial<FormatOptions>) =>
    update({ options: { ...state.options, ...patch } });

  return (
    <ToolShell
      meta={meta}
      examples={JSON_FORMAT_EXAMPLES}
      onLoadExample={(example) => update(example.state as Partial<State>)}
      isEmpty={!state.input.trim()}
      emptyHint={"Paste JSON to beautify, minify, sort its keys, or browse it as a collapsible tree."}
      shareState={state}
      actions={
        <>
          <Button size="sm" onClick={reset}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
          {result?.ok ? <CopyButton text={result.value} label="Copy output" /> : null}
        </>
      }
      options={
        <>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Indent</span>
            <Select
              value={state.options.indent}
              ariaLabel="Indent width"
              onChange={(indent: IndentStyle) => setOption({ indent })}
              options={[
                { value: "2", label: "2 spaces" },
                { value: "4", label: "4 spaces" },
                { value: "tab", label: "Tab" },
              ]}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Sort keys</span>
            <Select
              value={state.options.sort}
              ariaLabel="Sort keys"
              onChange={(sort: SortMode) => setOption({ sort })}
              options={[
                { value: "off", label: "Off" },
                { value: "asc", label: "A → Z" },
                { value: "desc", label: "Z → A" },
              ]}
            />
          </label>
          <Segmented
            label="Output density"
            value={state.options.minify ? "minify" : "beautify"}
            onChange={(mode) => setOption({ minify: mode === "minify" })}
            options={[
              { value: "beautify", label: "Beautify" },
              { value: "minify", label: "Minify" },
            ]}
          />
          <div className="ml-auto">
            <Segmented
              label="Output view"
              value={state.view}
              onChange={(view) => update({ view })}
              options={[
                { value: "raw", label: "Raw" },
                { value: "tree", label: "Tree" },
              ]}
            />
          </div>
        </>
      }
    >
      <div className="flex h-[calc(100dvh-15rem)] min-h-[26rem] flex-col gap-3">
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <CodeArea
            value={state.input}
            onChange={(input) => update({ input })}
            ariaLabel="JSON input"
            placeholder="Paste JSON to format"
          />

          {result === null ? (
            <div className="flex items-center justify-center rounded-md border border-border bg-surface p-8 text-center">
              <p className="max-w-sm text-[13px] leading-relaxed text-fg-muted">
                Paste JSON on the left to beautify, minify, sort its keys, or
                browse it as a tree.
              </p>
            </div>
          ) : !result.ok ? (
            <div className="flex items-start rounded-md border border-border bg-surface p-3">
              <ErrorNote error={result.error} />
            </div>
          ) : state.view === "tree" && parsed !== null ? (
            <JsonTree value={parsed} />
          ) : (
            <div className="min-h-0 overflow-auto rounded-md border border-border bg-surface p-3">
              <JsonCode text={result.value} />
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
