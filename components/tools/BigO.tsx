"use client";

import { useState } from "react";
import { BIG_O_META } from "@/lib/registry/metas";
import {
  STRUCTURES, ALGORITHMS, COMPLEXITY_ORDER, severity, operationsAt, type Complexity,
} from "@/lib/tools/big-o";
import { BIG_O_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { Segmented } from "@/components/ui/Segmented";
import { cx } from "@/lib/cx";

/**
 * Tint by severity. The notation itself is always present, so the colour is
 * reinforcement rather than the carrier — this reads fine in greyscale.
 */
function tone(c: Complexity): string {
  const s = severity(c);
  if (s <= 0.17) return "bg-up-tint text-up";
  if (s <= 0.34) return "bg-sky-tint text-sky";
  if (s <= 0.5) return "bg-primary-tint text-primary-strong";
  if (s <= 0.67) return "bg-warn-tint text-warn";
  return "bg-rose-tint text-rose";
}

function Badge({ value }: { value: Complexity }) {
  return (
    <span className={cx("inline-block rounded-sm px-1.5 py-0.5 font-ui text-[11.5px] tabular", tone(value))}>
      {value}
    </span>
  );
}

function format(n: number): string {
  if (!Number.isFinite(n)) return "more than atoms in the universe";
  if (n >= 1e15) return n.toExponential(1);
  return Math.round(n).toLocaleString();
}

export function BigO() {
  const meta = BIG_O_META;
  const [view, setView] = useState<"structures" | "algorithms" | "growth">("structures");
  const [n, setN] = useState(1000);

  return (
    <ToolShell
      meta={meta}
      examples={BIG_O_EXAMPLES}
      onLoadExample={(example) => {
        setView((example.state.view as typeof view) ?? "structures");
        setN((example.state.n as number) ?? 1000);
      }}
      options={
        <>
          <Segmented
            label="Reference"
            value={view}
            onChange={setView}
            options={[
              { value: "structures", label: "Data structures" },
              { value: "algorithms", label: "Algorithms" },
              { value: "growth", label: "Growth" },
            ]}
          />
          {view === "growth" ? (
            <label className="flex items-center gap-2">
              <span className="eyebrow">n</span>
              <input
                type="range" min="1" max="100" step="1"
                value={Math.round(Math.log10(n) * 25)}
                onChange={(e) => setN(Math.round(10 ** (Number(e.target.value) / 25)))}
                aria-label="Input size"
                className="w-40 accent-[var(--primary)]"
              />
              <span className="w-24 font-ui text-[13px] text-fg tabular">{n.toLocaleString()}</span>
            </label>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {view === "growth" ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full font-ui text-[12.5px]">
              <caption className="px-4 pt-3 text-left text-[12.5px] text-fg-muted">
                Roughly how many operations each class costs at n = {n.toLocaleString()}.
              </caption>
              <thead>
                <tr className="text-left text-fg-muted">
                  <th className="px-4 py-2 font-medium">Class</th>
                  <th className="px-4 py-2 font-medium">Operations</th>
                  <th className="px-4 py-2 font-medium">Feels like</th>
                </tr>
              </thead>
              <tbody>
                {COMPLEXITY_ORDER.map((c) => {
                  const ops = operationsAt(c, n);
                  return (
                    <tr key={c} className="border-t border-border">
                      <td className="px-4 py-2"><Badge value={c} /></td>
                      <td className="px-4 py-2 text-fg tabular">{format(ops)}</td>
                      <td className="px-4 py-2 text-fg-muted">
                        {!Number.isFinite(ops) || ops > 1e12 ? "will never finish"
                          : ops > 1e9 ? "minutes to hours"
                            : ops > 1e7 ? "noticeable pause"
                              : ops > 1e5 ? "a moment" : "instant"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : view === "structures" ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full font-ui text-[12.5px]">
              <thead>
                <tr className="text-left text-fg-muted">
                  {["Structure", "Access", "Search", "Insert", "Delete", "Space"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STRUCTURES.map((row) => (
                  <tr key={row.name} className="border-t border-border align-top">
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-fg">{row.name}</span>
                      <p className="mt-0.5 max-w-md text-[11.5px] font-normal leading-snug text-fg-muted">
                        {row.note}
                      </p>
                    </td>
                    <td className="px-3 py-2.5"><Badge value={row.access} /></td>
                    <td className="px-3 py-2.5"><Badge value={row.search} /></td>
                    <td className="px-3 py-2.5"><Badge value={row.insert} /></td>
                    <td className="px-3 py-2.5"><Badge value={row.remove} /></td>
                    <td className="px-3 py-2.5"><Badge value={row.space} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full font-ui text-[12.5px]">
              <thead>
                <tr className="text-left text-fg-muted">
                  {["Algorithm", "Best", "Average", "Worst", "Space"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ALGORITHMS.map((row) => (
                  <tr key={row.name} className="border-t border-border align-top">
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-fg">{row.name}</span>
                      <p className="mt-0.5 max-w-md text-[11.5px] font-normal leading-snug text-fg-muted">
                        {row.note}
                      </p>
                    </td>
                    <td className="px-3 py-2.5"><Badge value={row.best} /></td>
                    <td className="px-3 py-2.5"><Badge value={row.average} /></td>
                    <td className="px-3 py-2.5"><Badge value={row.worst} /></td>
                    <td className="px-3 py-2.5"><Badge value={row.space} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
