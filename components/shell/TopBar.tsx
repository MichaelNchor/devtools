"use client";

import { Search } from "lucide-react";
import { LocalBadge } from "./LocalBadge";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Height is fixed at h-14 on purpose: ToolShell's options bar sticks directly
 * beneath this one and needs a number to offset by.
 */
export function TopBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/85 px-5 backdrop-blur lg:px-7">
      <button
        type="button"
        onClick={onOpenPalette}
        className="group flex flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left font-ui text-[12.5px] text-fg-muted transition-colors hover:border-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:max-w-sm"
      >
        <Search size={13} aria-hidden />
        <span className="flex-1">Search tools</span>
        <kbd className="rounded border border-border bg-surface-2 px-1.5 py-0.5 font-ui text-[10.5px] text-fg-muted">
          ⌘K
        </kbd>
      </button>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden sm:inline"><LocalBadge /></span>
        <ThemeToggle />
      </div>
    </header>
  );
}
