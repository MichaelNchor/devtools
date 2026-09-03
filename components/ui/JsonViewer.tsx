"use client";

import { useMemo, useState } from "react";
import { ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import { toJsonLines, containerPaths, pathsToDepth } from "@/lib/tools/json-view";
import { tokenizeJson, type JsonTokenType } from "@/lib/highlight/json";
import { CopyButton } from "@/components/tool/CopyButton";
import { cx } from "@/lib/cx";

const TONE: Record<JsonTokenType, string> = {
  key: "text-[var(--code-key)]",
  string: "text-[var(--code-string)]",
  number: "text-[var(--code-number)]",
  atom: "text-[var(--code-atom)]",
  punct: "text-[var(--code-punct)]",
  space: "",
};

/** Reuses the shared tokeniser, so colours match every other JSON surface. */
function Highlighted({ text }: { text: string }) {
  return (
    <>
      {tokenizeJson(text).map((token, index) => (
        <span key={index} className={TONE[token.type]}>{token.text}</span>
      ))}
    </>
  );
}

/**
 * A JSON result you can fold. Every container gets a toggle, and the fully
 * expanded text is real JSON — asserted by a round-trip test on the line
 * model, so folding can never misrepresent what you are looking at.
 */
export function JsonViewer({
  value,
  /** Collapse anything deeper than this on first render. */
  initialDepth,
  /** Also offer the JSON path of each container, not just its value. */
  showPaths = false,
  className,
}: {
  value: unknown;
  initialDepth?: number | undefined;
  showPaths?: boolean | undefined;
  className?: string | undefined;
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set(initialDepth === undefined ? [] : pathsToDepth(value, initialDepth)),
  );

  const lines = useMemo(() => toJsonLines(value, collapsed), [value, collapsed]);
  const all = useMemo(() => containerPaths(value), [value]);
  const allCollapsed = all.length > 0 && all.every((p) => collapsed.has(p));

  function toggle(path: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  }

  return (
    <div className={cx("flex min-h-0 flex-col", className)}>
      {all.length > 0 ? (
        <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-2 py-1.5">
          <button
            type="button"
            onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(all))}
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 font-ui text-[11.5px] text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {allCollapsed
              ? <ChevronsUpDown size={12} aria-hidden />
              : <ChevronsDownUp size={12} aria-hidden />}
            {allCollapsed ? "Expand all" : "Collapse all"}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(new Set(pathsToDepth(value, 1)))}
            className="rounded-md px-1.5 py-1 font-ui text-[11.5px] text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            Top level
          </button>
          <span className="ml-auto font-ui text-[11px] text-fg-muted tabular">
            {all.length} node{all.length === 1 ? "" : "s"}
          </span>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto p-2">
        <div className="w-max min-w-full font-ui text-[12.5px] leading-[1.65]">
          {lines.map((line) => {
            const isOpen = line.togglePath !== null && !collapsed.has(line.togglePath);
            return (
              <div
                key={line.path}
                className="group flex items-start rounded-sm pr-2 hover:bg-surface-2"
                style={{ paddingLeft: `${line.depth * 14}px` }}
              >
                {line.togglePath !== null ? (
                  <button
                    type="button"
                    onClick={() => toggle(line.togglePath!)}
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? "Collapse" : "Expand"} ${line.path}`}
                    className="mt-[3px] shrink-0 rounded-sm text-fg-muted transition-transform hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  >
                    <ChevronRight size={12} aria-hidden className={cx("transition-transform", isOpen && "rotate-90")} />
                  </button>
                ) : (
                  // Keeps every line's text on the same left edge whether or
                  // not it has a toggle.
                  <span aria-hidden className="w-3 shrink-0" />
                )}

                <span className="whitespace-pre pl-1">
                  <Highlighted text={line.text} />
                </span>

                {/* Copy the subtree this line heads, not the whole document. */}
                {line.togglePath !== null ? (
                  <span className="ml-2 flex shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                    {showPaths ? <CopyButton text={line.path} label="Path" /> : null}
                    <CopyButton text={JSON.stringify(line.value, null, 2) ?? ""} label="Copy" />
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
