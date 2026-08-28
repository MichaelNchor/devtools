"use client";

import { useMemo, useState } from "react";
import { Plus, RotateCcw, Search, SkipForward, Trash2 } from "lucide-react";
import { BST_META } from "@/lib/registry/metas";
import {
  buildTree, insert, remove, searchPath, traverse, layout, treeStats,
  TRAVERSALS, BST_PSEUDOCODE, operationFrames,
  type Traversal, type BstFrame, type BstOperation,
} from "@/lib/tools/bst";
import { BST_CODE } from "@/lib/tools/bst-code";
import { BST_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { CodeSwitcher } from "@/components/tool/CodeSwitcher";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cx } from "@/lib/cx";

interface State {
  values: number[];
  order: Traversal;
}

const DEFAULTS: State = { values: [50, 30, 70, 20, 40, 60, 80], order: "in" };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return Array.isArray(c.values) && c.values.every((n) => typeof n === "number")
    && TRAVERSALS.some((t) => t.value === c.order);
}

export function Bst() {
  const meta = BST_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);
  const [entry, setEntry] = useState("");
  // A recorded run the user steps through, rather than a jump to the answer.
  const [run, setRun] = useState<{ op: BstOperation; frames: BstFrame[] } | null>(null);
  const [step, setStep] = useState(0);

  const frame: BstFrame | null = run ? run.frames[Math.min(step, run.frames.length - 1)]! : null;
  const atEnd = run ? step >= run.frames.length - 1 : true;

  const committed = useMemo(() => buildTree(state.values), [state.values]);
  // While a run is playing the drawing follows its frames; otherwise it shows
  // the committed tree.
  const tree = frame ? frame.tree : committed;
  const nodes = useMemo(() => layout(tree), [tree]);
  const stats = useMemo(() => treeStats(tree), [tree]);
  const order = useMemo(() => traverse(tree, state.order), [tree, state.order]);
  const traversalInfo = TRAVERSALS.find((t) => t.value === state.order)!;

  const columns = Math.max(nodes.length, 1);
  const rows = Math.max(stats.height, 1);

  function start(op: BstOperation) {
    const value = Number(entry.trim());
    if (!Number.isFinite(value) || entry.trim() === "") return;
    setRun({ op, frames: operationFrames(committed, op, value) });
    setStep(0);
  }

  /** Steps forward, and commits the result once the run reaches its end. */
  function advance() {
    if (!run) return;
    const next = Math.min(step + 1, run.frames.length - 1);
    setStep(next);
    if (next === run.frames.length - 1 && run.op !== "search") {
      update({ values: traverse(run.frames[next]!.tree, "level") });
    }
  }

  function finish() {
    if (!run) return;
    const last = run.frames.length - 1;
    setStep(last);
    if (run.op !== "search") update({ values: traverse(run.frames[last]!.tree, "level") });
  }

  return (
    <ToolShell
      meta={meta}
      shareState={state}
      examples={BST_EXAMPLES}
      onLoadExample={(example) => { setRun(null); update(example.state as Partial<State>); }}
      actions={
        <Button size="sm" onClick={() => { setRun(null); reset(); }}>
          <RotateCcw size={13} aria-hidden />
          Reset
        </Button>
      }
      options={
        <>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Value</span>
            <input
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") start("insert"); }}
              inputMode="numeric"
              aria-label="Value to insert, remove, or find"
              placeholder="42"
              className="h-9 w-24 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg tabular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
          <Button size="sm" variant="primary" onClick={() => start("insert")}>
            <Plus size={13} aria-hidden />
            Insert
          </Button>
          <Button size="sm" onClick={() => start("search")}>
            <Search size={13} aria-hidden />
            Find
          </Button>
          <Button size="sm" variant="danger" onClick={() => start("remove")}>
            <Trash2 size={13} aria-hidden />
            Remove
          </Button>
          <label className="ml-auto flex items-center gap-2">
            <span className="eyebrow">Traversal</span>
            <Select
              value={state.order}
              ariaLabel="Traversal order"
              onChange={(order: Traversal) => update({ order })}
              options={TRAVERSALS.map((t) => ({ value: t.value, label: t.label }))}
            />
          </label>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg border border-border bg-surface px-3 py-2 font-ui text-[12px] text-fg tabular">
          <span>{stats.size} nodes</span>
          <span>height {stats.height}</span>
          <span className={stats.balanced ? "text-up" : "text-warn"}>
            {stats.balanced ? "✓ balanced" : "! unbalanced"}
          </span>
          {stats.min !== null ? <span className="text-fg-muted">min {stats.min} · max {stats.max}</span> : null}
          {run && atEnd ? (
            <span className={cx("ml-auto", frame!.found ? "text-up" : "text-rose")}>
              {frame!.found ? "✓ " : "✗ "}
              {frame!.path.length} comparison{frame!.path.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        {frame ? (
          <p aria-live="polite" className="rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] text-fg">
            {frame.note}
          </p>
        ) : null}

        <div className="overflow-x-auto rounded-lg border border-border bg-surface p-4">
          {nodes.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-fg-muted">
              The tree is empty. Insert a value to start building it.
            </p>
          ) : (
            <svg
              role="img"
              aria-label={`Binary search tree with ${stats.size} nodes, height ${stats.height}`}
              viewBox={`0 0 ${columns * 56} ${(rows + 1) * 64}`}
              className="mx-auto h-auto w-full"
              style={{ minWidth: `${columns * 44}px` }}
            >
              {nodes.map((n) => n.parent ? (
                <line
                  key={`edge-${n.value}`}
                  x1={n.x * 56 + 28} y1={n.y * 64 + 32}
                  x2={n.parent.x * 56 + 28} y2={n.parent.y * 64 + 32}
                  stroke="var(--border-2)" strokeWidth="2"
                />
              ) : null)}
              {nodes.map((n) => {
                const onPath = frame?.path.includes(n.value) ?? false;
                const isTarget = frame?.current === n.value;
                return (
                  <g key={n.value}>
                    <circle
                      cx={n.x * 56 + 28} cy={n.y * 64 + 32} r="19"
                      fill={isTarget
                        ? (atEnd && frame!.found ? "var(--up-tint)" : "var(--warn-tint)")
                        : onPath ? "var(--primary-tint)" : "var(--surface-2)"}
                      stroke={isTarget
                        ? (atEnd && frame!.found ? "var(--up)" : "var(--warn)")
                        : onPath ? "var(--primary)" : "var(--border)"}
                      strokeWidth="2"
                    />
                    <text
                      x={n.x * 56 + 28} y={n.y * 64 + 37}
                      textAnchor="middle"
                      className="font-ui"
                      fontSize="12"
                      fill="var(--fg)"
                    >
                      {n.value}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-inset p-4">
            <p className="eyebrow mb-1.5">{traversalInfo.label}</p>
            <p className="break-words font-ui text-[13px] text-fg tabular">
              {order.length > 0 ? order.join(" → ") : "—"}
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-fg-muted">{traversalInfo.blurb}</p>
          </div>
          <div className="rounded-lg border border-border bg-inset p-4">
            <p className="eyebrow mb-1.5">Why height matters</p>
            <p className="text-[12.5px] leading-relaxed text-fg-muted">
              Lookup costs one comparison per level, so a balanced tree of {stats.size} nodes
              finds anything in about {Math.max(1, Math.ceil(Math.log2(stats.size + 1)))} steps.
              This one is {stats.height} deep
              {stats.balanced ? "." : " — insert sorted values and it degenerates into a linked list, which is O(n)."}
            </p>
          </div>
        </div>

        <CodeSwitcher
          title={BST_PSEUDOCODE[run?.op ?? "search"].title}
          subtitle={run
            ? "The highlighted line is the step on screen"
            : "Run an operation above to step through it"}
          pseudocode={BST_PSEUDOCODE[run?.op ?? "search"].lines}
          activeLine={run ? frame!.line : null}
          implementations={BST_CODE[run?.op ?? "search"]}
          trailing={run ? (
            <>
              <span className="font-ui text-[11.5px] text-fg-muted tabular">
                Step {step + 1} of {run.frames.length}
              </span>
              <Button size="sm" onClick={advance} disabled={atEnd}>
                Step
                <SkipForward size={13} aria-hidden />
              </Button>
              <Button size="sm" onClick={finish} disabled={atEnd}>Finish</Button>
            </>
          ) : null}
        />
      </div>
    </ToolShell>
  );
}
