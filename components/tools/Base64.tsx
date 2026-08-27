"use client";

import { useMemo, useRef, useState } from "react";
import { Eraser, FileJson, Upload } from "lucide-react";
import { BASE64_META } from "@/lib/registry/metas";
import {
  encodeBase64, decodeBase64, bytesToHex, toDataUri,
  DEFAULT_BASE64_OPTIONS, type Base64Options,
} from "@/lib/tools/base64";
import { BASE64_SAMPLE } from "@/lib/tools/base64-sample";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Segmented } from "@/components/ui/Segmented";
import { CodeArea } from "@/components/ui/CodeArea";

interface State {
  input: string;
  mode: "encode" | "decode";
  options: Base64Options;
  mime: string;
}

const DEFAULTS: State = {
  input: "", mode: "encode", options: DEFAULT_BASE64_OPTIONS, mime: "text/plain",
};

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as State;
  if (typeof candidate.input !== "string" || typeof candidate.mime !== "string") return false;
  if (typeof candidate.options !== "object" || candidate.options === null) return false;
  return typeof candidate.options.urlSafe === "boolean"
    && typeof candidate.options.padding === "boolean"
    && ["encode", "decode"].includes(candidate.mode);
}

export function Base64() {
  const meta = BASE64_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const encoded = useMemo(
    () => (state.mode === "encode" && state.input ? encodeBase64(state.input, state.options) : null),
    [state.mode, state.input, state.options],
  );
  const decoded = useMemo(
    () => (state.mode === "decode" && state.input ? decodeBase64(state.input, state.options) : null),
    [state.mode, state.input, state.options],
  );

  const output = encoded?.ok ? encoded.value : decoded?.ok ? decoded.value.text ?? "" : "";
  const error = encoded && !encoded.ok ? encoded.error : decoded && !decoded.ok ? decoded.error : null;
  const binary = decoded?.ok && decoded.value.text === null ? decoded.value.bytes : null;

  async function onFile(file: File) {
    setFileName(file.name);
    const buffer = new Uint8Array(await file.arrayBuffer());
    if (state.mode === "encode") {
      // Encoding a file means encoding its BYTES, so the text path is bypassed
      // entirely rather than trying to read the file as a string first.
      let binaryString = "";
      for (const byte of buffer) binaryString += String.fromCharCode(byte);
      update({ input: binaryString, mime: file.type || "application/octet-stream" });
    } else {
      update({ input: new TextDecoder().decode(buffer) });
    }
  }

  function download() {
    if (!binary) return;
    // Uint8Array -> Blob -> object URL. No network: this is a local blob.
    const url = URL.createObjectURL(new Blob([binary as BlobPart], { type: state.mime }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName ?? "decoded.bin";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <ToolShell
      meta={meta}
      shareState={state}
      actions={
        <>
          <Button size="sm" onClick={() => update(BASE64_SAMPLE)}>
            <FileJson size={13} aria-hidden />
            Load sample
          </Button>
          <Button size="sm" onClick={() => fileInput.current?.click()}>
            <Upload size={13} aria-hidden />
            Load file
          </Button>
          <input
            ref={fileInput}
            type="file"
            className="sr-only"
            aria-label="Load a file"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
          />
          <Button size="sm" onClick={() => { setFileName(null); reset(); }}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
          {output ? <CopyButton text={output} label="Copy output" /> : null}
        </>
      }
      options={
        <>
          <Segmented
            label="Direction"
            value={state.mode}
            onChange={(mode) => update({ mode })}
            options={[
              { value: "encode", label: "Encode" },
              { value: "decode", label: "Decode" },
            ]}
          />
          <Toggle
            checked={state.options.urlSafe}
            onChange={(urlSafe) => update({ options: { ...state.options, urlSafe } })}
            label="URL-safe alphabet"
          />
          <Toggle
            checked={state.options.padding}
            onChange={(padding) => update({ options: { ...state.options, padding } })}
            label="Padding"
          />
          <label className="flex items-center gap-2">
            <span className="eyebrow">MIME</span>
            <input
              value={state.mime}
              onChange={(e) => update({ mime: e.target.value })}
              aria-label="MIME type for the data URI"
              className="h-9 w-40 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
        </>
      }
    >
      <div className="flex h-[calc(100dvh-15rem)] min-h-[26rem] flex-col gap-3">
        {fileName ? (
          <p className="text-[12px] text-fg-muted">
            Loaded <span className="font-ui text-fg">{fileName}</span>
          </p>
        ) : null}

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
          <CodeArea
            value={state.input}
            onChange={(input) => update({ input })}
            ariaLabel={state.mode === "encode" ? "Text to encode" : "Base64 to decode"}
            placeholder={state.mode === "encode" ? "Type or paste text" : "Paste base64"}
          />
          <div className="flex min-h-0 flex-col gap-2">
            {error ? <ErrorNote error={error} /> : null}

            {binary ? (
              <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-md border border-border bg-surface p-3">
                {/* The word, not just a colour, says what happened. */}
                <p className="text-[12.5px] text-warn">
                  ! Decoded bytes are not valid UTF-8. Showing hex.
                </p>
                <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all font-ui text-[12px] text-fg">
                  {bytesToHex(binary)}
                </pre>
                <Button size="sm" onClick={download}>Download {binary.length} bytes</Button>
              </div>
            ) : (
              <CodeArea value={output} readOnly ariaLabel="Output" />
            )}

            {encoded?.ok && encoded.value ? (
              <div className="flex items-center gap-2">
                <p className="eyebrow">Data URI</p>
                <CopyButton text={toDataUri(encoded.value, state.mime)} label="Copy data URI" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
