"use client";

import { useMemo } from "react";
import { ArrowLeftRight, Eraser } from "lucide-react";
import { YAML_JSON_META } from "@/lib/registry/metas";
import { yamlToJson, jsonToYaml, hasCommentsOrAnchors } from "@/lib/tools/yaml-json";
import { YAML_JSON_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Select } from "@/components/ui/Select";
import { Segmented } from "@/components/ui/Segmented";
import { CodeArea } from "@/components/ui/CodeArea";
import { Panel, EmptyOutput } from "@/components/ui/Panel";
import { JsonViewer } from "@/components/ui/JsonViewer";

interface State {
  input: string;
  direction: "yaml-to-json" | "json-to-yaml";
  indent: number;
  flowStyle: boolean;
}

const DEFAULTS: State = { input: "", direction: "yaml-to-json", indent: 2, flowStyle: false };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return typeof c.input === "string" && typeof c.flowStyle === "boolean"
    && typeof c.indent === "number" && Number.isFinite(c.indent)
    && ["yaml-to-json", "json-to-yaml"].includes(c.direction);
}

export function YamlJson() {
  const meta = YAML_JSON_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);

  const result = useMemo(() => {
    if (!state.input.trim()) return null;
    return state.direction === "yaml-to-json"
      ? yamlToJson(state.input, state.indent)
      : jsonToYaml(state.input, { indent: state.indent, flowStyle: state.flowStyle });
  }, [state.input, state.direction, state.indent, state.flowStyle]);

  // Parsed once, so the JSON side can fold. Null whenever the output is YAML.
  const jsonResult = useMemo(() => {
    if (!result?.ok || state.direction !== "yaml-to-json") return null;
    try { return JSON.parse(result.value) as unknown; } catch { return null; }
  }, [result, state.direction]);

  const willDropDetail = state.direction === "yaml-to-json" && hasCommentsOrAnchors(state.input);

  return (
    <ToolShell
      meta={meta}
      examples={YAML_JSON_EXAMPLES}
      onLoadExample={(example) => update(example.state as Partial<State>)}
      isEmpty={!state.input.trim()}
      emptyHint={"Convert between YAML and JSON in either direction."}
      shareState={state}
      actions={
        <>
          <Button
            size="sm"
            onClick={() => update({
              direction: state.direction === "yaml-to-json" ? "json-to-yaml" : "yaml-to-json",
              input: result?.ok ? result.value : state.input,
            })}
          >
            Swap
          </Button>
          <Button size="sm" onClick={reset}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
          {result?.ok ? <CopyButton text={result.value} label="Copy output" /> : null}
        </>
      }
      options={
        <>
          <Segmented
            label="Direction"
            value={state.direction}
            onChange={(direction) => update({ direction })}
            options={[
              { value: "yaml-to-json", label: "YAML → JSON" },
              { value: "json-to-yaml", label: "JSON → YAML" },
            ]}
          />
          <label className="flex items-center gap-2">
            <span className="eyebrow">Indent</span>
            <Select
              value={String(state.indent)}
              ariaLabel="Indent width"
              onChange={(indent) => update({ indent: Number(indent) })}
              options={[
                { value: "2", label: "2 spaces" },
                { value: "4", label: "4 spaces" },
              ]}
            />
          </label>
          {state.direction === "json-to-yaml" ? (
            <Toggle
              checked={state.flowStyle}
              onChange={(flowStyle) => update({ flowStyle })}
              label="Flow style"
            />
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {willDropDetail ? (
          // Stated plainly, above the output, before the user copies it away.
          <p className="rounded-md bg-warn-tint px-3 py-2 text-[12.5px] text-warn">
            ! JSON has no comments or anchors. Converting drops them — the output
            below is the data only.
          </p>
        ) : null}

        <div className="grid min-h-0 gap-3 lg:grid-cols-2">
          <Panel
            title={state.direction === "yaml-to-json" ? "YAML" : "JSON"}
            subtitle="The document to convert"
            className="h-[60dvh] min-h-[22rem]"
          >
            <CodeArea
              value={state.input}
              onChange={(input) => update({ input })}
              ariaLabel={state.direction === "yaml-to-json" ? "YAML input" : "JSON input"}
              placeholder={state.direction === "yaml-to-json" ? "Paste YAML" : "Paste JSON"}
              className="h-full rounded-none border-0"
            />
          </Panel>

          <Panel
            title={state.direction === "yaml-to-json" ? "JSON" : "YAML"}
            subtitle="Converted result"
            className="h-[60dvh] min-h-[22rem]"
            actions={result?.ok ? <CopyButton text={result.value} label="Copy" /> : null}
          >
            {result && !result.ok ? (
              <div className="p-3"><ErrorNote error={result.error} /></div>
            ) : result?.ok && jsonResult !== null ? (
              // A JSON result folds; YAML is not a tree this viewer can walk.
              <JsonViewer value={jsonResult} className="h-full" />
            ) : result?.ok ? (
              <CodeArea value={result.value} readOnly ariaLabel="Converted output" className="h-full rounded-none border-0" />
            ) : (
              <EmptyOutput>The converted document will appear here.</EmptyOutput>
            )}
          </Panel>
        </div>
      </div>
    </ToolShell>
  );
}
