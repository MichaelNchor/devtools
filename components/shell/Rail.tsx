"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutGrid, Menu, PanelLeftClose, PanelLeftOpen, Settings, Terminal, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { allMetas, groupTools } from "@/lib/registry";
import { useWorkspace } from "./WorkspaceProvider";
import { KEYS, readJson, writeJson } from "@/lib/storage";
import { cx } from "@/lib/cx";

const PRIMARY: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavRow({
  href, label, icon: Icon, active, collapsed, onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={() => onNavigate?.()}
        aria-current={active ? "page" : undefined}
        title={collapsed ? label : undefined}
        className={cx(
          "flex items-center gap-3 rounded-full py-2 font-ui text-[13px] leading-none transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-nav",
          collapsed ? "justify-center px-0" : "px-3",
          active
            ? "bg-nav-fg font-medium text-nav"
            : "text-nav-fg-muted hover:bg-nav-hover hover:text-nav-fg",
        )}
      >
        <Icon size={15} className="shrink-0" aria-hidden />
        {!collapsed ? <span className="truncate">{label}</span> : null}
      </Link>
    </li>
  );
}

function RailLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: (() => void) | undefined }) {
  const pathname = usePathname();
  const { favourites } = useWorkspace();
  const metas = useMemo(() => allMetas(), []);
  const sections = useMemo(() => groupTools(metas), [metas]);

  const pinned = favourites
    .map((slug) => metas.find((m) => m.slug === slug))
    .filter((m): m is NonNullable<typeof m> => m != null);

  const groups = [
    ...(pinned.length ? [{ group: "favourites", label: "Favourites", tools: pinned }] : []),
    ...sections,
  ];

  return (
    <div className="flex flex-col">
      <nav aria-label="Sections" className={cx("py-2", collapsed ? "px-2" : "px-3")}>
        <ul className="flex flex-col gap-1">
          {PRIMARY.map((item) => (
            <NavRow
              key={item.href}
              {...item}
              collapsed={collapsed}
              onNavigate={onNavigate}
              active={pathname === item.href}
            />
          ))}
        </ul>
      </nav>

      <div className={cx("border-t border-nav-line", collapsed ? "mx-2" : "mx-3")} />

      <nav aria-label="Tools" className={cx("flex flex-col gap-6 py-4", collapsed ? "px-2" : "px-3")}>
        {groups.map((section) => (
          <div key={section.group}>
            {collapsed ? (
              <div className="mb-2 border-t border-nav-line first:border-0" />
            ) : (
              <p className="px-3 pb-2 font-display text-[10px] font-semibold uppercase tracking-[.12em] text-nav-fg-muted">
                {section.label}
              </p>
            )}
            <ul className="flex flex-col gap-1">
              {section.tools.map((meta) => (
                <NavRow
                  key={`${section.group}-${meta.slug}`}
                  href={`/${meta.slug}`}
                  label={meta.name}
                  icon={meta.icon}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                  active={pathname === `/${meta.slug}`}
                />
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

function Wordmark({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      href="/"
      className={cx(
        "flex items-center gap-2.5 rounded-full text-nav-fg transition-opacity hover:opacity-80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-nav",
        collapsed && "justify-center",
      )}
      aria-label="DevTools home"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-nav-fg text-nav">
        <Terminal size={14} aria-hidden />
      </span>
      {!collapsed ? (
        <span className="font-display text-[15px] font-extrabold tracking-[-0.04em]">DevTools</span>
      ) : null}
    </Link>
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
          "sticky top-3 ml-3 my-3 hidden h-[calc(100dvh-1.5rem)] shrink-0 flex-col overflow-y-auto rounded-[var(--radius-sheet)] bg-nav lg:flex",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <div
          className={cx(
            "flex items-center gap-2 px-3 py-4",
            collapsed && "flex-col gap-3 px-2",
          )}
        >
          <Wordmark collapsed={collapsed} />
          <button
            type="button"
            onClick={() => setRail(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cx(
              "rounded-full p-1.5 text-nav-fg-muted transition-colors hover:bg-nav-hover hover:text-nav-fg",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-nav",
              !collapsed && "ml-auto",
            )}
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
        className="fixed bottom-5 left-5 z-40 rounded-full bg-nav p-3.5 text-nav-fg shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] lg:hidden"
      >
        <Menu size={18} aria-hidden />
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
            aria-label="Navigation"
            className={cx(
              "absolute inset-y-3 left-3 w-[17rem] overflow-y-auto rounded-[var(--radius-sheet)] bg-nav transition-transform duration-200",
              shown ? "translate-x-0" : "-translate-x-[calc(100%+0.75rem)]",
            )}
          >
            <div className="flex items-center justify-between px-3 py-4">
              <Wordmark collapsed={false} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="rounded-full p-1.5 text-nav-fg-muted transition-colors hover:bg-nav-hover hover:text-nav-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
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
