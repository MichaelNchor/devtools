"use client";

import { useMemo } from "react";
import { allMetas, groupTools } from "@/lib/registry";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import { RECENTS_SHOWN } from "@/lib/workspace";
import { ToolCard } from "@/components/shell/ToolCard";
import { LocalBadge } from "@/components/shell/LocalBadge";
import { GROUP_DOT, type ToolGroup, type ToolMeta } from "@/lib/registry/types";

function Section({ label, tools, group }: {
  label: string;
  tools: ToolMeta[];
  /** Absent for Recent and Favourites, which are not categories. */
  group?: ToolGroup | undefined;
}) {
  if (tools.length === 0) return null;
  return (
    <section>
      <div className="flex items-center gap-2.5">
        {group ? (
          <span aria-hidden className={`h-3.5 w-1 rounded-full ${GROUP_DOT[group]}`} />
        ) : null}
        <h2 className="eyebrow">{label}</h2>
        <span className="font-ui text-[11px] text-fg-muted tabular">{tools.length}</span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tools.map((meta) => <ToolCard key={meta.slug} meta={meta} />)}
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

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-9 px-5 py-7 lg:px-8 lg:py-9">
      <header className="max-w-2xl">
        <h1 className="font-ui text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-fg">
          {metas.length} tools. Nothing leaves this tab.
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-fg-muted">
          Formatting, encoding, decoding, hashing, comparing — the small
          utilities you reach for daily, without pasting your data into someone
          else&apos;s server.
        </p>
        <div className="mt-4"><LocalBadge /></div>
      </header>

      {/* Recents and Favourites are absent, not empty, on a first visit. */}
      <Section label="Recent" tools={recent} />
      <Section label="Favourites" tools={pinned} />

      {pinned.length === 0 && recent.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-[12.5px] text-fg-muted">
          Star a tool to pin it here and to the top of the sidebar.
        </p>
      ) : null}

      {sections.map((section) => (
        <Section key={section.group} label={section.label} tools={section.tools} group={section.group} />
      ))}
    </main>
  );
}
