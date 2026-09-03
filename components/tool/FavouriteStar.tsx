"use client";

import { Star } from "lucide-react";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import { cx } from "@/lib/cx";

export function FavouriteStar({ slug, name }: { slug: string; name: string }) {
  const { isFavourite, toggle } = useWorkspace();
  const pinned = isFavourite(slug);

  return (
    <button
      type="button"
      aria-pressed={pinned}
      aria-label={pinned ? `Unpin ${name}` : `Pin ${name}`}
      onClick={() => toggle(slug)}
      className={cx(
        "rounded-full p-1 transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        pinned ? "text-fg" : "text-fg-muted hover:text-fg",
      )}
    >
      <Star size={15} fill={pinned ? "currentColor" : "none"} aria-hidden />
    </button>
  );
}
