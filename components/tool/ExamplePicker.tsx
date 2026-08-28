"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import type { ToolExample } from "@/lib/registry/types";
import { Button } from "@/components/ui/Button";
import { cx } from "@/lib/cx";

/**
 * Compact menu for when the user is already working and just wants a
 * different starting point. The full-size strip below is what an EMPTY tool
 * shows, because that is the moment a blank page has to teach.
 */
export function ExampleMenu({
  examples, onPick,
}: {
  examples: ToolExample[];
  onPick: (example: ToolExample) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (examples.length === 0) return null;

  // One example needs no menu — a menu of one is a button wearing a costume.
  if (examples.length === 1) {
    return (
      <Button size="sm" onClick={() => onPick(examples[0]!)}>
        <Sparkles size={13} aria-hidden />
        {examples[0]!.name}
      </Button>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <Button size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Sparkles size={13} aria-hidden />
        Examples
        <ChevronDown size={12} aria-hidden className={cx("transition-transform", open && "rotate-180")} />
      </Button>

      {open ? (
        <div
          role="menu"
          aria-label="Load an example"
          className="absolute right-0 top-[calc(100%+0.375rem)] z-50 w-[19rem] overflow-hidden rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          {examples.map((example) => (
            <button
              key={example.name}
              type="button"
              role="menuitem"
              onClick={() => { onPick(example); setOpen(false); }}
              className="flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <span className="font-ui text-[12.5px] font-medium text-fg">{example.name}</span>
              <span className="text-[11.5px] leading-snug text-fg-muted">{example.blurb}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The empty state. A blank tool that only says "paste something here" wastes
 * the one moment it has to show what it is for.
 */
export function ExampleStrip({
  examples, onPick, hint,
}: {
  examples: ToolExample[];
  onPick: (example: ToolExample) => void;
  hint: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-9 text-center">
      <p className="max-w-md text-[13px] leading-relaxed text-fg-muted">{hint}</p>

      {examples.length > 0 ? (
        <>
          <p className="eyebrow mt-6">Or start from an example</p>
          <div className="mt-3 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
            {examples.map((example) => (
              <button
                key={example.name}
                type="button"
                onClick={() => onPick(example)}
                className="group flex flex-col gap-1 rounded-lg border border-border bg-surface px-3.5 py-3 text-left transition-all duration-150 hover:-translate-y-px hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              >
                <span className="font-ui text-[12.5px] font-semibold text-fg">{example.name}</span>
                <span className="text-[11.5px] leading-snug text-fg-muted">{example.blurb}</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
