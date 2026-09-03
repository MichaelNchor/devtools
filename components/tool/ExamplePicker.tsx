"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ToolExample } from "@/lib/registry/types";
import { Button } from "@/components/ui/Button";
import { cx } from "@/lib/cx";

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

  if (examples.length === 1) {
    return (
      <Button size="sm" onClick={() => onPick(examples[0]!)}>
        {examples[0]!.name}
      </Button>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <Button size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Example
        <ChevronDown size={12} aria-hidden className={cx("transition-transform", open && "rotate-180")} />
      </Button>

      {open ? (
        <div
          role="menu"
          aria-label="Load an example"
          className="absolute right-0 top-[calc(100%+0.375rem)] z-50 w-[16rem] overflow-hidden rounded-2xl border border-border bg-surface p-1.5 shadow-lg"
        >
          {examples.map((example) => (
            <button
              key={example.name}
              type="button"
              role="menuitem"
              onClick={() => { onPick(example); setOpen(false); }}
              className="flex w-full rounded-full px-3 py-2 text-left font-ui text-[12.5px] font-medium text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              {example.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ExampleStrip({
  examples, onPick, hint,
}: {
  examples: ToolExample[];
  onPick: (example: ToolExample) => void;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-inset px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-[12.5px] leading-relaxed text-fg-muted">{hint}</p>
      </div>

      {examples.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="eyebrow eyebrow-info">Try</span>
          {examples.map((example) => (
            <button
              key={example.name}
              type="button"
              onClick={() => onPick(example)}
              title={example.blurb}
              className="rounded-full border border-border bg-surface px-3 py-1.5 font-ui text-[12px] text-fg transition-colors hover:border-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              {example.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
