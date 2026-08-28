"use client";

import { useMemo, useState } from "react";
import { KeyRound, RefreshCw } from "lucide-react";
import { PASSWORD_META } from "@/lib/registry/metas";
import {
  generatePasswords, entropyBits, describeStrength, poolFor,
  DEFAULT_PASSWORD_OPTIONS, MIN_LENGTH, MAX_LENGTH, type PasswordOptions,
} from "@/lib/tools/password";
import { PASSWORD_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { CodeArea } from "@/components/ui/CodeArea";

type State = PasswordOptions;
const DEFAULTS: State = DEFAULT_PASSWORD_OPTIONS;

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return typeof c.length === "number" && typeof c.count === "number"
    && typeof c.lower === "boolean" && typeof c.upper === "boolean"
    && typeof c.digits === "boolean" && typeof c.symbols === "boolean"
    && typeof c.custom === "string" && typeof c.excludeAmbiguous === "boolean"
    && typeof c.requireEachSet === "boolean";
}

export function Password() {
  const meta = PASSWORD_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);
  const [nonce, setNonce] = useState(0);

  const result = useMemo(() => generatePasswords(state), [state, nonce]);
  const bits = useMemo(() => entropyBits(state), [state]);
  const pool = useMemo(() => poolFor(state), [state]);
  const text = result.ok ? result.value.join("\n") : "";

  return (
    <ToolShell
      meta={meta}
      examples={PASSWORD_EXAMPLES}
      onLoadExample={(example) => update(example.state as Partial<State>)}
      isEmpty={false}
      emptyHint={"Generate passwords."}
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
            <span className="eyebrow">Length</span>
            <input
              type="range"
              min={MIN_LENGTH}
              max={MAX_LENGTH}
              value={state.length}
              onChange={(e) => update({ length: Number(e.target.value) })}
              aria-label="Password length"
              className="w-40 accent-[var(--primary)]"
            />
            <span className="w-8 font-ui text-[13px] text-fg tabular">{state.length}</span>
          </label>
          <Toggle checked={state.lower} onChange={(lower) => update({ lower })} label="a-z" />
          <Toggle checked={state.upper} onChange={(upper) => update({ upper })} label="A-Z" />
          <Toggle checked={state.digits} onChange={(digits) => update({ digits })} label="0-9" />
          <Toggle checked={state.symbols} onChange={(symbols) => update({ symbols })} label="Symbols" />
          <Toggle
            checked={state.excludeAmbiguous}
            onChange={(excludeAmbiguous) => update({ excludeAmbiguous })}
            label="No look-alikes"
          />
          <Toggle
            checked={state.requireEachSet}
            onChange={(requireEachSet) => update({ requireEachSet })}
            label="One of each set"
          />
          <label className="flex items-center gap-2">
            <span className="eyebrow">Custom</span>
            <input
              value={state.custom}
              onChange={(e) => update({ custom: e.target.value })}
              aria-label="Custom characters"
              className="h-9 w-28 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Count</span>
            <input
              type="number"
              min="1"
              max="100"
              value={state.count}
              onChange={(e) => update({ count: Number(e.target.value) || 1 })}
              aria-label="How many to generate"
              className="h-9 w-20 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg tabular focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {!result.ok ? <ErrorNote error={result.error} /> : null}

        <div className="rounded-lg bg-surface px-4 py-3 shadow-sm">
          {/* The number AND the sentence: entropy alone means nothing to most
              readers, and a colour bar alone would mean nothing in greyscale. */}
          <p className="font-ui text-[13px] text-fg tabular">
            {bits.toFixed(1)} bits of entropy
            <span className="text-fg-muted"> — {pool.length} characters in the pool</span>
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{describeStrength(bits)}</p>
        </div>

        <CodeArea
          value={text}
          readOnly
          ariaLabel="Generated passwords"
          className="h-[45dvh] min-h-[16rem]"
        />

        <p className="text-[12px] text-fg-muted">
          Generated in this tab with crypto.getRandomValues. Never stored, never
          shared by link, never sent anywhere.
        </p>
      </div>
    </ToolShell>
  );
}
