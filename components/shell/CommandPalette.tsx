"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { allMetas, searchTools, GROUP_LABELS } from "@/lib/registry";
import { useWorkspace } from "./WorkspaceProvider";
import { cx } from "@/lib/cx";

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { recents } = useWorkspace();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const openerRef = useRef<Element | null>(null);
  const metas = useMemo(() => allMetas(), []);

  const results = useMemo(() => {
    const matched = searchTools(metas, query);
    if (query.trim()) return matched;
    // With no query, the most useful order is what you reached for last.
    const order = new Map(recents.map((r, i) => [r.slug, i]));
    return [...matched].sort(
      (a, b) => (order.get(a.slug) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.slug) ?? Number.MAX_SAFE_INTEGER),
    );
  }, [metas, query, recents]);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    setQuery("");
    setActive(0);
    inputRef.current?.focus();
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = priorOverflow;
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") { onClose(); return; }
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    if (event.key === "Enter") {
      event.preventDefault();
      const target = results[active];
      if (target) { router.push(`/${target.slug}`); onClose(); }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search tools"
        onKeyDown={onKeyDown}
        className="relative w-full max-w-lg overflow-hidden rounded-xl bg-surface shadow-lg"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActive(0); }}
          placeholder="Search tools"
          aria-label="Search tools"
          role="combobox"
          aria-expanded
          aria-controls="palette-results"
          aria-activedescendant={results[active] ? `palette-${results[active]!.slug}` : undefined}
          className="w-full border-b border-border bg-transparent px-4 py-3 font-ui text-[14px] text-fg outline-none placeholder:text-fg-muted"
        />
        <ul id="palette-results" ref={listRef} role="listbox" className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center text-[13px] text-fg-muted">
              No tool matches “{query}”.
            </li>
          ) : results.map((meta, index) => {
            const Icon = meta.icon;
            return (
              <li key={meta.slug}>
                <button
                  id={`palette-${meta.slug}`}
                  role="option"
                  aria-selected={index === active}
                  data-active={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => { router.push(`/${meta.slug}`); onClose(); }}
                  className={cx(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left",
                    index === active ? "bg-primary-tint" : "hover:bg-surface-2",
                  )}
                >
                  <Icon size={15} className="shrink-0 text-fg-muted" aria-hidden />
                  <span className="font-ui text-[13px] text-fg">{meta.name}</span>
                  <span className="ml-auto shrink-0 font-ui text-[10.5px] uppercase tracking-[.14em] text-fg-muted">
                    {GROUP_LABELS[meta.group].split(" ")[0]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
