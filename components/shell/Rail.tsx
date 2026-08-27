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

/** Everything that is not a tool. Reachable from the rail, or not at all. */
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
  /** Optional AND explicitly undefined-able: exactOptionalPropertyTypes is on,
      so a caller forwarding its own optional prop cannot pass `?:` alone. */
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <li className="relative">
      {/* The rail's position marker is the ONE sanctioned edge indicator in
          the system — cards and rows never get one. */}
      {active ? (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
        />
      ) : null}
      <Link
        href={href}
        onClick={() => onNavigate?.()}
        aria-current={active ? "page" : undefined}
        title={collapsed ? label : undefined}
        className={cx(
          "flex items-center gap-3 rounded-lg py-2 font-ui text-[13px] leading-none transition-colors duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-nav",
          collapsed ? "justify-center px-0" : "px-2.5",
          active
            ? "bg-nav-hover font-medium text-nav-fg"
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

  // Favourites is absent, not empty, when nothing is pinned.
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

      {/* A hairline, not a gap: it says these are different KINDS of
          destination, which spacing alone leaves ambiguous. */}
      <div className={cx("border-t border-nav-line", collapsed ? "mx-2" : "mx-3")} />

      <nav aria-label="Tools" className={cx("flex flex-col gap-6 py-4", collapsed ? "px-2" : "px-3")}>
        {groups.map((section) => (
          <div key={section.group}>
            {collapsed ? (
              // No room for a label, so the groups are separated by a rule
              // instead — the grouping still reads.
              <div className="mb-2 border-t border-nav-line first:border-0" />
            ) : (
              <p className="px-2.5 pb-2 font-ui text-[10px] font-semibold uppercase tracking-[.16em] text-nav-fg-muted">
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
        "flex items-center gap-2 rounded-md text-nav-fg transition-opacity hover:opacity-80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-nav",
        collapsed && "justify-center",
      )}
      aria-label="DevTools home"
    >
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary text-on-primary">
        <Terminal size={13} aria-hidden />
      </span>
      {!collapsed ? (
        <span className="font-ui text-[13px] font-bold tracking-tight">DevTools</span>
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
          collapsed ? "w-[68px]" : "w-64",
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
              "rounded-md p-1.5 text-nav-fg-muted transition-colors hover:bg-nav-hover hover:text-nav-fg",
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
        className="fixed bottom-5 left-5 z-40 rounded-full bg-nav p-3 text-nav-fg shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] lg:hidden"
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
              "absolute inset-y-0 left-0 w-[17rem] overflow-y-auto bg-nav transition-transform duration-200",
              shown ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <div className="flex items-center justify-between px-3 py-4">
              <Wordmark collapsed={false} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="rounded-md p-1.5 text-nav-fg-muted transition-colors hover:bg-nav-hover hover:text-nav-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
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
