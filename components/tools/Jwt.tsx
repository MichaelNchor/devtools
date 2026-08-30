"use client";

import { useEffect, useMemo, useState } from "react";
import { Eraser, KeySquare, PenLine } from "lucide-react";
import { JWT_META } from "@/lib/registry/metas";
import {
  decodeJwt, describeTimeClaims, verifyJwt, signJwt,
  SIGNING_ALGORITHMS, type SigningAlgorithm, type VerifyState,
} from "@/lib/tools/jwt";
import { JWT_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { Button } from "@/components/ui/Button";
import { Segmented } from "@/components/ui/Segmented";
import { Select } from "@/components/ui/Select";
import { CopyButton } from "@/components/tool/CopyButton";
import { EmptyOutput } from "@/components/ui/Panel";
import { CodeArea } from "@/components/ui/CodeArea";
import { Panel } from "@/components/ui/Panel";
import { JsonViewer } from "@/components/ui/JsonViewer";

interface State {
  mode: "decode" | "encode";
  token: string;
  key: string;
  /** The payload being composed in encode mode, as text so it stays editable. */
  claims: string;
  algorithm: SigningAlgorithm;
}

const DEFAULTS: State = {
  mode: "decode",
  token: "",
  key: "",
  claims: '{\n  "sub": "1234567890",\n  "name": "Ada Lovelace"\n}',
  algorithm: "HS256",
};

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return typeof c.token === "string" && typeof c.key === "string"
    && typeof c.claims === "string"
    && ["decode", "encode"].includes(c.mode)
    && (SIGNING_ALGORITHMS as readonly string[]).includes(c.algorithm);
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
  const [signed, setSigned] = useState<{ token: string } | { error: string } | null>(null);

  async function sign() {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(state.claims) as Record<string, unknown>;
    } catch {
      setSigned({ error: "The claims are not valid JSON." });
      return;
    }
    const result = await signJwt(state.algorithm, payload, state.key);
    setSigned(result.ok ? { token: result.value } : { error: result.error.message });
  }

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
      isEmpty={state.mode === "decode" && !state.token.trim()}
      emptyHint={"Paste a JWT to decode its header and claims, and optionally verify its signature."}
      options={
        <>
          <Segmented
            label="Mode"
            value={state.mode}
            onChange={(mode) => { setSigned(null); update({ mode }); }}
            options={[
              { value: "decode", label: "Decode & verify" },
              { value: "encode", label: "Create" },
            ]}
          />
          {state.mode === "encode" ? (
            <label className="flex items-center gap-2">
              <span className="eyebrow">Algorithm</span>
              <Select
                value={state.algorithm}
                ariaLabel="Signing algorithm"
                onChange={(algorithm: SigningAlgorithm) => update({ algorithm })}
                options={SIGNING_ALGORITHMS.map((a) => ({ value: a, label: a }))}
              />
            </label>
          ) : null}
        </>
      }
      actions={
        <>
          <Button size="sm" onClick={reset}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
        </>
      }
    >
      {state.mode === "encode" ? (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel title="Claims" subtitle="The payload to sign" className="h-[38dvh] min-h-[14rem]">
              <CodeArea
                value={state.claims}
                onChange={(claims) => { setSigned(null); update({ claims }); }}
                ariaLabel="Claims to sign"
                placeholder='{ "sub": "1234567890" }'
                className="h-full rounded-none border-0"
              />
            </Panel>

            <Panel
              title="Signed token"
              subtitle={`${state.algorithm}, signed in this tab`}
              className="h-[38dvh] min-h-[14rem]"
              actions={signed && "token" in signed
                ? <CopyButton text={signed.token} label="Copy" />
                : null}
            >
              {signed === null ? (
                <EmptyOutput>Enter a secret and press Sign to create the token.</EmptyOutput>
              ) : "error" in signed ? (
                <div className="p-3">
                  <p className="rounded-md bg-rose-tint px-3 py-2 text-[12.5px] text-rose">
                    ✗ {signed.error}
                  </p>
                </div>
              ) : (
                <div className="h-full overflow-auto p-3">
                  <p className="break-all font-ui text-[12.5px] leading-relaxed text-fg">
                    {signed.token}
                  </p>
                </div>
              )}
            </Panel>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex flex-1 items-center gap-2">
              <span className="eyebrow">Secret</span>
              <input
                value={state.key}
                onChange={(e) => { setSigned(null); update({ key: e.target.value }); }}
                aria-label="Secret to sign with"
                placeholder="The shared secret for the HMAC"
                className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
            </label>
            <Button size="sm" variant="primary" onClick={() => void sign()} disabled={!state.key}>
              <PenLine size={13} aria-hidden />
              Sign
            </Button>
            {signed && "token" in signed ? (
              <Button
                size="sm"
                onClick={() => { setSigned(null); update({ mode: "decode", token: signed.token }); }}
              >
                Open in decoder
              </Button>
            ) : null}
          </div>

          {/* Only the HMAC family takes a shared secret, and saying so beats
              listing algorithms the tool would then have to refuse. */}
          <p className="rounded-md border border-border bg-inset px-3 py-2 text-[12.5px] leading-relaxed text-fg-muted">
            HS256, HS384 and HS512 sign with a shared secret. RS and ES algorithms
            need a private key, which this tool does not take — it verifies those
            only, and never claims to have signed one.
          </p>
        </div>
      ) : (
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
          <p className="rounded-md border border-border bg-inset px-3 py-2 text-[12.5px] leading-relaxed text-fg-muted">
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
            <Panel title="Header" subtitle="Algorithm and type" className="max-h-72">
              <JsonViewer value={decoded.value.header} className="h-full" />
            </Panel>
            <Panel title="Payload" subtitle="Data and claims" className="max-h-72">
              <JsonViewer value={decoded.value.payload} className="h-full" />
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
      )}
    </ToolShell>
  );
}
