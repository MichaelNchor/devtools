"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { toneFor, type ToolMeta } from "@/lib/registry/types";
import { FavouriteStar } from "@/components/tool/FavouriteStar";

export function ToolCard({ meta }: { meta: ToolMeta }) {
  const Icon = meta.icon;
  return (
    <div className="group relative flex items-center gap-3.5 rounded-2xl border border-border bg-bg/40 p-3.5 transition-colors duration-150 hover:bg-inset">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${toneFor(meta.slug, meta.group)}`}>
        <Icon size={18} aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <Link
          href={`/${meta.slug}`}
          className="font-display text-[14px] font-semibold tracking-[-0.02em] text-fg after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {meta.name}
        </Link>
        <p className="mt-0.5 truncate text-[12px] text-fg-muted">{meta.tagline}</p>
      </div>

      <span className="relative z-10 flex shrink-0 items-center gap-1">
        <FavouriteStar slug={meta.slug} name={meta.name} />
        <ArrowUpRight
          size={15}
          aria-hidden
          className="text-fg-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        />
      </span>
    </div>
  );
}
