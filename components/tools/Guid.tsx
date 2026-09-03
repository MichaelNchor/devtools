"use client";

import { useMemo, useState } from "react";
import { Fingerprint, RefreshCw } from "lucide-react";
import { GUID_META } from "@/lib/registry/metas";
import {
  generateGuids, GUID_NAMESPACES, DEFAULT_GUID_OPTIONS, type GuidOptions, type GuidVersion,
} from "@/lib/tools/guid";
import { GUID_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Select } from "@/components/ui/Select";
import { CodeArea } from "@/components/ui/CodeArea";

type State = GuidOptions;
const DEFAULTS: State = DEFAULT_GUID_OPTIONS;

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return typeof c.count === "number" && Number.isFinite(c.count)
    && typeof c.uppercase === "boolean" && typeof c.braces === "boolean"
    && typeof c.hyphens === "boolean" && typeof c.namespace === "string"
    && typeof c.name === "string"
    && ["v1", "v4", "v5", "v7"].includes(c.version);
}

export function Guid() {
  const meta = GUID_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);
  // Bumped to force a fresh batch; random output needs an explicit reason to
  // change, or every unrelated re-render would silently reroll the list.
  const [nonce, setNonce] = useState(0);

  const result = useMemo(() => generateGuids(state), [state, nonce]);
  const text = result.ok ? result.value.join("\n") : "";

  return (
    <ToolShell
      meta={meta}
      examples={GUID_EXAMPLES}
      onLoadExample={(example) => update(example.state as Partial<State>)}
      isEmpty={false}
      emptyHint={"Generate UUIDs."}
      shareState={state}
      actions={
        <>
          <Button size="sm" onClick={() => setNonce((n) => n + 1)}>
            <RefreshCw size={13} aria-hidden />
            Regenerate
          </Button>
          <Button size="sm" onClick={reset}>Reset</Button>
          {text ? <CopyButton text={text} label="Copy all" /> : null}
        </>
      }
      options={
        <>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Version</span>
            <Select
              value={state.version}
              ariaLabel="GUID version"
              onChange={(version: GuidVersion) => update({ version })}
              options={[
                { value: "v4", label: "v4 (random)" },
                { value: "v7", label: "v7 (time-sortable)" },
                { value: "v1", label: "v1 (time + node)" },
                { value: "v5", label: "v5 (namespace + name)" },
              ]}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Count</span>
            <input
              type="number"
              min="1"
              max="1000"
              value={state.count}
              onChange={(e) => update({ count: Number(e.target.value) || 1 })}
              aria-label="How many to generate"
              className="h-9 w-20 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg tabular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]"
            />
          </label>
          {state.version === "v5" ? (
            <>
              <label className="flex items-center gap-2">
                <span className="eyebrow">Namespace</span>
                <Select
                  value={state.namespace}
                  ariaLabel="Namespace UUID"
                  onChange={(namespace) => update({ namespace })}
                  options={GUID_NAMESPACES.map((n) => ({ value: n.value, label: n.label }))}
                />
              </label>
              <label className="flex items-center gap-2">
                <span className="eyebrow">Name</span>
                <input
                  value={state.name}
                  onChange={(e) => update({ name: e.target.value })}
                  aria-label="Name to hash"
                  className="h-9 w-40 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]"
                />
              </label>
            </>
          ) : null}
          <Toggle checked={state.uppercase} onChange={(uppercase) => update({ uppercase })} label="Uppercase" />
          <Toggle checked={state.braces} onChange={(braces) => update({ braces })} label="Braces" />
          <Toggle checked={state.hyphens} onChange={(hyphens) => update({ hyphens })} label="Hyphens" />
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {!result.ok ? <ErrorNote error={result.error} /> : null}
        {state.version === "v5" ? (
          <p className="rounded-md border border-border bg-inset px-3 py-2 text-[12.5px] text-fg-muted">
            v5 is a hash of the namespace and name, so it is deterministic — the
            same inputs always give the same GUID, and a batch repeats one value.
          </p>
        ) : null}
        <CodeArea
          value={text}
          readOnly
          ariaLabel="Generated GUIDs"
          className="h-[55dvh] min-h-[20rem]"
        />
      </div>
    </ToolShell>
  );
}
