"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Settings, Zap } from "lucide-react";
import { allMetas, groupTools } from "@/lib/registry";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import { RECENTS_SHOWN } from "@/lib/workspace";
import { ToolCard } from "@/components/shell/ToolCard";
import { ToolTile } from "@/components/shell/ToolTile";
import { GROUP_DOT, type ToolGroup, type ToolMeta } from "@/lib/registry/types";

function Column({ label, tools, group }: {
  label: string;
  tools: ToolMeta[];
  /** Absent for Recent and Favourites, which are not categories. */
  group?: ToolGroup | undefined;
}) {
  if (tools.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        {group ? (
          <span aria-hidden className={`h-3 w-1 rounded-full ${GROUP_DOT[group]}`} />
        ) : null}
        <h2 className="eyebrow">{label}</h2>
        <span className="font-ui text-[11px] text-fg-muted tabular">{tools.length}</span>
      </div>
      <div className="flex flex-col gap-2.5">
        {tools.map((meta) => <ToolCard key={meta.slug} meta={meta} />)}
      </div>
    </section>
  );
}

/** A full-width horizontal row of compact tiles. */
function Strip({ label, tools }: { label: string; tools: ToolMeta[] }) {
  if (tools.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <h2 className="eyebrow">{label}</h2>
        <span className="font-ui text-[11px] text-fg-muted tabular">{tools.length}</span>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {tools.map((meta) => <ToolTile key={meta.slug} meta={meta} />)}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const { favourites, recents } = useWorkspace();
  const metas = useMemo(() => allMetas(), []);
  const bySlug = useMemo(() => new Map(metas.map((m) => [m.slug, m])), [metas]);
  const sections = useMemo(() => groupTools(metas), [metas]);

  const pick = (slugs: string[]) =>
    slugs.map((slug) => bySlug.get(slug)).filter((m): m is ToolMeta => m != null);

  const pinned = pick(favourites);
  const recent = pick(recents.slice(0, RECENTS_SHOWN).map((r) => r.slug));
  // Picking up where you left off beats a generic entry point.
  const quickStart = recent[0]?.slug ?? "json-compare";

  return (
    <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-7 px-5 py-6 lg:px-7 lg:py-7">
      <section className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 shadow-sm lg:p-9">
        {/* A wash rather than a block of colour: it gives the card depth
            without competing with the tool icons below it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-2/3 bg-gradient-to-l from-primary-tint via-primary-tint/40 to-transparent"
        />
        <div className="relative z-10 max-w-2xl">
          <h1 className="font-ui text-[2rem] font-bold leading-[1.1] tracking-[-0.03em] text-fg lg:text-[2.75rem]">
            Your essential
            <br />
            <span className="text-primary-strong">backend workspace.</span>
          </h1>
          <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-fg-muted lg:text-[15px]">
            Sixteen developer tools for formatting, encoding, hashing,
            inspecting and comparing. Every one runs in this tab — instant, and
            with nothing uploaded.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/${quickStart}`}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-ui text-[13px] font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              {recent.length > 0 ? "Back to " + recent[0]!.name : "Quick start"}
              <Zap size={15} aria-hidden />
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 font-ui text-[13px] font-semibold text-fg transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <Settings size={15} aria-hidden />
              Preferences
            </Link>
          </div>
        </div>
      </section>

      {/* Recents and Favourites are absent, not empty, on a first visit.
          They run ACROSS the page rather than down a column: these are the
          few tools you actually return to, so they get the full width and are
          read in one sweep instead of competing with a category. */}
      <Strip label="Recent" tools={recent} />
      <Strip label="Favourites" tools={pinned} />

      {/* Three columns, so every category is visible at once rather than
          stacked behind a scroll. */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <Column
            key={section.group}
            label={section.label}
            tools={section.tools}
            group={section.group}
          />
        ))}
      </div>
    </main>
  );
}
