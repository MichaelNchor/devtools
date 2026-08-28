"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Eraser, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { PATHFINDING_META } from "@/lib/registry/metas";
import {
  makeGrid, searchFrames, toggleWall, PATH_ALGORITHMS,
  type Cell, type Grid, type PathAlgorithm,
} from "@/lib/tools/pathfinding";
import { PATHFINDING_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cx } from "@/lib/cx";

const ROWS = 12;
const COLS = 22;

export function Pathfinding() {
  const meta = PATHFINDING_META;
  const [grid, setGrid] = useState<Grid>(() => makeGrid(ROWS, COLS));
  const [algorithm, setAlgorithm] = useState<PathAlgorithm>("bfs");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const painting = useRef(false);

  const frames = useMemo(() => searchFrames(grid, algorithm), [grid, algorithm]);
  const frame = frames[Math.min(step, frames.length - 1)]!;
  const info = PATH_ALGORITHMS.find((a) => a.value === algorithm)!;

  // Editing the maze or switching algorithm invalidates the current position.
  useEffect(() => { setStep(0); setPlaying(false); }, [grid, algorithm]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setStep((s) => {
        if (s >= frames.length - 1) { setPlaying(false); return s; }
        return s + 1;
      });
    }, 28);
    return () => clearInterval(id);
  }, [playing, frames.length]);

  const inSet = (cells: Cell[], r: number, c: number) =>
    cells.some((x) => x.row === r && x.col === c);

  return (
    <ToolShell
      meta={meta}
      examples={PATHFINDING_EXAMPLES}
      onLoadExample={(example) => {
        const walls = new Set((example.state.walls as string[]) ?? []);
        setGrid({ ...makeGrid(ROWS, COLS), walls });
        setAlgorithm((example.state.algorithm as PathAlgorithm) ?? "bfs");
      }}
      actions={
        <>
          <Button size="sm" onClick={() => setGrid((g) => ({ ...g, walls: new Set() }))}>
            <Eraser size={13} aria-hidden />
            Clear walls
          </Button>
          <Button size="sm" onClick={() => { setGrid(makeGrid(ROWS, COLS)); setStep(0); }}>
            <RotateCcw size={13} aria-hidden />
            Reset
          </Button>
        </>
      }
      options={
        <>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Algorithm</span>
            <Select
              value={algorithm}
              ariaLabel="Search algorithm"
              onChange={(a: PathAlgorithm) => setAlgorithm(a)}
              options={PATH_ALGORITHMS.map((a) => ({ value: a.value, label: a.label }))}
            />
          </label>
          <Button
            size="sm"
            variant="primary"
            onClick={() => { if (step >= frames.length - 1) setStep(0); setPlaying((p) => !p); }}
          >
            {playing ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />}
            {playing ? "Pause" : "Run"}
          </Button>
          <Button
            size="sm"
            onClick={() => setStep((s) => Math.min(frames.length - 1, s + 1))}
            disabled={step >= frames.length - 1}
          >
            Step
            <SkipForward size={13} aria-hidden />
          </Button>
          <span className="font-ui text-[12px] text-fg-muted tabular">
            {frame.visited.length} explored
          </span>
          {frame.found ? (
            <span className="font-ui text-[12px] text-up tabular">
              ✓ path of {frame.path.length - 1} steps
            </span>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[12.5px] text-fg-muted">
          Click or drag on the grid to draw walls, then run the search.
        </p>

        <div
          className="overflow-x-auto rounded-lg border border-border bg-surface p-3"
          onMouseLeave={() => { painting.current = false; }}
        >
          <div
            role="grid"
            aria-label="Pathfinding grid"
            className="mx-auto grid w-max gap-[2px]"
            style={{ gridTemplateColumns: `repeat(${COLS}, 1.35rem)` }}
          >
            {Array.from({ length: ROWS }, (_, r) =>
              Array.from({ length: COLS }, (_, c) => {
                const isStart = grid.start.row === r && grid.start.col === c;
                const isGoal = grid.goal.row === r && grid.goal.col === c;
                const isWall = grid.walls.has(`${r},${c}`);
                const onPath = inSet(frame.path, r, c);
                const isCurrent = frame.current?.row === r && frame.current.col === c;
                const isFrontier = inSet(frame.frontier, r, c);
                const isVisited = inSet(frame.visited, r, c);

                const label = isStart ? "Start" : isGoal ? "Goal" : isWall ? "Wall" : "Open";
                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    aria-label={`Row ${r + 1}, column ${c + 1}: ${label}`}
                    onMouseDown={() => { painting.current = true; setGrid((g) => toggleWall(g, { row: r, col: c })); }}
                    onMouseEnter={() => { if (painting.current) setGrid((g) => toggleWall(g, { row: r, col: c })); }}
                    onMouseUp={() => { painting.current = false; }}
                    className={cx(
                      "h-[1.35rem] w-[1.35rem] rounded-sm transition-colors duration-100",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                      isStart ? "bg-up-solid"
                        : isGoal ? "bg-rose-solid"
                          : isWall ? "bg-fg-2"
                            : onPath ? "bg-warn-solid"
                              : isCurrent ? "bg-primary"
                                : isFrontier ? "bg-primary/35"
                                  : isVisited ? "bg-primary-tint" : "bg-surface-2",
                    )}
                  />
                );
              }),
            )}
          </div>
        </div>

        {/* Position and shape carry nothing here, so the legend spells out
            every colour and the caption narrates the step in words. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-surface px-3 py-2 text-[12px]">
          {[
            ["bg-up-solid", "start"], ["bg-rose-solid", "goal"], ["bg-fg-2", "wall"],
            ["bg-primary-tint", "explored"], ["bg-primary/35", "frontier"], ["bg-warn-solid", "path"],
          ].map(([tone, label]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={cx("h-2.5 w-2.5 rounded-sm", tone)} aria-hidden />
              {label}
            </span>
          ))}
        </div>

        <p aria-live="polite" className="rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] text-fg">
          {frame.note}
        </p>

        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="eyebrow">{info.label}</p>
            <span className="font-ui text-[11.5px] text-up">{info.guarantee}</span>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-muted">{info.blurb}</p>
        </div>
      </div>
    </ToolShell>
  );
}
