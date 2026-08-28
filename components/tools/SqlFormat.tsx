"use client";

import { useMemo } from "react";
import { Database, Eraser } from "lucide-react";
import { SQL_FORMAT_META } from "@/lib/registry/metas";
import {
  formatSql, DEFAULT_SQL_OPTIONS, SQL_DIALECTS, type SqlOptions,
} from "@/lib/tools/sql-format";
import { SQL_FORMAT_EXAMPLES } from "@/lib/tools/examples";
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
  options: SqlOptions;
}

const DEFAULTS: State = { input: "", options: DEFAULT_SQL_OPTIONS };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  if (typeof c.input !== "string") return false;
  if (typeof c.options !== "object" || c.options === null) return false;
  const o = c.options;
  return typeof o.indent === "number" && Number.isFinite(o.indent)
    && SQL_DIALECTS.some((d) => d.value === o.dialect)
    && ["upper", "lower", "preserve"].includes(o.keywordCase)
    && ["after", "before"].includes(o.commaPosition);
}

export function SqlFormat() {
  const meta = SQL_FORMAT_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);

  const result = useMemo(
    () => (state.input.trim() ? formatSql(state.input, state.options) : null),
    [state.input, state.options],
  );

  const setOption = (patch: Partial<SqlOptions>) =>
    update({ options: { ...state.options, ...patch } });

  return (
    <ToolShell
      meta={meta}
      examples={SQL_FORMAT_EXAMPLES}
      onLoadExample={(example) => update(example.state as Partial<State>)}
      isEmpty={!state.input.trim()}
      emptyHint={"Paste a SQL statement to format it across six dialects."}
      shareState={state}
      actions={
        <>
          <Button size="sm" onClick={reset}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
          {result?.ok ? <CopyButton text={result.value} label="Copy output" /> : null}
        </>
      }
      options={
        <>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Dialect</span>
            <Select
              value={state.options.dialect}
              ariaLabel="SQL dialect"
              onChange={(dialect) => setOption({ dialect })}
              options={SQL_DIALECTS}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Keywords</span>
            <Select
              value={state.options.keywordCase}
              ariaLabel="Keyword case"
              onChange={(keywordCase) => setOption({ keywordCase })}
              options={[
                { value: "upper", label: "UPPER" },
                { value: "lower", label: "lower" },
                { value: "preserve", label: "Preserve" },
              ]}
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Indent</span>
            <Select
              value={String(state.options.indent)}
              ariaLabel="Indent width"
              onChange={(indent) => setOption({ indent: Number(indent) })}
              options={[
                { value: "2", label: "2 spaces" },
                { value: "4", label: "4 spaces" },
              ]}
            />
          </label>
          <Segmented
            label="Comma position"
            value={state.options.commaPosition}
            onChange={(commaPosition) => setOption({ commaPosition })}
            options={[
              { value: "after", label: "Trailing" },
              { value: "before", label: "Leading" },
            ]}
          />
        </>
      }
    >
      <div className="grid min-h-0 gap-3 lg:grid-cols-2">
        <CodeArea
          value={state.input}
          onChange={(input) => update({ input })}
          ariaLabel="SQL input"
          placeholder="Paste a SQL statement"
          className="h-[60dvh] min-h-[22rem]"
        />
        <div className="flex flex-col gap-2">
          {result && !result.ok ? <ErrorNote error={result.error} /> : null}
          <CodeArea
            value={result?.ok ? result.value : ""}
            readOnly
            ariaLabel="Formatted SQL"
            className="h-[60dvh] min-h-[22rem]"
          />
        </div>
      </div>
    </ToolShell>
  );
}
