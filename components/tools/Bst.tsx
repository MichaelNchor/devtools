"use client";

import { useMemo, useState } from "react";
import { Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { BST_META } from "@/lib/registry/metas";
import {
  buildTree, insert, remove, searchPath, traverse, layout, treeStats,
  TRAVERSALS, type Traversal,
} from "@/lib/tools/bst";
import { BST_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
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
  const [highlight, setHighlight] = useState<{ path: number[]; found: boolean } | null>(null);

  const tree = useMemo(() => buildTree(state.values), [state.values]);
  const nodes = useMemo(() => layout(tree), [tree]);
  const stats = useMemo(() => treeStats(tree), [tree]);
  const order = useMemo(() => traverse(tree, state.order), [tree, state.order]);
  const traversalInfo = TRAVERSALS.find((t) => t.value === state.order)!;

  const columns = Math.max(nodes.length, 1);
  const rows = Math.max(stats.height, 1);

  function apply(action: "insert" | "remove" | "search") {
    const value = Number(entry.trim());
    if (!Number.isFinite(value) || entry.trim() === "") return;
    setHighlight(null);
    if (action === "insert") update({ values: traverse(insert(tree, value), "level") });
    if (action === "remove") update({ values: traverse(remove(tree, value), "level") });
    if (action === "search") setHighlight(searchPath(tree, value));
    if (action !== "search") setEntry("");
  }

  return (
    <ToolShell
      meta={meta}
      shareState={state}
      examples={BST_EXAMPLES}
      onLoadExample={(example) => { setHighlight(null); update(example.state as Partial<State>); }}
      actions={
        <Button size="sm" onClick={() => { setHighlight(null); reset(); }}>
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
              onKeyDown={(e) => { if (e.key === "Enter") apply("insert"); }}
              inputMode="numeric"
              aria-label="Value to insert, remove, or find"
              placeholder="42"
              className="h-9 w-24 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg tabular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
          <Button size="sm" variant="primary" onClick={() => apply("insert")}>
            <Plus size={13} aria-hidden />
            Insert
          </Button>
          <Button size="sm" onClick={() => apply("search")}>
            <Search size={13} aria-hidden />
            Find
          </Button>
          <Button size="sm" variant="danger" onClick={() => apply("remove")}>
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
          {highlight ? (
            <span className={cx("ml-auto", highlight.found ? "text-up" : "text-rose")}>
              {highlight.found
                ? `✓ found in ${highlight.path.length} comparisons`
                : `✗ not present — ${highlight.path.length} comparisons to rule it out`}
            </span>
          ) : null}
        </div>

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
                const onPath = highlight?.path.includes(n.value) ?? false;
                const isTarget = onPath && highlight!.path.at(-1) === n.value;
                return (
                  <g key={n.value}>
                    <circle
                      cx={n.x * 56 + 28} cy={n.y * 64 + 32} r="19"
                      fill={isTarget
                        ? (highlight!.found ? "var(--up-tint)" : "var(--rose-tint)")
                        : onPath ? "var(--warn-tint)" : "var(--surface-2)"}
                      stroke={isTarget
                        ? (highlight!.found ? "var(--up)" : "var(--rose)")
                        : onPath ? "var(--warn)" : "var(--border)"}
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
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="eyebrow mb-1.5">{traversalInfo.label}</p>
            <p className="break-words font-ui text-[13px] text-fg tabular">
              {order.length > 0 ? order.join(" → ") : "—"}
            </p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-fg-muted">{traversalInfo.blurb}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="eyebrow mb-1.5">Why height matters</p>
            <p className="text-[12.5px] leading-relaxed text-fg-muted">
              Lookup costs one comparison per level, so a balanced tree of {stats.size} nodes
              finds anything in about {Math.max(1, Math.ceil(Math.log2(stats.size + 1)))} steps.
              This one is {stats.height} deep
              {stats.balanced ? "." : " — insert sorted values and it degenerates into a linked list, which is O(n)."}
            </p>
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
