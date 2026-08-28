"use client";

import { useMemo } from "react";
import { CalendarClock, Eraser } from "lucide-react";
import { CRON_META } from "@/lib/registry/metas";
import { parseCron, CRON_MACROS } from "@/lib/tools/cron";
import { CRON_EXAMPLES } from "@/lib/tools/examples";
import { EPOCH_ZONES } from "@/lib/tools/epoch";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

interface State {
  expression: string;
  zone: string;
}

const DEFAULTS: State = { expression: "", zone: "UTC" };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return typeof c.expression === "string" && typeof c.zone === "string";
}

export function Cron() {
  const meta = CRON_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);

  const result = useMemo(
    () => (state.expression.trim() ? parseCron(state.expression, state.zone) : null),
    [state.expression, state.zone],
  );
  const report = result?.ok ? result.value : null;

  return (
    <ToolShell
      meta={meta}
      examples={CRON_EXAMPLES}
      onLoadExample={(example) => update(example.state as Partial<State>)}
      isEmpty={!state.expression.trim()}
      emptyHint={"Enter a cron expression to read it in plain words and see its next ten runs."}
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
          <label className="flex items-center gap-2">
            <span className="eyebrow">Zone</span>
            <Select
              value={state.zone}
              ariaLabel="Time zone for the next runs"
              onChange={(zone) => update({ zone })}
              options={EPOCH_ZONES.map((z) => ({ value: z, label: z }))}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Macro</span>
            <Select
              value=""
              ariaLabel="Insert a macro"
              onChange={(expression) => { if (expression) update({ expression }); }}
              options={[
                { value: "", label: "Choose…" },
                ...Object.keys(CRON_MACROS).map((m) => ({ value: m, label: m })),
              ]}
            />
          </label>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <input
          value={state.expression}
          onChange={(e) => update({ expression: e.target.value })}
          aria-label="Cron expression"
          placeholder="0 9 * * 1-5"
          spellCheck={false}
          className="h-12 w-full rounded-md border border-border bg-surface px-3 font-ui text-[16px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />

        {result && !result.ok ? <ErrorNote error={result.error} /> : null}

        {report ? (
          <>
            <div className="rounded-lg bg-surface px-4 py-3 shadow-sm">
              <p className="eyebrow mb-1">In words</p>
              <p className="text-[14px] leading-relaxed text-fg">{report.description}</p>
              {report.hasSeconds ? (
                <p className="mt-1 text-[12px] text-fg-muted">
                  Six fields — the first is seconds.
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg bg-surface px-4 py-3 shadow-sm">
                <p className="eyebrow mb-1.5">Fields</p>
                {report.fields.map((field) => (
                  <div key={field.name} className="flex items-baseline gap-3 border-b border-border py-1.5 last:border-0">
                    <span className="w-28 shrink-0 font-ui text-[12px] text-fg-muted">{field.name}</span>
                    <span className="w-16 shrink-0 font-ui text-[12.5px] text-[var(--code-key)]">{field.value}</span>
                    <span className="min-w-0 flex-1 text-[12.5px] text-fg">{field.describes}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-surface px-4 py-3 shadow-sm">
                <p className="eyebrow mb-1.5">Next 10 runs — {state.zone}</p>
                {report.nextRuns.map((run, index) => (
                  <div key={run.toISOString()} className="flex items-baseline gap-3 border-b border-border py-1 last:border-0">
                    <span className="w-5 shrink-0 font-ui text-[11px] text-fg-muted tabular">{index + 1}</span>
                    <span className="font-ui text-[12.5px] text-fg tabular">
                      {new Intl.DateTimeFormat(undefined, {
                        timeZone: state.zone, dateStyle: "medium", timeStyle: "medium",
                      }).format(run)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </ToolShell>
  );
}
