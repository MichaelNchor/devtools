"use client";

import Link from "next/link";
import type { ToolMeta } from "@/lib/registry/types";
import { FavouriteStar } from "@/components/tool/FavouriteStar";

export function ToolCard({ meta }: { meta: ToolMeta }) {
  const Icon = meta.icon;
  return (
    <div className="group relative flex items-start gap-3 rounded-lg bg-surface p-4 shadow-sm transition-shadow hover:shadow-md">
      <span className="mt-0.5 shrink-0 rounded-md bg-surface-2 p-1.5 text-fg-2">
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
      <span className="relative z-10 shrink-0">
        <FavouriteStar slug={meta.slug} name={meta.name} />
      </span>
    </div>
  );
}
