"use client";

import { useMemo } from "react";
import { diffLines } from "diff";
import { cx } from "@/lib/cx";

export function TextDiff({ left, right }: { left: string; right: string }) {
  const parts = useMemo(() => diffLines(left, right), [left, right]);

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-surface shadow-sm">
      <pre className="w-max min-w-full font-ui text-[12.5px] leading-[1.6]">
        {parts.flatMap((part, partIndex) =>
          part.value.replace(/\n$/, "").split("\n").map((line, lineIndex) => {
            const glyph = part.added ? "+" : part.removed ? "-" : " ";
            return (
              <div
                key={`${partIndex}-${lineIndex}`}
                className={cx(
                  "flex items-start px-2",
                  part.added && "bg-up-tint",
                  part.removed && "bg-rose-tint",
                )}
              >
                <span
                  aria-hidden
                  className={cx(
                    "w-4 shrink-0 select-none",
                    part.added ? "text-up" : part.removed ? "text-rose" : "text-fg-muted",
                  )}
                >
                  {glyph}
                </span>
                <span className="whitespace-pre text-fg">{line}</span>
              </div>
            );
          }),
        )}
      </pre>
    </div>
  );
}
