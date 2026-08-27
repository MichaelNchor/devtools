"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, Star, X } from "lucide-react";
import { allMetas, groupTools } from "@/lib/registry";
import { useWorkspace } from "./WorkspaceProvider";
import { KEYS, readJson, writeJson } from "@/lib/storage";
import { cx } from "@/lib/cx";

function RailLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { favourites } = useWorkspace();
  const metas = useMemo(() => allMetas(), []);
  const sections = useMemo(() => groupTools(metas), [metas]);

  // Favourites is absent, not empty, when nothing is pinned.
  const pinned = favourites
    .map((slug) => metas.find((m) => m.slug === slug))
    .filter((m): m is NonNullable<typeof m> => m != null);

  const groups = [
    ...(pinned.length ? [{ group: "favourites", label: "Favourites", tools: pinned }] : []),
    ...sections,
  ];

  return (
    <nav aria-label="Tools" className="flex flex-col gap-5 px-2 py-3">
      {groups.map((section) => (
        <div key={section.group}>
          {!collapsed ? (
            <p className="px-2 pb-1.5 font-ui text-[10.5px] font-semibold uppercase tracking-[.14em] text-nav-fg-muted">
              {section.label}
            </p>
          ) : null}
          <ul className="flex flex-col gap-px">
            {section.tools.map((meta) => {
              const active = pathname === `/${meta.slug}`;
              const Icon = meta.icon;
              return (
                <li key={`${section.group}-${meta.slug}`} className="relative">
                  {/* The rail's position marker is the ONE sanctioned edge
                      indicator in the system — cards and rows never get one. */}
                  {active ? (
                    <span aria-hidden className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-sm bg-primary" />
                  ) : null}
                  <Link
                    href={`/${meta.slug}`}
                    onClick={() => onNavigate?.()}
                    aria-current={active ? "page" : undefined}
                    title={collapsed ? meta.name : undefined}
                    className={cx(
                      "flex items-center gap-2.5 rounded-md px-2 py-1.5 font-ui text-[13px] transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                      collapsed && "justify-center",
                      active ? "bg-nav-hover text-nav-fg" : "text-nav-fg-muted hover:bg-nav-hover hover:text-nav-fg",
                    )}
                  >
                    <Icon size={15} className="shrink-0" aria-hidden />
                    {!collapsed ? <span className="truncate">{meta.name}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Rail() {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => { setCollapsed(readJson<string>(KEYS.rail, "expanded") === "collapsed"); }, []);

  function setRail(next: boolean) {
    setCollapsed(next);
    writeJson(KEYS.rail, next ? "collapsed" : "expanded");
  }

  // Two flags, because one cannot animate both ways. `mounted` keeps the panel
  // in the tree long enough to slide out; `shown` is what the transition reads
  // and is set a frame later, so the browser has a closed state to move from.
  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setShown(true)); });
      return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
    }
    setShown(false);
    const timer = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") { setOpen(false); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      // Behind the drawer the page is inert, so letting focus escape strands
      // the keyboard on controls nobody can see.
      const items = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = priorOverflow;
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  return (
    <>
      <aside
        className={cx(
          "sticky top-0 hidden h-dvh shrink-0 flex-col overflow-y-auto bg-nav lg:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className={cx("flex items-center gap-2 px-3 py-3.5", collapsed && "justify-center")}>
          {!collapsed ? (
            <Link href="/" className="font-ui text-[13px] font-bold tracking-tight text-nav-fg">
              DevTools
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => setRail(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="ml-auto rounded-md p-1 text-nav-fg-muted hover:bg-nav-hover hover:text-nav-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {collapsed ? <PanelLeftOpen size={15} aria-hidden /> : <PanelLeftClose size={15} aria-hidden />}
          </button>
        </div>
        <RailLinks collapsed={collapsed} />
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="fixed bottom-4 left-4 z-40 rounded-lg bg-nav p-2.5 text-nav-fg shadow-lg lg:hidden"
      >
        <Menu size={17} aria-hidden />
      </button>

      {mounted ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            onClick={() => setOpen(false)}
            className={cx("absolute inset-0 bg-black/50 transition-opacity duration-200", shown ? "opacity-100" : "opacity-0")}
          />
          <aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Tools"
            className={cx(
              "absolute inset-y-0 left-0 w-64 overflow-y-auto bg-nav transition-transform duration-200",
              shown ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="flex items-center justify-between px-3 py-3.5">
              <span className="font-ui text-[13px] font-bold text-nav-fg">DevTools</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="rounded-md p-1 text-nav-fg-muted hover:bg-nav-hover hover:text-nav-fg"
              >
                <X size={16} aria-hidden />
              </button>
            </div>
            <RailLinks collapsed={false} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
