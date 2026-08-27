"use client";

import { Search } from "lucide-react";
import { LocalBadge } from "./LocalBadge";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-bg/85 px-5 py-2.5 backdrop-blur">
      <button
        type="button"
        onClick={onOpenPalette}
        className="flex flex-1 items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-left font-ui text-[12.5px] text-fg-muted transition-colors hover:border-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:max-w-xs"
      >
        <Search size={13} aria-hidden />
        <span className="flex-1">Search tools</span>
        <kbd className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-ui text-[10.5px] text-fg-muted">⌘K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-3">
        <span className="hidden sm:inline"><LocalBadge /></span>
        <ThemeToggle />
      </div>
    </header>
  );
}
