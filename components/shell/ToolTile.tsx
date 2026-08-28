"use client";

import Link from "next/link";
import { toneFor, type ToolMeta } from "@/lib/registry/types";

/**
 * The compact form, for the Recent and Favourites strips. No tagline and no
 * star: these are tools you already know, so the row is for getting back into
 * one quickly rather than for deciding between them.
 */
export function ToolTile({ meta }: { meta: ToolMeta }) {
  const Icon = meta.icon;
  return (
    <Link
      href={`/${meta.slug}`}
      className="group flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 transition-all duration-150 hover:border-primary/30 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-transform duration-150 group-hover:scale-110 ${toneFor(meta.slug, meta.group)}`}>
        <Icon size={15} aria-hidden />
      </span>
      <span className="min-w-0 truncate font-ui text-[12.5px] font-medium text-fg">
        {meta.name}
      </span>
    </Link>
  );
}
