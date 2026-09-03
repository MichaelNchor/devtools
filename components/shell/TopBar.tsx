"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { toolBySlug } from "@/lib/registry";
import { ThemeToggle } from "./ThemeToggle";

export function TopBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const pathname = usePathname();
  const entry = toolBySlug(pathname.replace(/^\//, ""));
  const Icon = entry?.meta.icon;

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 px-5 lg:px-7">
      {entry && Icon ? (
        <div className="hidden shrink-0 items-center gap-2 pr-1 md:flex">
          <Icon size={15} aria-hidden className="text-fg-muted" />
          <span className="font-display text-[13px] font-semibold tracking-[-0.02em] text-fg">{entry.meta.name}</span>
        </div>
      ) : null}
      <button
        type="button"
        onClick={onOpenPalette}
        className="group flex flex-1 items-center gap-2 rounded-full border border-border bg-inset px-4 py-2.5 text-left font-ui text-[13px] text-fg-muted transition-colors hover:border-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] sm:max-w-md"
      >
        <Search size={14} aria-hidden />
        <span className="flex-1">Search</span>
        <kbd className="rounded-full border border-border bg-surface px-2 py-0.5 font-ui text-[10.5px] text-fg-muted">
          ⌘K
        </kbd>
      </button>
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
      </div>
    </header>
  );
}
