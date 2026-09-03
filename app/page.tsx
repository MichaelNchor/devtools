"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
          // Ties a heading to the cards beneath it. Redundant with the label
          // beside it, so it carries nothing on its own.
          <span aria-hidden className={`h-3.5 w-1 rounded-full ${GROUP_DOT[group]}`} />
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
  const quickStart = recent[0]?.slug ?? "json-compare";

  return (
    <main className="mx-auto flex w-full max-w-[1500px] flex-col gap-8 px-5 py-5 lg:px-7 lg:py-6">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-nav px-6 py-8 text-nav-fg lg:px-10 lg:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-nav-fg/10"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-nav-fg/5"
        />
        <div className="relative z-10 max-w-xl">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-nav-fg-muted">
            Local, in this tab
          </p>
          <h1 className="mt-3 font-display text-[2.35rem] font-extrabold leading-[0.92] tracking-[-0.05em] lg:text-[3.4rem]">
            Tools that
            <br />
            stay private.
          </h1>
          <div className="mt-7">
            <Link
              href={`/${quickStart}`}
              className="inline-flex items-center gap-2 rounded-full bg-nav-fg px-5 py-2.5 font-ui text-[13px] font-semibold text-nav transition-transform duration-150 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nav-fg focus-visible:ring-offset-2 focus-visible:ring-offset-nav"
            >
              {recent.length > 0 ? "Back to " + recent[0]!.name : "Open a tool"}
              <ArrowUpRight size={15} aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      <Strip label="Recent" tools={recent} />
      <Strip label="Favourites" tools={pinned} />

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
