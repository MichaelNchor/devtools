"use client";

import { useMemo } from "react";
import { Eraser, FileSearch } from "lucide-react";
import { HTTP_META } from "@/lib/registry/metas";
import { inspectHttp } from "@/lib/tools/http-inspect";
import { HTTP_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { Button } from "@/components/ui/Button";
import { CodeArea } from "@/components/ui/CodeArea";
import { Panel, EmptyOutput } from "@/components/ui/Panel";
import { JsonCode } from "@/components/ui/JsonCode";

interface State { input: string }
const DEFAULTS: State = { input: "" };

function isState(value: unknown): value is State {
  return typeof value === "object" && value !== null && typeof (value as State).input === "string";
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-surface px-4 py-3 shadow-sm">
      <p className="eyebrow mb-1.5">{title}</p>
      {children}
    </div>
  );
}

export function HttpInspector() {
  const meta = HTTP_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);

  const result = useMemo(
    () => (state.input.trim() ? inspectHttp(state.input) : null),
    [state.input],
  );
  const analysis = result?.ok ? result.value : null;

  return (
    <ToolShell
      meta={meta}
      examples={HTTP_EXAMPLES}
      onLoadExample={(example) => update(example.state as Partial<State>)}
      isEmpty={!state.input.trim()}
      emptyHint={"Paste a raw HTTP request or response to break it into headers, body, and decoded claims."}
      shareState={state}
      actions={
        <>
          <Button size="sm" onClick={reset}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
        </>
      }
    >
      <div className="grid min-h-0 gap-3 lg:grid-cols-2">
        <Panel title="Raw message" subtitle="Request or response" className="h-[70dvh] min-h-[24rem]">
          <CodeArea
            value={state.input}
            onChange={(input) => update({ input })}
            ariaLabel="Raw HTTP message"
            placeholder="Paste a raw HTTP request or response"
            className="h-full rounded-none border-0"
          />
        </Panel>

        <div className="flex max-h-[70dvh] min-h-0 flex-col gap-3 overflow-auto">
          {result && !result.ok ? <ErrorNote error={result.error} /> : null}

          {!analysis && !(result && !result.ok) ? (
            <div className="rounded-lg border border-border bg-surface">
              <EmptyOutput>Headers, body and decoded credentials will appear here.</EmptyOutput>
            </div>
          ) : null}

          {analysis ? (
            <>
              <Card title={analysis.message.kind === "request" ? "Request" : "Response"}>
                <p className="font-ui text-[13px] text-fg">{analysis.message.startLine}</p>
                <p className="mt-1 text-[12px] text-fg-muted tabular">
                  {analysis.message.headers.length} header
                  {analysis.message.headers.length === 1 ? "" : "s"} ·{" "}
                  {analysis.message.bodyBytes} byte
                  {analysis.message.bodyBytes === 1 ? "" : "s"} of body
                </p>
              </Card>

              <Card title="Headers">
                <div className="flex flex-col">
                  {analysis.message.headers.map(([key, value], index) => (
                    <div key={`${key}-${index}`} className="flex gap-3 border-b border-border py-1 last:border-0">
                      <span className="w-40 shrink-0 truncate font-ui text-[12px] text-[var(--code-key)]">{key}</span>
                      <span className="min-w-0 flex-1 break-all font-ui text-[12px] text-fg">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {analysis.contentType ? (
                <Card title="Content type">
                  <p className="font-ui text-[12.5px] text-fg">{analysis.contentType.type}</p>
                  {analysis.contentType.params.map(([k, v]) => (
                    <p key={k} className="font-ui text-[12px] text-fg-muted">{k} = {v}</p>
                  ))}
                </Card>
              ) : null}

              {analysis.authorization ? (
                <Card title="Authorization">
                  <p className="font-ui text-[12.5px] text-fg">
                    <span className="text-fg-muted">{analysis.authorization.scheme} </span>
                    {analysis.authorization.detail}
                  </p>
                </Card>
              ) : null}

              {analysis.cookies.length > 0 ? (
                <Card title="Cookies">
                  {analysis.cookies.map(([k, v]) => (
                    <p key={k} className="font-ui text-[12px] text-fg">
                      <span className="text-[var(--code-key)]">{k}</span> = {v}
                    </p>
                  ))}
                </Card>
              ) : null}

              {analysis.setCookies.length > 0 ? (
                <Card title="Set-Cookie">
                  {analysis.setCookies.map((raw, index) => (
                    <p key={index} className="break-all font-ui text-[12px] text-fg">{raw}</p>
                  ))}
                </Card>
              ) : null}

              {analysis.prettyBody !== null ? (
                <Card title="Body">
                  <div className="overflow-auto">
                    <JsonCode text={analysis.prettyBody} />
                  </div>
                </Card>
              ) : analysis.message.body ? (
                <Card title="Body">
                  <pre className="whitespace-pre-wrap break-all font-ui text-[12px] text-fg">
                    {analysis.message.body}
                  </pre>
                </Card>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </ToolShell>
  );
}
