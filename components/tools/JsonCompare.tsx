"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Eraser, FileJson } from "lucide-react";
import { JSON_COMPARE_META } from "@/lib/registry/metas";
import { compareJson, DEFAULT_COMPARE_OPTIONS, type CompareOptions } from "@/lib/tools/json-compare";
import { toRows, type DiffRow } from "@/lib/tools/json-compare-rows";
import { SAMPLE_LEFT, SAMPLE_RIGHT } from "@/lib/tools/json-compare-sample";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Select } from "@/components/ui/Select";
import { CodeArea } from "@/components/ui/CodeArea";
import { cx } from "@/lib/cx";

interface State {
  left: string;
  right: string;
  options: CompareOptions;
}

const DEFAULTS: State = { left: "", right: "", options: DEFAULT_COMPARE_OPTIONS };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as State;
  if (typeof candidate.left !== "string" || typeof candidate.right !== "string") return false;
  if (typeof candidate.options !== "object" || candidate.options === null) return false;
  // Every field is checked because this also validates state arriving from a
  // share hash, which is untrusted input. A half-checked options object would
  // put a string where the engine expects a number.
  const o = candidate.options;
  return typeof o.ignoreKeyOrder === "boolean"
    && typeof o.ignoreWhitespace === "boolean"
    && typeof o.ignoreCase === "boolean"
    && typeof o.arrayKeyField === "string"
    && typeof o.numericTolerance === "number" && Number.isFinite(o.numericTolerance)
    && ["index", "value", "key"].includes(o.arrayMatching);
}

const ROW_TINT: Record<DiffRow["kind"], string> = {
  unchanged: "",
  added: "bg-up-tint",
  removed: "bg-rose-tint",
  changed: "bg-warn-tint",
  "type-changed": "bg-warn-tint",
};

const GUTTER_TEXT: Record<DiffRow["kind"], string> = {
  unchanged: "text-fg-muted",
  added: "text-up",
  removed: "text-rose",
  changed: "text-warn",
  "type-changed": "text-warn",
};

