"use client";

import { useMemo } from "react";
import { Eraser, TerminalSquare } from "lucide-react";
import { CURL_META } from "@/lib/registry/metas";
import { parseCurl, emitRequest, CURL_TARGETS, type CurlTarget } from "@/lib/tools/curl";
import { CURL_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { CodeArea } from "@/components/ui/CodeArea";

interface State {
  input: string;
  target: CurlTarget;
}

const DEFAULTS: State = { input: "", target: "fetch" };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return typeof c.input === "string" && CURL_TARGETS.some((t) => t.value === c.target);
}

export function CurlConvert() {
  const meta = CURL_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);

  const parsed = useMemo(
    () => (state.input.trim() ? parseCurl(state.input) : null),
    [state.input],
  );
  const code = parsed?.ok ? emitRequest(parsed.value.request, state.target) : "";

  return (
    <ToolShell
      meta={meta}
      examples={CURL_EXAMPLES}
      onLoadExample={(example) => update(example.state as Partial<State>)}
      isEmpty={!state.input.trim()}
      emptyHint={"Paste a curl command to turn it into fetch, axios, requests, HttpClient, Go, or PowerShell."}
      shareState={state}
      actions={
        <>
          <Button size="sm" onClick={reset}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
          {code ? <CopyButton text={code} label="Copy code" /> : null}
        </>
      }
      options={
        <label className="flex items-center gap-2">
          <span className="eyebrow">Emit as</span>
          <Select
            value={state.target}
            ariaLabel="Target language"
            onChange={(target: CurlTarget) => update({ target })}
            options={CURL_TARGETS}
          />
        </label>
      }
    >
      <div className="flex flex-col gap-3">
        {parsed && !parsed.ok ? <ErrorNote error={parsed.error} /> : null}

        {parsed?.ok && parsed.value.unsupported.length > 0 ? (
          // Listed, never dropped silently — the conversion is still correct
          // for everything else, and the user gets to judge the gap.
          <p className="rounded-md bg-warn-tint px-3 py-2 text-[12.5px] leading-relaxed text-warn">
            ! Ignored {parsed.value.unsupported.length} flag
            {parsed.value.unsupported.length === 1 ? "" : "s"} this converter does
            not model: <span className="font-ui">{parsed.value.unsupported.join(" ")}</span>
          </p>
        ) : null}

        <div className="grid min-h-0 gap-3 lg:grid-cols-2">
          <CodeArea
            value={state.input}
            onChange={(input) => update({ input })}
            ariaLabel="curl command"
            placeholder="Paste a curl command"
            className="h-[55dvh] min-h-[20rem]"
          />
          <CodeArea
            value={code}
            readOnly
            ariaLabel="Generated request code"
            className="h-[55dvh] min-h-[20rem]"
          />
        </div>
      </div>
    </ToolShell>
  );
}
