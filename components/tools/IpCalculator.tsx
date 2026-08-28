"use client";

import { useMemo } from "react";
import { Eraser, Network } from "lucide-react";
import { IP_META } from "@/lib/registry/metas";
import { calculateIpv4, splitSubnets, analyseIpv6 } from "@/lib/tools/ip";
import { IP_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";

interface State {
  input: string;
  family: "v4" | "v6";
  splitPrefix: number;
}

const DEFAULTS: State = { input: "", family: "v4", splitPrefix: 26 };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return typeof c.input === "string"
    && typeof c.splitPrefix === "number" && Number.isFinite(c.splitPrefix)
    && ["v4", "v6"].includes(c.family);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 border-b border-border py-1.5 last:border-0">
      <span className="eyebrow w-32 shrink-0">{label}</span>
      <span className="min-w-0 flex-1 truncate font-ui text-[12.5px] text-fg tabular">{value}</span>
      <CopyButton text={value} label="Copy" />
    </div>
  );
}

export function IpCalculator() {
  const meta = IP_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);

  const v4 = useMemo(
    () => (state.family === "v4" && state.input.trim() ? calculateIpv4(state.input) : null),
    [state.family, state.input],
  );
  const v6 = useMemo(
    () => (state.family === "v6" && state.input.trim() ? analyseIpv6(state.input) : null),
    [state.family, state.input],
  );
  const split = useMemo(
    () => (state.family === "v4" && state.input.trim()
      ? splitSubnets(state.input, state.splitPrefix)
      : null),
    [state.family, state.input, state.splitPrefix],
  );

  const error = v4 && !v4.ok ? v4.error : v6 && !v6.ok ? v6.error : null;

  return (
    <ToolShell
      meta={meta}
      examples={IP_EXAMPLES}
      onLoadExample={(example) => update(example.state as Partial<State>)}
      isEmpty={!state.input.trim()}
      emptyHint={"Enter an address with a prefix or a mask to see its network, range, and host count."}
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
          <Segmented
            label="Address family"
            value={state.family}
            onChange={(family) => update({
              family,
              input: family === "v6" ? "2001:db8::1/64" : "192.168.1.10/24",
            })}
            options={[{ value: "v4", label: "IPv4" }, { value: "v6", label: "IPv6" }]}
          />
          {state.family === "v4" ? (
            <label className="flex items-center gap-2">
              <span className="eyebrow">Split into</span>
              <input
                type="number"
                min="0"
                max="32"
                value={state.splitPrefix}
                onChange={(e) => update({ splitPrefix: Number(e.target.value) || 0 })}
                aria-label="Split into subnets of this prefix length"
                className="h-9 w-20 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg tabular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
            </label>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <input
          value={state.input}
          onChange={(e) => update({ input: e.target.value })}
          aria-label={state.family === "v4" ? "IPv4 address and mask" : "IPv6 address and prefix"}
          placeholder={state.family === "v4" ? "192.168.1.10/24 or 192.168.1.10 255.255.255.0" : "2001:db8::1/64"}
          className="h-11 w-full rounded-md border border-border bg-surface px-3 font-ui text-[15px] text-fg tabular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />

        {error ? <ErrorNote error={error} /> : null}

        {v4?.ok ? (
          <div className="rounded-lg bg-surface px-4 py-2 shadow-sm">
            <Row label="Network" value={v4.value.network} />
            <Row label="Broadcast" value={v4.value.broadcast ?? "none (/31 and /32 have none)"} />
            <Row label="First host" value={v4.value.firstHost} />
            <Row label="Last host" value={v4.value.lastHost} />
            <Row label="Usable hosts" value={v4.value.usableHosts.toLocaleString()} />
            <Row label="Netmask" value={v4.value.netmask} />
            <Row label="Wildcard" value={v4.value.wildcard} />
            <Row label="Prefix" value={`/${v4.value.prefix}`} />
            <Row label="Scope" value={v4.value.scope} />
          </div>
        ) : null}

        {v6?.ok ? (
          <div className="rounded-lg bg-surface px-4 py-2 shadow-sm">
            <Row label="Expanded" value={v6.value.expanded} />
            <Row label="Compressed" value={v6.value.compressed} />
            <Row label="Prefix" value={`/${v6.value.prefix}`} />
            <Row label="First address" value={v6.value.firstAddress} />
            <Row label="Last address" value={v6.value.lastAddress} />
            <Row label="Addresses" value={v6.value.addressCount} />
          </div>
        ) : null}

        {state.family === "v4" && split ? (
          <div className="rounded-lg bg-surface px-4 py-3 shadow-sm">
            <p className="eyebrow mb-1.5">Subnets at /{state.splitPrefix}</p>
            {!split.ok ? (
              <p className="text-[12.5px] text-fg-muted">{split.error.message}</p>
            ) : (
              <div className="max-h-64 overflow-auto">
                <table className="w-full font-ui text-[12px]">
                  <thead className="sticky top-0 bg-surface text-left text-fg-muted">
                    <tr>
                      <th className="py-1 pr-3 font-medium">#</th>
                      <th className="py-1 pr-3 font-medium">Network</th>
                      <th className="py-1 font-medium">Broadcast</th>
                    </tr>
                  </thead>
                  <tbody>
                    {split.value.map((row, index) => (
                      <tr key={row.network} className="border-t border-border">
                        <td className="py-1 pr-3 text-fg-muted tabular">{index + 1}</td>
                        <td className="py-1 pr-3 text-fg tabular">{row.network}</td>
                        <td className="py-1 text-fg tabular">{row.broadcast}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </ToolShell>
  );
}
