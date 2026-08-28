"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { GROUP_TONE, type ToolMeta } from "@/lib/registry/types";
import { FavouriteStar } from "@/components/tool/FavouriteStar";

export function ToolCard({ meta }: { meta: ToolMeta }) {
  const Icon = meta.icon;
  return (
    <div className="group relative flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm transition-all duration-150 hover:-translate-y-px hover:border-primary/40 hover:shadow-md">
      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform duration-150 group-hover:scale-105 ${GROUP_TONE[meta.group]}`}>
        <Icon size={15} aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        {/* The whole card is the hit target: the pseudo-element covers it, and
            the star sits above it on z-10 so pinning does not navigate. */}
        <Link
          href={`/${meta.slug}`}
          className="font-ui text-[13px] font-semibold text-fg after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {meta.name}
        </Link>
        <p className="mt-1 text-[12.5px] leading-snug text-fg-muted">{meta.blurb}</p>
      </div>

      <span className="relative z-10 flex shrink-0 items-center gap-0.5">
        {/* Decorative only — the link text already says where this goes. */}
        <ArrowUpRight
          size={14}
          aria-hidden
          className="text-fg-muted opacity-0 transition-opacity group-hover:opacity-100"
        />
        <FavouriteStar slug={meta.slug} name={meta.name} />
      </span>
    </div>
  );
}
