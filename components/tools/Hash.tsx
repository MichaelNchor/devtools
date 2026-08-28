"use client";

import { useEffect, useRef, useState } from "react";
import { Hash as HashIcon, Upload } from "lucide-react";
import { HASH_META } from "@/lib/registry/metas";
import {
  hashText, hashStream, digestsMatch, HASH_ALGORITHMS,
  DEFAULT_HASH_OPTIONS, type HashAlgorithm, type HashOptions,
} from "@/lib/tools/hash";
import { HASH_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Segmented } from "@/components/ui/Segmented";
import { CodeArea } from "@/components/ui/CodeArea";
import type { ToolError } from "@/lib/types";

interface State {
  input: string;
  algorithm: HashAlgorithm;
  encoding: "hex" | "base64";
  hmacKey: string;
  expected: string;
}

const DEFAULTS: State = { input: "", ...DEFAULT_HASH_OPTIONS, expected: "" };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return typeof c.input === "string" && typeof c.hmacKey === "string"
    && typeof c.expected === "string"
    && HASH_ALGORITHMS.some((a) => a.value === c.algorithm)
    && ["hex", "base64"].includes(c.encoding);
}

export function Hash() {
  const meta = HASH_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);
  const [digest, setDigest] = useState("");
  const [error, setError] = useState<ToolError | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const options: HashOptions = {
    algorithm: state.algorithm, encoding: state.encoding, hmacKey: state.hmacKey,
  };

  // Hashing is async, so the result cannot be a useMemo. The stale guard
  // stops a slow earlier digest from overwriting a newer one.
  useEffect(() => {
    let stale = false;
    if (!state.input) { setDigest(""); setError(null); return; }
    void hashText(state.input, options).then((result) => {
      if (stale) return;
      if (result.ok) { setDigest(result.value); setError(null); }
      else { setDigest(""); setError(result.error); }
    });
    return () => { stale = true; };
  }, [state.input, state.algorithm, state.encoding, state.hmacKey]);

  async function onFile(file: File) {
    setFileName(file.name);
    // Streamed in chunks so a large file does not have to fit in memory.
    const result = await hashStream(file, options);
    if (result.ok) { setDigest(result.value); setError(null); update({ input: "" }); }
    else { setDigest(""); setError(result.error); }
  }

  const comparison = state.expected.trim()
    ? digestsMatch(digest, state.expected)
    : null;

  return (
    <ToolShell
      meta={meta}
      examples={HASH_EXAMPLES}
      onLoadExample={(example) => update(example.state as Partial<State>)}
      isEmpty={!state.input.trim() && !digest}
      emptyHint={"Type or paste text, or choose a file, to hash it — with HMAC and a compare field."}
      actions={
        <>
          <Button size="sm" onClick={() => fileInput.current?.click()}>
            <Upload size={13} aria-hidden />
            Hash a file
          </Button>
          <input
            ref={fileInput}
            type="file"
            className="sr-only"
            aria-label="Choose a file to hash"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
          />
          <Button size="sm" onClick={() => { setFileName(null); setDigest(""); reset(); }}>Clear</Button>
          {digest ? <CopyButton text={digest} label="Copy digest" /> : null}
        </>
      }
      options={
        <>
          <label className="flex items-center gap-2">
            <span className="eyebrow">Algorithm</span>
            <Select
              value={state.algorithm}
              ariaLabel="Hash algorithm"
              onChange={(algorithm: HashAlgorithm) => update({ algorithm })}
              options={HASH_ALGORITHMS}
            />
          </label>
          <Segmented
            label="Output encoding"
            value={state.encoding}
            onChange={(encoding) => update({ encoding })}
            options={[{ value: "hex", label: "Hex" }, { value: "base64", label: "Base64" }]}
          />
          <label className="flex items-center gap-2">
            <span className="eyebrow">HMAC key</span>
            <input
              value={state.hmacKey}
              onChange={(e) => update({ hmacKey: e.target.value })}
              aria-label="HMAC key (leave empty for a plain digest)"
              placeholder="optional"
              className="h-9 w-40 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error ? <ErrorNote error={error} /> : null}

        <CodeArea
          value={state.input}
          onChange={(input) => { setFileName(null); update({ input }); }}
          ariaLabel="Text to hash"
          placeholder="Type or paste text, or hash a file"
          className="h-40"
        />

        {fileName ? (
          <p className="text-[12px] text-fg-muted">
            Hashed file <span className="font-ui text-fg">{fileName}</span>
          </p>
        ) : null}

        <div className="rounded-lg bg-surface px-4 py-3 shadow-sm">
          <p className="eyebrow mb-1.5">
            {state.hmacKey ? `HMAC-${state.algorithm.toUpperCase()}` : state.algorithm.toUpperCase()}
          </p>
          <p className="break-all font-ui text-[13px] text-fg">{digest || "—"}</p>
        </div>

        <div className="flex flex-col gap-2 rounded-lg bg-surface px-4 py-3 shadow-sm">
          <label className="flex items-center gap-2">
            <span className="eyebrow w-20">Compare</span>
            <input
              value={state.expected}
              onChange={(e) => update({ expected: e.target.value })}
              aria-label="Expected digest"
              placeholder="Paste a digest to check against"
              className="h-9 flex-1 rounded-md border border-border bg-surface px-2 font-ui text-[12.5px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
          {comparison !== null ? (
            // The glyph and the word carry the verdict; the tint only echoes it.
            <p className={comparison
              ? "rounded-md bg-up-tint px-3 py-1.5 text-[12.5px] text-up"
              : "rounded-md bg-rose-tint px-3 py-1.5 text-[12.5px] text-rose"}>
              {comparison ? "✓ Match — the digests are identical." : "✗ No match — the digests differ."}
            </p>
          ) : null}
        </div>

        <p className="text-[12px] text-fg-muted">
          Hashed in this tab. Input is never stored, never shared by link, and
          never leaves your browser.
        </p>
      </div>
    </ToolShell>
  );
}
