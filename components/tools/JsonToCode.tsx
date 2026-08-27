"use client";

import { useMemo } from "react";
import { Code2, Eraser } from "lucide-react";
import { JSON_TO_CODE_META } from "@/lib/registry/metas";
import { parseJson } from "@/lib/json/parse";
import { inferTypes } from "@/lib/tools/json-to-code/infer";
import { emitCode, LANGUAGES, type TargetLanguage } from "@/lib/tools/json-to-code/emit";
import { JSON_TO_CODE_SAMPLE } from "@/lib/tools/json-to-code-sample";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Segmented } from "@/components/ui/Segmented";
import { CodeArea } from "@/components/ui/CodeArea";

interface State {
  input: string;
  rootName: string;
  language: TargetLanguage;
  optionalStyle: "optional" | "nullable";
  arrayUnification: "union" | "first";
}

const DEFAULTS: State = {
  input: "", rootName: "Root", language: "typescript",
  optionalStyle: "optional", arrayUnification: "union",
};

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return typeof c.input === "string" && typeof c.rootName === "string"
    && LANGUAGES.some((l) => l.value === c.language)
    && ["optional", "nullable"].includes(c.optionalStyle)
    && ["union", "first"].includes(c.arrayUnification);
}

export function JsonToCode() {
  const meta = JSON_TO_CODE_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);

  const result = useMemo(() => {
    if (!state.input.trim()) return null;
    const parsed = parseJson(state.input);
    if (!parsed.ok) return parsed;
    const models = inferTypes(parsed.value, {
      rootName: state.rootName.trim() || "Root",
      arrayUnification: state.arrayUnification,
    });
    return {
      ok: true as const,
      value: emitCode(models, { language: state.language, optionalStyle: state.optionalStyle }),
    };
  }, [state.input, state.rootName, state.language, state.optionalStyle, state.arrayUnification]);

  return (
    <ToolShell
      meta={meta}
      shareState={state}
      actions={
        <>
          <Button size="sm" onClick={() => update(JSON_TO_CODE_SAMPLE)}>
            <Code2 size={13} aria-hidden />
            Load sample
          </Button>
          <Button size="sm" onClick={reset}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
          {result?.ok ? <CopyButton text={result.value} label="Copy code" /> : null}
        </>
      }
      options={
        <>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Language</span>
            <Select
              value={state.language}
              ariaLabel="Target language"
              onChange={(language) => update({ language })}
              options={LANGUAGES}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Root name</span>
            <input
              value={state.rootName}
              onChange={(e) => update({ rootName: e.target.value })}
              aria-label="Root type name"
              className="h-9 w-32 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
          <Segmented
            label="Missing fields"
            value={state.optionalStyle}
            onChange={(optionalStyle) => update({ optionalStyle })}
            options={[
              { value: "optional", label: "Optional" },
              { value: "nullable", label: "Nullable" },
            ]}
          />
          <Segmented
            label="Array elements"
            value={state.arrayUnification}
            onChange={(arrayUnification) => update({ arrayUnification })}
            options={[
              { value: "union", label: "Unify all" },
              { value: "first", label: "First only" },
            ]}
          />
        </>
      }
    >
      <div className="grid min-h-0 gap-3 lg:grid-cols-2">
        <CodeArea
          value={state.input}
          onChange={(input) => update({ input })}
          ariaLabel="JSON sample"
          placeholder="Paste a JSON sample to infer types from"
          className="h-[60dvh] min-h-[22rem]"
        />
        <div className="flex flex-col gap-2">
          {result && !result.ok ? <ErrorNote error={result.error} /> : null}
          <CodeArea
            value={result?.ok ? result.value : ""}
            readOnly
            ariaLabel="Generated code"
            className="h-[60dvh] min-h-[22rem]"
          />
        </div>
      </div>
    </ToolShell>
  );
}
