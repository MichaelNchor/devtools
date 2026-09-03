"use client";

import Link from "next/link";
import { toneFor, type ToolMeta } from "@/lib/registry/types";

export function ToolTile({ meta }: { meta: ToolMeta }) {
  const Icon = meta.icon;
  return (
    <Link
      href={`/${meta.slug}`}
      className="group flex items-center gap-2.5 rounded-full border border-border bg-bg/40 px-3 py-2 transition-colors duration-150 hover:bg-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${toneFor(meta.slug, meta.group)}`}>
        <Icon size={14} aria-hidden />
      </span>
      <span className="min-w-0 truncate font-ui text-[12.5px] font-medium text-fg">
        {meta.name}
      </span>
    </Link>
  );
}