function Pane({
  rows, side, label, activeIndex, scrollRef,
}: {
  rows: DiffRow[];
  side: "leftText" | "rightText";
  label: string;
  activeIndex: number | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-surface shadow-sm">
      <p className="eyebrow border-b border-border px-3 py-2">{label}</p>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <pre className="w-max min-w-full font-ui text-[12.5px] leading-[1.6]">
          {rows.map((row) => {
            const text = row[side];
            return (
              <div
                key={`${row.index}-${side}`}
                data-row={row.index}
                className={cx(
                  "flex items-start px-2",
                  ROW_TINT[row.kind],
                  activeIndex === row.index && "ring-1 ring-inset ring-[var(--ring)]",
                )}
              >
                {/* The glyph, not the tint, is what carries the classification. */}
                <span aria-hidden className={cx("w-4 shrink-0 select-none", GUTTER_TEXT[row.kind])}>
                  {row.gutter}
                </span>
                <span className="whitespace-pre text-fg">
                  {text === null ? " " : `${"  ".repeat(row.depth)}${text}`}
                </span>
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

export function JsonCompare() {
  // Read by import, not by prop: the [slug] route renders this from the server
  // and the meta carries an icon, which cannot cross that boundary as a prop.
  const meta = JSON_COMPARE_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const leftScroll = useRef<HTMLDivElement>(null);
  const rightScroll = useRef<HTMLDivElement>(null);

  const result = useMemo(
    () => (state.left.trim() && state.right.trim()
      ? compareJson(state.left, state.right, state.options)
      : null),
    [state.left, state.right, state.options],
  );

  const rows = useMemo(() => (result?.ok ? toRows(result.value.root) : []), [result]);
  const differences = useMemo(() => rows.filter((r) => r.isDifference), [rows]);

  // The panes are two independent scroll containers holding the same number of
  // lines, so mirroring scrollTop keeps matched keys on the same screen line.
  useEffect(() => {
    const left = leftScroll.current;
    const right = rightScroll.current;
    if (!left || !right) return;
    let syncing = false;
    const mirror = (from: HTMLDivElement, to: HTMLDivElement) => () => {
      if (syncing) return;
      syncing = true;
      to.scrollTop = from.scrollTop;
      requestAnimationFrame(() => { syncing = false; });
    };
    const onLeft = mirror(left, right);
    const onRight = mirror(right, left);
    left.addEventListener("scroll", onLeft);
    right.addEventListener("scroll", onRight);
    return () => {
      left.removeEventListener("scroll", onLeft);
      right.removeEventListener("scroll", onRight);
    };
  }, [rows.length]);

  function jump(direction: 1 | -1) {
    if (differences.length === 0) return;
    const current = differences.findIndex((r) => r.index === activeIndex);
    const next = current === -1
      ? (direction === 1 ? 0 : differences.length - 1)
      : (current + direction + differences.length) % differences.length;
    const target = differences[next]!;
    setActiveIndex(target.index);
    leftScroll.current
      ?.querySelector(`[data-row="${target.index}"]`)
      ?.scrollIntoView({ block: "center" });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      // Only when the user is reading the diff, never while typing in a pane.
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      // A bare n/p is ours; with a modifier it belongs to the browser or the
      // OS, and swallowing Cmd-N would cost the user a new window.
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "n") { event.preventDefault(); jump(1); }
      if (event.key === "p") { event.preventDefault(); jump(-1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const stats = result?.ok ? result.value.stats : null;
  const setOption = (patch: Partial<CompareOptions>) =>
    update({ options: { ...state.options, ...patch } });

  return (
    <ToolShell
      meta={meta}
      shareState={state}
      actions={
        <>
          <Button size="sm" onClick={() => update({ left: SAMPLE_LEFT, right: SAMPLE_RIGHT })}>
            <FileJson size={13} aria-hidden />
            Load sample
          </Button>
          <Button size="sm" onClick={reset}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
        </>
      }
      options={
        <>
          <Toggle
            checked={state.options.ignoreKeyOrder}
            onChange={(v) => setOption({ ignoreKeyOrder: v })}
            label="Ignore key order"
          />
          <Toggle
            checked={state.options.ignoreWhitespace}
            onChange={(v) => setOption({ ignoreWhitespace: v })}
            label="Ignore whitespace"
          />
          <Toggle
            checked={state.options.ignoreCase}
            onChange={(v) => setOption({ ignoreCase: v })}
            label="Ignore case"
          />
          <label className="flex items-center gap-2">
            <span className="eyebrow">Arrays</span>
            <Select
              value={state.options.arrayMatching}
              ariaLabel="Array matching mode"
              onChange={(v) => setOption({ arrayMatching: v })}
              options={[
                { value: "index", label: "By index" },
                { value: "value", label: "By value" },
                { value: "key", label: "By key field" },
              ]}
            />
          </label>
          {state.options.arrayMatching === "key" ? (
            <label className="flex items-center gap-2">
              <span className="eyebrow">Key field</span>
              <input
                value={state.options.arrayKeyField}
                onChange={(e) => setOption({ arrayKeyField: e.target.value })}
                aria-label="Array key field"
                className="h-9 w-24 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
            </label>
          ) : null}
          <label className="flex items-center gap-2">
            <span className="eyebrow">Tolerance</span>
            <input
              type="number"
              step="any"
              min="0"
              value={state.options.numericTolerance}
              onChange={(e) => setOption({ numericTolerance: Number(e.target.value) || 0 })}
              aria-label="Numeric tolerance"
              className="h-9 w-24 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
        </>
      }
    >
      <div className="flex h-[calc(100dvh-15rem)] min-h-[26rem] flex-col gap-3">
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <CodeArea
            value={state.left}
            onChange={(left) => update({ left })}
            ariaLabel="Left JSON"
            placeholder="Paste the original JSON"
          />
          <CodeArea
            value={state.right}
            onChange={(right) => update({ right })}
            ariaLabel="Right JSON"
            placeholder="Paste the JSON to compare against"
          />
        </div>

        {result && !result.ok ? <ErrorNote error={result.error} /> : null}

        {stats ? (
          <div className="flex flex-wrap items-center gap-4 rounded-lg bg-surface px-4 py-2.5 shadow-sm">
            {/* Every figure carries its word, so the row reads without colour. */}
            <span className="font-ui text-[12.5px] text-up tabular">+{stats.added} added</span>
            <span className="font-ui text-[12.5px] text-rose tabular">-{stats.removed} removed</span>
            <span className="font-ui text-[12.5px] text-warn tabular">~{stats.changed} changed</span>
            <span className="font-ui text-[12.5px] text-warn tabular">!{stats.typeChanged} retyped</span>
            <span className="font-ui text-[12.5px] text-fg-muted tabular">{stats.total} nodes compared</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[12px] text-fg-muted">
                {differences.length === 0 ? "No differences" : `${differences.length} differing lines`}
              </span>
              <Button size="sm" onClick={() => jump(-1)} disabled={!differences.length}>Prev</Button>
              <Button size="sm" onClick={() => jump(1)} disabled={!differences.length}>Next</Button>
            </div>
          </div>
        ) : null}

        {rows.length > 0 ? (
          <div className="flex min-h-0 flex-[2] gap-3">
            <Pane rows={rows} side="leftText" label="Left" activeIndex={activeIndex} scrollRef={leftScroll} />
            <Pane rows={rows} side="rightText" label="Right" activeIndex={activeIndex} scrollRef={rightScroll} />
          </div>
        ) : (
          // An empty surface teaches: say what goes here and offer the sample.
          <div className="flex flex-[2] items-center justify-center rounded-lg bg-surface p-8 text-center shadow-sm">
            <p className="max-w-sm text-[13px] leading-relaxed text-fg-muted">
              Paste JSON into both panes to see a structural diff. Formatting
              differences are ignored — only the data is compared.
            </p>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
