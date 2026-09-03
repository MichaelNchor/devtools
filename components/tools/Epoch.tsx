"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Eraser } from "lucide-react";
import { EPOCH_META } from "@/lib/registry/metas";
import {
  detectUnit, epochToDate, dateToEpoch, formatDate, EPOCH_ZONES, type EpochUnit,
} from "@/lib/tools/epoch";
import { EPOCH_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Segmented } from "@/components/ui/Segmented";

interface State {
  input: string;
  direction: "from-epoch" | "to-epoch";
  unit: EpochUnit | "auto";
  zone: string;
}

const DEFAULTS: State = { input: "", direction: "from-epoch", unit: "auto", zone: "UTC" };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return typeof c.input === "string" && typeof c.zone === "string"
    && ["from-epoch", "to-epoch"].includes(c.direction)
    && ["auto", "s", "ms", "us"].includes(c.unit);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-border py-1.5 last:border-0">
      <span className="eyebrow w-28 shrink-0">{label}</span>
      <span className="min-w-0 flex-1 truncate font-ui text-[12.5px] text-fg tabular">{value}</span>
      <CopyButton text={value} label="Copy" />
    </div>
  );
}

export function Epoch() {
  const meta = EPOCH_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);
  const [now, setNow] = useState(() => Date.now());

  // The live ticker. One interval, cleared on unmount.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const result = useMemo(() => {
    if (!state.input.trim()) return null;
    if (state.direction === "to-epoch") {
      const parsed = dateToEpoch(state.input);
      return parsed.ok ? epochToDate(parsed.value, "ms") : parsed;
    }
    const numeric = Number(state.input.trim());
    if (!Number.isFinite(numeric)) return epochToDate(Number.NaN, "s");
    const unit = state.unit === "auto" ? detectUnit(numeric) : state.unit;
    return epochToDate(numeric, unit);
  }, [state.input, state.direction, state.unit]);

  const parts = result?.ok ? formatDate(result.value, state.zone) : null;
  const epochMs = result?.ok ? result.value.getTime() : null;

  return (
    <ToolShell
      meta={meta}
      examples={EPOCH_EXAMPLES}
      onLoadExample={(example) => update(example.state as Partial<State>)}
      isEmpty={!state.input.trim()}
      emptyHint={"Convert a Unix timestamp to a date or back again, in any time zone."}
      shareState={state}
      actions={
        <>
          <Button
            size="sm"
            onClick={() => update({ direction: "from-epoch", unit: "s", input: String(Math.floor(now / 1000)) })}
          >
            Use now
          </Button>
          <Button size="sm" onClick={reset}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
        </>
      }
      options={
        <>
          <Segmented
            label="Direction"
            value={state.direction}
            onChange={(direction) => update({ direction })}
            options={[
              { value: "from-epoch", label: "Epoch → date" },
              { value: "to-epoch", label: "Date → epoch" },
            ]}
          />
          {state.direction === "from-epoch" ? (
            <label className="flex items-center gap-2">
              <span className="eyebrow">Unit</span>
              <Select
                value={state.unit}
                ariaLabel="Epoch unit"
                onChange={(unit) => update({ unit })}
                options={[
                  { value: "auto", label: "Auto-detect" },
                  { value: "s", label: "Seconds" },
                  { value: "ms", label: "Milliseconds" },
                  { value: "us", label: "Microseconds" },
                ]}
              />
            </label>
          ) : null}
          <label className="flex items-center gap-2">
            <span className="eyebrow">Zone</span>
            <Select
              value={state.zone}
              ariaLabel="Time zone"
              onChange={(zone) => update({ zone })}
              options={EPOCH_ZONES.map((z) => ({ value: z, label: z }))}
            />
          </label>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <input
          value={state.input}
          onChange={(e) => update({ input: e.target.value })}
          aria-label={state.direction === "from-epoch" ? "Epoch value" : "Date"}
          placeholder={state.direction === "from-epoch" ? "1700000000" : "2023-11-14T22:13:20Z"}
          className="h-11 w-full rounded-md border border-border bg-surface px-3 font-ui text-[15px] text-fg tabular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]"
        />

        {result && !result.ok ? <ErrorNote error={result.error} /> : null}

        {parts && epochMs !== null ? (
          <div className="rounded-lg bg-surface px-4 py-2 shadow-sm">
            <Row label="ISO 8601" value={parts.iso} />
            <Row label="UTC" value={parts.utc} />
            <Row label="Local" value={parts.local} />
            <Row label={state.zone} value={parts.zoned} />
            <Row label="RFC 2822" value={parts.rfc2822} />
            <Row label="Relative" value={parts.relative} />
            <Row label="Seconds" value={String(Math.floor(epochMs / 1000))} />
            <Row label="Milliseconds" value={String(epochMs)} />
            <Row label="Microseconds" value={String(epochMs * 1000)} />
          </div>
        ) : null}

        <div className="rounded-lg bg-surface px-4 py-3 shadow-sm">
          <p className="eyebrow mb-1.5">Now</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-ui text-[12.5px] text-fg tabular">
            <span>{Math.floor(now / 1000)} s</span>
            <span>{now} ms</span>
            <span>{now * 1000} µs</span>
            <span className="text-fg-muted">{new Date(now).toISOString()}</span>
            {/* Spec 7.14 asks for a copy of the current epoch, not just a display. */}
            <span className="ml-auto">
              <CopyButton text={String(Math.floor(now / 1000))} label="Copy epoch" />
            </span>
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
