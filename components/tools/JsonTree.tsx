"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { toTreeRows, type TreeRow } from "@/lib/tools/json-tree";
import { CopyButton } from "@/components/tool/CopyButton";
import { cx } from "@/lib/cx";

const PREVIEW_TONE: Record<TreeRow["kind"], string> = {
  object: "text-[var(--code-punct)]",
  array: "text-[var(--code-punct)]",
  scalar: "text-[var(--code-string)]",
};

export function JsonTree({ value }: { value: unknown }) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const rows = useMemo(() => toTreeRows(value, collapsed), [value, collapsed]);

  function toggle(path: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-surface p-2 shadow-sm">
      {rows.map((row) => (
        <div
          key={row.path}
          className="group flex items-center gap-1.5 rounded-sm px-1 py-[1px] hover:bg-surface-2"
          style={{ paddingLeft: `${row.depth * 14 + 4}px` }}
        >
          {row.hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(row.path)}
              aria-expanded={!collapsed.has(row.path)}
              aria-label={`${collapsed.has(row.path) ? "Expand" : "Collapse"} ${row.path}`}
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <ChevronRight
                size={12}
                aria-hidden
                className={cx("text-fg-muted transition-transform", !collapsed.has(row.path) && "rotate-90")}
              />
            </button>
          ) : (
            <span className="w-3 shrink-0" />
          )}

          <span className="font-ui text-[12.5px] text-[var(--code-key)]">
            {row.key === null ? "$" : typeof row.key === "number" ? `[${row.key}]` : row.key}
          </span>
          <span className={cx("truncate font-ui text-[12.5px]", PREVIEW_TONE[row.kind])}>
            {row.preview}
          </span>

          {/* Actions stay mounted but invisible until hover or keyboard focus,
              so a keyboard user can still reach them. */}
          <span className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <CopyButton text={row.path} label="Copy path" />
            <CopyButton text={JSON.stringify(row.value, null, 2) ?? ""} label="Copy value" />
          </span>
        </div>
      ))}
    </div>
  );
}
