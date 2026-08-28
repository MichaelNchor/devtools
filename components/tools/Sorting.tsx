"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { SORTING_META } from "@/lib/registry/metas";
import { sortFrames, SORT_ALGORITHMS, type SortAlgorithm } from "@/lib/tools/sorting";
import { SORTING_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cx } from "@/lib/cx";

interface State {
  values: number[];
  algorithm: SortAlgorithm;
  speed: number;
}

const DEFAULTS: State = { values: [5, 3, 8, 1, 9, 2, 7, 4], algorithm: "bubble", speed: 60 };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return Array.isArray(c.values) && c.values.every((n) => typeof n === "number")
    && typeof c.speed === "number"
    && SORT_ALGORITHMS.some((a) => a.value === c.algorithm);
}

export function Sorting() {
  const meta = SORTING_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const frames = useMemo(
    () => sortFrames(state.values, state.algorithm),
    [state.values, state.algorithm],
  );
  const info = SORT_ALGORITHMS.find((a) => a.value === state.algorithm)!;
  const frame = frames[Math.min(step, frames.length - 1)]!;
  const max = Math.max(...state.values, 1);

  // Changing the input or the algorithm invalidates the position in the run.
  useEffect(() => { setStep(0); setPlaying(false); }, [state.values, state.algorithm]);

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setStep((s) => {
        if (s >= frames.length - 1) { setPlaying(false); return s; }
        return s + 1;
      });
    }, Math.max(16, 320 - state.speed * 3));
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [playing, frames.length, state.speed]);

  function shuffle() {
    const size = state.values.length;
    const next = Array.from({ length: size }, (_, i) => i + 1);
    // Fisher-Yates, so every arrangement is equally likely.
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j]!, next[i]!];
    }
    update({ values: next });
  }

  return (
    <ToolShell
      meta={meta}
      shareState={state}
      examples={SORTING_EXAMPLES}
      onLoadExample={(example) => update(example.state as Partial<State>)}
      actions={
        <>
          <Button size="sm" onClick={shuffle}>
            <Shuffle size={13} aria-hidden />
            Shuffle
          </Button>
          <Button size="sm" onClick={() => { reset(); setStep(0); }}>
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
              value={state.algorithm}
              ariaLabel="Sorting algorithm"
              onChange={(algorithm: SortAlgorithm) => update({ algorithm })}
              options={SORT_ALGORITHMS.map((a) => ({ value: a.value, label: a.label }))}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Size</span>
            <input
              type="range" min="5" max="40"
              value={state.values.length}
              onChange={(e) => {
                const size = Number(e.target.value);
                update({ values: Array.from({ length: size }, () => 1 + Math.floor(Math.random() * size)) });
              }}
              aria-label="How many values to sort"
              className="w-28 accent-[var(--primary)]"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Speed</span>
            <input
              type="range" min="1" max="100"
              value={state.speed}
              onChange={(e) => update({ speed: Number(e.target.value) })}
              aria-label="Playback speed"
              className="w-28 accent-[var(--primary)]"
            />
          </label>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
          <Button size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <SkipBack size={13} aria-hidden />
            Back
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              if (step >= frames.length - 1) setStep(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />}
            {playing ? "Pause" : "Play"}
          </Button>
          <Button
            size="sm"
            onClick={() => setStep((s) => Math.min(frames.length - 1, s + 1))}
            disabled={step >= frames.length - 1}
          >
            Step
            <SkipForward size={13} aria-hidden />
          </Button>

          <span className="ml-2 font-ui text-[12px] text-fg-muted tabular">
            Step {step + 1} of {frames.length}
          </span>
          <span className="ml-auto flex items-center gap-4 font-ui text-[12px] text-fg tabular">
            <span>{frame.comparisons} comparisons</span>
            <span>{frame.swaps} writes</span>
          </span>
        </div>

        <div className="flex h-64 items-end gap-[3px] rounded-lg border border-border bg-surface p-3 sm:h-80">
          {frame.array.map((value, index) => {
            const isComparing = frame.comparing.includes(index);
            const isSwapping = frame.swapping.includes(index);
            const isSorted = frame.sorted.includes(index);
            return (
              <div
                key={index}
                className={cx(
                  "flex-1 rounded-t-sm transition-all duration-150",
                  isSwapping ? "bg-rose-solid"
                    : isComparing ? "bg-warn-solid"
                      : isSorted ? "bg-up-solid" : "bg-primary/45",
                )}
                style={{ height: `${(value / max) * 100}%` }}
              />
            );
          })}
        </div>

        {/* Colour alone would not survive greyscale, so the legend spells out
            each state and the caption narrates the current step in words. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-surface px-3 py-2 text-[12px]">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-warn-solid" aria-hidden /> comparing</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-rose-solid" aria-hidden /> writing</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-up-solid" aria-hidden /> final position</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary/45" aria-hidden /> unsorted</span>
        </div>

        <p aria-live="polite" className="rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] text-fg">
          {frame.note}
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="eyebrow mb-1.5">{info.label}</p>
            <p className="text-[12.5px] leading-relaxed text-fg-muted">{info.blurb}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="eyebrow mb-2">Complexity</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-ui text-[12.5px]">
              <dt className="text-fg-muted">Best</dt><dd className="text-fg tabular">{info.best}</dd>
              <dt className="text-fg-muted">Average</dt><dd className="text-fg tabular">{info.average}</dd>
              <dt className="text-fg-muted">Worst</dt><dd className="text-fg tabular">{info.worst}</dd>
              <dt className="text-fg-muted">Space</dt><dd className="text-fg tabular">{info.space}</dd>
              <dt className="text-fg-muted">Stable</dt><dd className="text-fg">{info.stable ? "Yes" : "No"}</dd>
            </dl>
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
