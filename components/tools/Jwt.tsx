"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Eraser, X } from "lucide-react";
import { JWT_META } from "@/lib/registry/metas";
import {
  decodeJwt, describeTimeClaims, verifyJwt, signJwtWithHeader,
  epochToLocalInput, localInputToEpoch, withTimeClaim, removeTimeClaim,
  TIME_CLAIMS, TIME_PRESETS, type TimeClaim, type VerifyState,
} from "@/lib/tools/jwt";
import { JWT_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { CodeArea } from "@/components/ui/CodeArea";
import { Panel } from "@/components/ui/Panel";
import { JsonViewer } from "@/components/ui/JsonViewer";
import { Segmented } from "@/components/ui/Segmented";
import { cx } from "@/lib/cx";

interface State {
  token: string;
  /** Held as text, because half-typed JSON must survive a keystroke. */
  headerText: string;
  payloadText: string;
  key: string;
}

const DEFAULTS: State = { token: "", headerText: "", payloadText: "", key: "" };

function isState(value: unknown): value is State {
  if (typeof value !== "object" || value === null) return false;
  const c = value as State;
  return typeof c.token === "string" && typeof c.key === "string"
    && typeof c.headerText === "string" && typeof c.payloadText === "string";
}

/** Glyph + word + tint. The glyph and word alone must carry the verdict. */
const VERDICT: Record<VerifyState, { glyph: string; text: string; tone: string }> = {
  valid: { glyph: "✓", text: "Signature valid", tone: "bg-up-tint text-up" },
  invalid: { glyph: "✗", text: "Signature invalid", tone: "bg-rose-tint text-rose" },
  "not-verified": { glyph: "•", text: "Not verified", tone: "bg-surface-2 text-fg-2" },
};

const CLAIM_STATE: Record<string, { glyph: string; tone: string; word: string }> = {
  ok: { glyph: "✓", tone: "text-up", word: "in range" },
  expired: { glyph: "✗", tone: "text-rose", word: "expired" },
  "not-yet-valid": { glyph: "!", tone: "text-warn", word: "not yet valid" },
};

/** What happened the last time the decoded side was edited. */
type ReSign =
  | { kind: "idle" }
  | { kind: "signed" }
  | { kind: "needs-secret" }
  | { kind: "bad-json" }
  | { kind: "failed"; message: string };

export function Jwt() {
  const meta = JWT_META;
  const [state, update, reset] = useToolState<State>(meta, DEFAULTS, isState);
  const [verified, setVerified] = useState<VerifyState>("not-verified");
  const [resign, setResign] = useState<ReSign>({ kind: "idle" });
  // Folding and editing cannot share one control: a textarea has no tree to
  // collapse. Reading is the default, since most visits are to read a token.
  const [claimView, setClaimView] = useState<"read" | "edit">("read");

  /** Whatever currently parses, so the folded view survives a half-typed edit. */
  const parsedHeader = useMemo(() => {
    try { return JSON.parse(state.headerText || "null") as unknown; } catch { return null; }
  }, [state.headerText]);
  const parsedPayload = useMemo(() => {
    try { return JSON.parse(state.payloadText || "null") as unknown; } catch { return null; }
  }, [state.payloadText]);

  const decoded = useMemo(
    () => (state.token.trim() ? decodeJwt(state.token) : null),
    [state.token],
  );

  const claims = useMemo(() => {
    try {
      const payload = JSON.parse(state.payloadText || "{}") as Record<string, unknown>;
      return describeTimeClaims(payload);
    } catch {
      return [];
    }
  }, [state.payloadText]);

  // Verification is async and must never be inferred from decoding.
  useEffect(() => {
    let stale = false;
    if (!state.token.trim()) { setVerified("not-verified"); return; }
    void verifyJwt(state.token, state.key).then((result) => {
      if (!stale) setVerified(result.ok ? result.value : "not-verified");
    });
    return () => { stale = true; };
  }, [state.token, state.key]);

  /** Editing the token drives the decoded side. */
  function editToken(token: string) {
    setResign({ kind: "idle" });
    const parsed = decodeJwt(token);
    update(parsed.ok
      ? {
        token,
        headerText: JSON.stringify(parsed.value.header, null, 2),
        payloadText: JSON.stringify(parsed.value.payload, null, 2),
      }
      : { token });
  }

  /**
   * Editing the decoded side drives the token — but only with a secret, since
   * a new signature cannot be produced without one. Without it the token is
   * left alone rather than silently falling out of step with the claims.
   */
  async function editClaims(patch: Partial<Pick<State, "headerText" | "payloadText">>) {
    update(patch);
    const next = { ...state, ...patch };
    if (!next.key) { setResign({ kind: "needs-secret" }); return; }

    let header: Record<string, unknown>;
    let payload: Record<string, unknown>;
    try {
      header = JSON.parse(next.headerText) as Record<string, unknown>;
      payload = JSON.parse(next.payloadText) as Record<string, unknown>;
    } catch {
      setResign({ kind: "bad-json" });
      return;
    }

    const signed = await signJwtWithHeader(header, payload, next.key);
    if (signed.ok) { update({ token: signed.value }); setResign({ kind: "signed" }); }
    else setResign({ kind: "failed", message: signed.error.message });
  }

  /** Writes a time claim into the payload, then re-signs if it can. */
  async function setClaim(claim: TimeClaim, seconds: number) {
    const next = withTimeClaim(state.payloadText, claim, seconds);
    if (!next.ok) { setResign({ kind: "bad-json" }); return; }
    await editClaims({ payloadText: next.value });
  }

  async function clearClaim(claim: TimeClaim) {
    const next = removeTimeClaim(state.payloadText, claim);
    if (!next.ok) { setResign({ kind: "bad-json" }); return; }
    await editClaims({ payloadText: next.value });
  }

  /** Re-signs on demand, for when the secret arrives after the edits. */
  async function reSignNow() {
    await editClaims({});
  }

  const verdict = VERDICT[verified];
  const alg = decoded?.ok ? String(decoded.value.header.alg ?? "?") : null;

  return (
    <ToolShell
      meta={meta}
      examples={JWT_EXAMPLES}
      onLoadExample={(example) => {
        setResign({ kind: "idle" });
        const patch = example.state as Partial<State>;
        // An example may carry only a token; fill the decoded side from it.
        if (patch.token && !patch.payloadText) {
          const parsed = decodeJwt(patch.token);
          if (parsed.ok) {
            update({
              ...patch,
              headerText: JSON.stringify(parsed.value.header, null, 2),
              payloadText: JSON.stringify(parsed.value.payload, null, 2),
            });
            return;
          }
        }
        update(patch);
      }}
      options={
        <Segmented
          label="Claims view"
          value={claimView}
          onChange={setClaimView}
          options={[
            { value: "read", label: "Fold" },
            { value: "edit", label: "Edit" },
          ]}
        />
      }
      isEmpty={!state.token.trim() && !state.payloadText.trim()}
      emptyHint="Paste a token to decode it, or write claims on the right and give a secret to sign them. Editing either side updates the other."
      actions={
        <>
          <Button size="sm" onClick={() => { setResign({ kind: "idle" }); reset(); }}>
            <Eraser size={13} aria-hidden />
            Clear
          </Button>
          {state.token ? <CopyButton text={state.token} label="Copy token" /> : null}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-w-0 flex-1 items-center gap-2">
            <span className="eyebrow">Secret</span>
            <input
              value={state.key}
              onChange={(e) => update({ key: e.target.value })}
              aria-label="Shared secret, for verifying and for re-signing"
              placeholder="HS256/384/512 secret — verifies, and lets you re-sign edits"
              className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]"
            />
          </label>

          {state.key && state.payloadText ? (
            <Button size="sm" onClick={() => void reSignNow()}>
              <ArrowLeftRight size={13} aria-hidden />
              Re-sign
            </Button>
          ) : null}

          <p className={`rounded-md px-3 py-1.5 font-ui text-[12.5px] ${verdict.tone}`}>
            <span aria-hidden>{verdict.glyph} </span>{verdict.text}
          </p>
        </div>

        {decoded && !decoded.ok ? <ErrorNote error={decoded.error} /> : null}

        {resign.kind !== "idle" && resign.kind !== "signed" ? (
          <p className="rounded-md border border-border bg-inset px-3 py-2 text-[12.5px] leading-relaxed text-fg-muted">
            {resign.kind === "needs-secret"
              ? "The token above still reflects the old claims. Enter the secret and it will be re-signed as you type — without one, no valid signature can be produced."
              : resign.kind === "bad-json"
                ? "Waiting for valid JSON on both sides before re-signing."
                : resign.message}
          </p>
        ) : null}

        <div className="grid min-h-0 gap-3 lg:grid-cols-2">
          <Panel
            title="Encoded"
            subtitle="The token"
            className="h-workspace"
          >
            <CodeArea
              value={state.token}
              onChange={editToken}
              ariaLabel="JWT"
              placeholder="Paste a JWT"
              className="h-full rounded-none border-0"
            />
          </Panel>

          <div className="flex min-h-0 flex-col gap-3">
            <Panel
              title="Header"
              subtitle={alg ? `Algorithm ${alg}` : "Algorithm and type"}
              className="h-workspace-half"
            >
              {claimView === "read" && parsedHeader !== null ? (
                <JsonViewer value={parsedHeader} className="h-full" />
              ) : (
                <CodeArea
                  value={state.headerText}
                  onChange={(headerText) => void editClaims({ headerText })}
                  ariaLabel="Header claims"
                  placeholder='{ "alg": "HS256", "typ": "JWT" }'
                  className="h-full rounded-none border-0"
                />
              )}
            </Panel>

            <Panel
              title="Payload"
              subtitle={claimView === "edit" ? "Editing re-signs the token" : "Data and claims"}
              className="h-workspace-half"
            >
              {claimView === "read" && parsedPayload !== null ? (
                <JsonViewer value={parsedPayload} className="h-full" />
              ) : (
                <CodeArea
                  value={state.payloadText}
                  onChange={(payloadText) => void editClaims({ payloadText })}
                  ariaLabel="Payload claims"
                  placeholder='{ "sub": "1234567890" }'
                  className="h-full rounded-none border-0"
                />
              )}
            </Panel>
          </div>
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

        {state.payloadText.trim() ? (
          <Panel
            title="Time claims"
            subtitle="Pick a date and the claim is written back as epoch seconds"
          >
            <div className="flex flex-col">
              {TIME_CLAIMS.map((claim) => {
                const current = claims.find((c) => c.claim === claim);
                const tone = current ? CLAIM_STATE[current.state]! : null;
                return (
                  <div
                    key={claim}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-2.5 last:border-0"
                  >
                    <span className={cx("w-4 font-ui text-[12.5px]", tone?.tone)} aria-hidden>
                      {tone?.glyph ?? "·"}
                    </span>
                    <span className="eyebrow w-10">{claim}</span>

                    <input
                      type="datetime-local"
                      value={current ? epochToLocalInput(current.at.getTime() / 1000) : ""}
                      onChange={(e) => {
                        const seconds = localInputToEpoch(e.target.value);
                        if (seconds !== null) void setClaim(claim, seconds);
                      }}
                      aria-label={`${claim} date and time`}
                      className="h-8 rounded-md border border-border bg-surface px-2 font-ui text-[12.5px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]"
                    />

                    <span className="flex flex-wrap items-center gap-1">
                      {TIME_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => void setClaim(claim, Math.floor(Date.now() / 1000) + preset.seconds)}
                          className="rounded-md bg-surface-2 px-1.5 py-1 font-ui text-[11px] text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </span>

                    {current ? (
                      <>
                        <span className="font-ui text-[11.5px] text-fg-muted tabular">
                          {Math.floor(current.at.getTime() / 1000)}
                        </span>
                        <span className="text-[12px] text-fg-muted">{current.relative}</span>
                        <span className={cx("text-[12px]", tone!.tone)}>{tone!.word}</span>
                        <button
                          type="button"
                          onClick={() => void clearClaim(claim)}
                          aria-label={`Remove the ${claim} claim`}
                          className="ml-auto rounded-md p-1 text-fg-muted transition-colors hover:text-rose focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                        >
                          <X size={13} aria-hidden />
                        </button>
                      </>
                    ) : (
                      <span className="text-[12px] text-fg-muted">not set</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        ) : null}
      </div>
    </ToolShell>
  );
}
