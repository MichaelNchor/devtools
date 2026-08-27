"use client";

import { useEffect } from "react";
import { Link2 } from "lucide-react";
import type { ToolMeta } from "@/lib/registry/types";
import { encodeShare, SHARE_PREFIX } from "@/lib/share";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import { Button } from "@/components/ui/Button";
import { FavouriteStar } from "./FavouriteStar";

interface Props {
  meta: ToolMeta;
  /** Serialisable state to encode when the user asks for a share link. */
  shareState?: unknown;
  /** The tool's controls. Rendered in one horizontal band above the panes. */
  options?: React.ReactNode;
  /** Copy / Clear / Load sample. Rendered right-aligned in the header. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function ToolShell({ meta, shareState, options, actions, children }: Props) {
  const { visit } = useWorkspace();

  useEffect(() => { visit(meta.slug); }, [meta.slug, visit]);

  // Sharing is explicit and gated twice: the tool must not handle secrets, and
  // the payload must fit. Over the ceiling, encodeShare returns null and the
  // button explains itself rather than handing over a link that will be cut.
  const payload = meta.handlesSecrets || shareState === undefined ? null : encodeShare(shareState);
  const canShare = !meta.handlesSecrets && shareState !== undefined;

  async function share() {
    if (!payload) return;
    const url = `${window.location.origin}${window.location.pathname}${SHARE_PREFIX}${payload}`;
    try { await navigator.clipboard.writeText(url); } catch { /* see CopyButton */ }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[1600px] flex-col gap-4 p-5 lg:p-7">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="font-ui text-[1.375rem] font-bold tracking-[-0.01em] text-fg">{meta.name}</h1>
            <FavouriteStar slug={meta.slug} name={meta.name} />
          </div>
          <p className="mt-1 max-w-prose text-[13px] text-fg-muted">{meta.blurb}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {canShare ? (
            <Button
              size="sm"
              onClick={share}
              disabled={!payload}
              title={payload ? "Copy a link that opens this tool with your input" : "Input is too large to share by link"}
            >
              <Link2 size={13} aria-hidden />
              Share
            </Button>
          ) : null}
        </div>
      </header>

      {options ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg bg-surface px-4 py-3 shadow-sm">
          {options}
        </div>
      ) : null}

      <div className="min-h-0 flex-1">{children}</div>
    </main>
  );
}
