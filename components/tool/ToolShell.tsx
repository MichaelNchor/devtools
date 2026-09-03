"use client";

import { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { toneFor, type ToolExample, type ToolMeta } from "@/lib/registry/types";
import { SHARE_PREFIX } from "@/lib/share";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import { Button } from "@/components/ui/Button";
import { FavouriteStar } from "./FavouriteStar";
import { GUIDES } from "@/lib/tools/guides";
import { ExampleMenu, ExampleStrip } from "./ExamplePicker";
import { ToolGuide } from "./ToolGuide";
import { shareGate } from "./useToolState";

interface Props {
  meta: ToolMeta;
  shareState?: unknown;
  options?: React.ReactNode;
  actions?: React.ReactNode;
  examples?: ToolExample[] | undefined;
  onLoadExample?: ((example: ToolExample) => void) | undefined;
  isEmpty?: boolean | undefined;
  emptyHint?: string | undefined;
  children: React.ReactNode;
}

export function ToolShell({
  meta, shareState, options, actions,
  examples, onLoadExample, isEmpty, emptyHint, children,
}: Props) {
  const { visit } = useWorkspace();
  const [copied, setCopied] = useState(false);
  const Icon = meta.icon;
  const guide = GUIDES[meta.slug];

  useEffect(() => { visit(meta.slug); }, [meta.slug, visit]);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(id);
  }, [copied]);

  const gate = shareGate(meta, shareState);
  const canShare = gate.shareable;
  const payload = gate.shareable ? gate.payload : null;

  async function share() {
    if (!payload) return;
    const url = `${window.location.origin}${window.location.pathname}${SHARE_PREFIX}${payload}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch { /* see CopyButton */ }
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-[1600px] flex-col">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pb-3 pt-2 lg:px-7">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${toneFor(meta.slug, meta.group)}`}>
            <Icon size={17} aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-display text-[1.45rem] font-extrabold tracking-[-0.04em] text-fg">{meta.name}</h1>
              <FavouriteStar slug={meta.slug} name={meta.name} />
            </div>
            <p className="mt-0.5 max-w-prose text-[13px] leading-relaxed text-fg-muted">
              {meta.blurb}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions}
          {examples && onLoadExample ? (
            <ExampleMenu examples={examples} onPick={onLoadExample} />
          ) : null}
          {canShare ? (
            <Button
              size="sm"
              onClick={share}
              disabled={!payload}
              title={payload
                ? "Copy a link that opens this tool with your input"
                : "Input is too large to share by link"}
            >
              {copied ? <Check size={13} aria-hidden /> : <Link2 size={13} aria-hidden />}
              {copied ? "Link copied" : "Share"}
            </Button>
          ) : null}
        </div>
      </header>

      {options ? (
        <div className="sticky top-0 z-20 bg-surface/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 px-5 py-2 lg:px-7">
            {options}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 px-5 py-3 lg:px-7 lg:py-4">
        {isEmpty && emptyHint && examples && onLoadExample ? (
          <div className="mb-4">
            <ExampleStrip examples={examples} onPick={onLoadExample} hint={emptyHint} />
          </div>
        ) : null}

        {children}

        {guide ? <ToolGuide guide={guide} /> : null}
      </div>
    </main>
  );
}
