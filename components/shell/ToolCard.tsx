"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GROUP_TONE, type ToolMeta } from "@/lib/registry/types";
import { FavouriteStar } from "@/components/tool/FavouriteStar";

/**
 * A row, not a block. Sixteen of these stack into three scannable columns,
 * where the icon carries the group and the tagline carries the job — the full
 * sentence lives on the tool page, where there is room to read it.
 */
export function ToolCard({ meta }: { meta: ToolMeta }) {
  const Icon = meta.icon;
  return (
    <div className="group relative flex items-center gap-3.5 rounded-2xl border border-border bg-surface p-3.5 shadow-sm transition-all duration-150 hover:border-primary/30 hover:shadow-md">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-transform duration-150 group-hover:scale-110 ${GROUP_TONE[meta.group]}`}>
        <Icon size={19} aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        {/* The whole card is the hit target: the pseudo-element covers it, and
            the star sits above it on z-10 so pinning does not navigate. */}
        <Link
          href={`/${meta.slug}`}
          className="font-ui text-[13.5px] font-semibold text-fg after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          {meta.name}
        </Link>
        <p className="mt-0.5 truncate text-[12px] text-fg-muted">{meta.tagline}</p>
      </div>

      <span className="relative z-10 flex shrink-0 items-center gap-1">
        <FavouriteStar slug={meta.slug} name={meta.name} />
        <ArrowRight
          size={15}
          aria-hidden
          className="translate-x-1 text-fg-muted opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:text-primary group-hover:opacity-100"
        />
      </span>
    </div>
  );
}
