"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { SummaryGroup } from "@/lib/tools/json-compare-summary";
import { cx } from "@/lib/cx";

const GLYPH: Record<SummaryGroup["kind"], string> = {
  added: "+", removed: "-", changed: "~", "type-changed": "!",
};

const TONE: Record<SummaryGroup["kind"], string> = {
  added: "text-up", removed: "text-rose", changed: "text-warn", "type-changed": "text-warn",
};

function preview(value: unknown): string {
  if (value === undefined) return "";
  const text = JSON.stringify(value) ?? String(value);
  return text.length > 48 ? `${text.slice(0, 47)}…` : text;
}

export function DiffSummary({
  groups, onSelect,
}: {
  groups: SummaryGroup[];
  onSelect: (path: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggle(kind: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind); else next.add(kind);
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <div className="rounded-lg bg-surface p-5 text-center shadow-sm">
        <p className="text-[13px] text-fg-muted">The two documents are structurally identical.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-auto rounded-lg bg-surface p-3 shadow-sm">
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.kind);
        return (
          <section key={group.kind}>
            <button
              type="button"
              onClick={() => toggle(group.kind)}
              aria-expanded={!isCollapsed}
              className="flex w-full items-center gap-1.5 rounded-sm py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <ChevronRight
                size={13}
                aria-hidden
                className={cx("text-fg-muted transition-transform", !isCollapsed && "rotate-90")}
              />
              {/* Glyph, word and count — readable with no colour at all. */}
              <span aria-hidden className={cx("font-ui text-[12px]", TONE[group.kind])}>
                {GLYPH[group.kind]}
              </span>
              <span className="eyebrow">{group.label}</span>
              <span className="font-ui text-[11px] text-fg-muted tabular">{group.items.length}</span>
            </button>

            {!isCollapsed ? (
              <ul className="mt-0.5 flex flex-col gap-px pl-5">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.path)}
                      className="flex w-full items-baseline gap-2 rounded-sm px-1.5 py-0.5 text-left hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      <code className="font-ui text-[12px] text-fg">{item.path}</code>
                      {item.kind === "changed" || item.kind === "type-changed" ? (
                        <span className="truncate font-ui text-[11.5px] text-fg-muted">
                          {preview(item.left)} → {preview(item.right)}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
