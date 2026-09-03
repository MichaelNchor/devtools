"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Eraser, KeySquare } from "lucide-react";
import { JWT_META } from "@/lib/registry/metas";
import {
  decodeJwt, describeTimeClaims, verifyJwt, signJwtWithHeader, type VerifyState,
} from "@/lib/tools/jwt";
import { JWT_EXAMPLES } from "@/lib/tools/examples";
import { ToolShell } from "@/components/tool/ToolShell";
import { useToolState } from "@/components/tool/useToolState";
import { ErrorNote } from "@/components/tool/ErrorNote";
import { CopyButton } from "@/components/tool/CopyButton";
import { Button } from "@/components/ui/Button";
import { CodeArea } from "@/components/ui/CodeArea";
import { Panel } from "@/components/ui/Panel";
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
              className="h-9 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 font-ui text-[13px] text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
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
            className="h-[46dvh] min-h-[18rem]"
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
              className="h-[21dvh] min-h-[8rem]"
            >
              <CodeArea
                value={state.headerText}
                onChange={(headerText) => void editClaims({ headerText })}
                ariaLabel="Header claims"
                placeholder='{ "alg": "HS256", "typ": "JWT" }'
                className="h-full rounded-none border-0"
              />
            </Panel>

            <Panel
              title="Payload"
              subtitle="Data and claims — edit to re-sign"
              className="h-[22dvh] min-h-[9rem]"
            >
              <CodeArea
                value={state.payloadText}
                onChange={(payloadText) => void editClaims({ payloadText })}
                ariaLabel="Payload claims"
                placeholder='{ "sub": "1234567890" }'
                className="h-full rounded-none border-0"
              />
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

        {claims.length > 0 ? (
          <Panel title="Time claims" subtitle="Read from the payload as you edit it">
            <div className="px-3 py-1">
              {claims.map((claim) => {
                const tone = CLAIM_STATE[claim.state]!;
                return (
                  <div key={claim.claim} className="flex flex-wrap items-baseline gap-3 border-b border-border py-1.5 last:border-0">
                    <span className={`w-4 font-ui text-[12.5px] ${tone.tone}`} aria-hidden>{tone.glyph}</span>
                    <span className="eyebrow w-10">{claim.claim}</span>
                    <span className="font-ui text-[12.5px] text-fg tabular">{claim.at.toISOString()}</span>
                    <span className="text-[12.5px] text-fg-muted">{claim.relative}</span>
                    <span className={cx("text-[12.5px]", tone.tone)}>{tone.word}</span>
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
