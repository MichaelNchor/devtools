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
  /** Serialisable state to encode when the user asks for a share link. */
  shareState?: unknown;
  /** The tool's controls. Rendered in one horizontal band above the panes. */
  options?: React.ReactNode;
  /** Copy / Clear. Rendered right-aligned in the header, before Examples. */
  actions?: React.ReactNode;
  /** Worked examples. The shell renders the menu, so no tool builds its own. */
  examples?: ToolExample[] | undefined;
  onLoadExample?: ((example: ToolExample) => void) | undefined;
  /**
   * True when the tool has no input yet. The shell then shows the examples
   * strip in place of `children`, so a blank page teaches instead of sitting
   * empty — every tool gets that without writing its own empty state.
   */
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

  // Sharing is explicit and gated twice: the tool must not handle secrets, and
  // the payload must fit. Over the ceiling, encodeShare returns null and the
  // button explains itself rather than handing over a link that will be cut.
  const gate = shareGate(meta, shareState);
  const canShare = gate.shareable;
  const payload = gate.shareable ? gate.payload : null;

  async function share() {
    if (!payload) return;
    const url = `${window.location.origin}${window.location.pathname}${SHARE_PREFIX}${payload}`;
    try {
      await navigator.clipboard.writeText(url);
      // Silence after a click reads as a broken button. Say it worked.
      setCopied(true);
    } catch { /* see CopyButton */ }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1600px] flex-col">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 px-5 pb-4 pt-5 lg:px-7 lg:pt-6">
        <div className="flex min-w-0 items-start gap-3">
          {/* The page carries the same mark as its card and its rail row, so
              arriving here confirms you landed where you clicked. */}
          <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${toneFor(meta.slug, meta.group)}`}>
            <Icon size={17} aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-ui text-[1.3rem] font-bold tracking-[-0.01em] text-fg">{meta.name}</h1>
              <FavouriteStar slug={meta.slug} name={meta.name} />
            </div>
            <p className="mt-0.5 max-w-prose text-[12.5px] leading-relaxed text-fg-muted">
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
        // Sticky: on a long diff or a tall payload the controls would
        // otherwise scroll away exactly when you want to change one.
        <div className="sticky top-14 z-20 border-b border-border bg-bg/90 backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 px-5 py-2.5 lg:px-7">
            {options}
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 px-5 py-4 lg:px-7 lg:py-5">
        {isEmpty && emptyHint && examples && onLoadExample ? (
          <ExampleStrip examples={examples} onPick={onLoadExample} hint={emptyHint} />
        ) : children}

        {guide ? <ToolGuide guide={guide} /> : null}
      </div>
    </main>
  );
}
