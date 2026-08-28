"use client";

import { useState } from "react";
import { LANGUAGES, type Implementations, type Language } from "@/lib/tools/languages";
import { CopyButton } from "./CopyButton";
import { cx } from "@/lib/cx";

/**
 * Pseudocode explains the shape; real code is what you actually lift into an
 * editor. Both live in one panel so switching between them costs nothing, and
 * the highlighted pseudocode line still tracks the animation beside it.
 */
export function CodeSwitcher({
  pseudocode, activeLine, implementations, title, subtitle, trailing,
  pseudocodeLabel = "Pseudocode", defaultTab = "pseudocode",
}: {
  pseudocode: string[];
  /** Index of the executing line, or null when nothing is running. */
  activeLine?: number | null;
  implementations: Implementations;
  title?: string;
  subtitle?: string;
  /** Extra controls in the header — step buttons, a counter. */
  trailing?: React.ReactNode;
  /** "Idea" reads better than "Pseudocode" where the prose is a sentence. */
  pseudocodeLabel?: string;
  /** Tools with no stepped animation are better opening on real code. */
  defaultTab?: "pseudocode" | Language;
}) {
  const [tab, setTab] = useState<"pseudocode" | Language>(defaultTab);
  const code = tab === "pseudocode" ? pseudocode.join("\n") : implementations[tab];

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="eyebrow">{title ?? "Code"}</p>
          {subtitle ? (
            <p className="mt-0.5 text-[11.5px] leading-none text-fg-muted">{subtitle}</p>
          ) : null}
        </div>

        <div role="tablist" aria-label="Code language" className="flex flex-wrap items-center gap-0.5">
          {[{ value: "pseudocode" as const, label: pseudocodeLabel }, ...LANGUAGES].map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={tab === option.value}
              onClick={() => setTab(option.value)}
              className={cx(
                "rounded-md px-2 py-1 font-ui text-[11.5px] font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                tab === option.value
                  ? "bg-primary-tint text-primary-strong"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {trailing}
          <CopyButton text={code} label="Copy" />
        </div>
      </div>

      {tab === "pseudocode" ? (
        <ol className="p-1.5">
          {pseudocode.map((line, index) => {
            const live = activeLine != null && index === activeLine;
            return (
              <li
                key={index}
                aria-current={live ? "step" : undefined}
                className={cx(
                  "flex gap-2.5 rounded-sm px-2 py-[3px] font-ui text-[12px] transition-colors",
                  live ? "bg-primary-tint text-primary-strong" : "text-fg-muted",
                )}
              >
                {/* The marker, not just the fill, says which line is live. */}
                <span aria-hidden className="w-2 shrink-0">{live ? "▸" : ""}</span>
                <span className="whitespace-pre-wrap">{line}</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <pre className="overflow-x-auto px-3 py-2.5 font-ui text-[12px] leading-relaxed text-fg">
          {code}
        </pre>
      )}
    </div>
  );
}
