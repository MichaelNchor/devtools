"use client";

import { useEffect, useMemo, useState } from "react";
import { Eraser, KeySquare } from "lucide-react";
import { JWT_META } from "@/lib/registry/metas";
import { decodeJwt, describeTimeClaims, verifyJwt, type VerifyState } from "@/lib/tools/jwt";
import { JWT_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { Button } from "@/components/ui/Button";
import { CodeArea } from "@/components/ui/CodeArea";
import { Panel } from "@/components/ui/Panel";
import { JsonCode } from "@/components/ui/JsonCode";

interface State {
  token: string;
  key: string;
}

const DEFAULTS: State = { token: "", key: "" };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return typeof c.token === "string" && typeof c.key === "string";
}

/** Glyph + word + tint. The glyph and word alone must carry the verdict. */
const VERDICT: Record<VerifyState, { glyph: string; text: string; tone: string }> = {
  valid: { glyph: "✓", text: "Signature valid", tone: "bg-up-tint text-up" },
  invalid: { glyph: "✗", text: "Signature invalid", tone: "bg-rose-tint text-rose" },
  "not-verified": { glyph: "•", text: "Not verified", tone: "bg-surface-2 text-fg-2" },
};

const CLAIM_STATE: Record<string, { glyph: string; tone: string }> = {
  ok: { glyph: "✓", tone: "text-up" },
  expired: { glyph: "✗", tone: "text-rose" },
  "not-yet-valid": { glyph: "!", tone: "text-warn" },
};

export function Jwt() {
  const meta = JWT_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);
  const [verified, setVerified] = useState<VerifyState>("not-verified");

  const decoded = useMemo(
    () => (state.token.trim() ? decodeJwt(state.token) : null),
    [state.token],
  );

  const claims = useMemo(
    () => (decoded?.ok ? describeTimeClaims(decoded.value.payload) : []),
    [decoded],
  );

  // Verification is async and must never be inferred from decoding.
  useEffect(() => {
    let stale = false;
    if (!state.token.trim()) { setVerified("not-verified"); return; }
    void verifyJwt(state.token, state.key).then((result) => {
      if (!stale) setVerified(result.ok ? result.value : "not-verified");
    });
    return () => { stale = true; };
  }, [state.token, state.key]);

  const verdict = VERDICT[verified];
  const alg = decoded?.ok ? String(decoded.value.header.alg ?? "?") : null;

  return (
    <ToolShell
      meta={meta}
      examples={JWT_EXAMPLES}
      onLoadExample={(example) => update(example.state as Partial<State>)}
      isEmpty={!state.token.trim()}
      emptyHint={"Paste a JWT to decode its header and claims, and optionally verify its signature."}
      actions={
        <>
          <Button size="sm" onClick={reset}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Panel title="Encoded token" subtitle="Header, payload and signature" className="h-32">
          <CodeArea
            value={state.token}
            onChange={(token) => update({ token })}
            ariaLabel="JWT"
            placeholder="Paste a JWT"
            className="h-full rounded-none border-0"
          />
        </Panel>

        {decoded && !decoded.ok ? <ErrorNote error={decoded.error} /> : null}

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-1 items-center gap-2">
            <span className="eyebrow">Secret</span>
            <input
              value={state.key}
              onChange={(e) => update({ key: e.target.value })}
              aria-label="HMAC secret for verification"
              placeholder="HS256/384/512 secret — leave empty to only decode"
              className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
          <p className={`rounded-md px-3 py-1.5 font-ui text-[12.5px] ${verdict.tone}`}>
            <span aria-hidden>{verdict.glyph} </span>{verdict.text}
          </p>
        </div>

        {verified === "not-verified" && decoded?.ok ? (
          <p className="rounded-md bg-surface px-3 py-2 text-[12.5px] leading-relaxed text-fg-muted">
            Decoding a token proves nothing about its signature.
            {alg && alg.toLowerCase() === "none"
              ? ' This token declares alg "none", which is unsigned — it can never be reported valid.'
              : alg && !/^HS(256|384|512)$/i.test(alg)
                ? ` ${alg} needs a public key, which this build verifies for HMAC algorithms only.`
                : " Enter the secret above to actually check it."}
          </p>
        ) : null}

        {decoded?.ok ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title="Header" subtitle="Algorithm and type" bodyClassName="overflow-auto p-3">
              <JsonCode text={JSON.stringify(decoded.value.header, null, 2)} />
            </Panel>
            <Panel title="Payload" subtitle="Data and claims" bodyClassName="overflow-auto p-3">
              <JsonCode text={JSON.stringify(decoded.value.payload, null, 2)} />
            </Panel>
          </div>
        ) : null}

        {claims.length > 0 ? (
          <div className="rounded-lg bg-surface px-4 py-2 shadow-sm">
            <p className="eyebrow mb-1">Time claims</p>
            {claims.map((claim) => {
              const tone = CLAIM_STATE[claim.state]!;
              return (
                <div key={claim.claim} className="flex flex-wrap items-baseline gap-3 border-b border-border py-1.5 last:border-0">
                  <span className={`w-4 font-ui text-[12.5px] ${tone.tone}`} aria-hidden>{tone.glyph}</span>
                  <span className="eyebrow w-10">{claim.claim}</span>
                  <span className="font-ui text-[12.5px] text-fg tabular">{claim.at.toISOString()}</span>
                  <span className="text-[12.5px] text-fg-muted">{claim.relative}</span>
                  <span className={`text-[12.5px] ${tone.tone}`}>
                    {claim.state === "expired" ? "expired"
                      : claim.state === "not-yet-valid" ? "not yet valid" : "in range"}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </ToolShell>
  );
}
