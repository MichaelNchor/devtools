"use client";

import { useMemo } from "react";
import { allMetas, groupTools } from "@/lib/registry";
import { useWorkspace } from "@/components/shell/WorkspaceProvider";
import { RECENTS_SHOWN } from "@/lib/workspace";
import { ToolCard } from "@/components/shell/ToolCard";
import { LocalBadge } from "@/components/shell/LocalBadge";
import type { ToolMeta } from "@/lib/registry/types";

function Section({ label, tools }: { label: string; tools: ToolMeta[] }) {
  if (tools.length === 0) return null;
  return (
    <section>
      <h2 className="eyebrow">{label}</h2>
      <div className="mt-2.5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-8 p-5 lg:p-8">
      <header>
        <h1 className="font-ui text-[1.375rem] font-bold tracking-[-0.01em] text-fg">DevTools</h1>
        <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-fg-muted">
          The small utilities you reach for daily — formatting, encoding, decoding,
          hashing, comparing. Every one runs in this tab.
        </p>
        <div className="mt-3"><LocalBadge /></div>
      </header>

      {/* Recents and Favourites are absent, not empty, on a first visit. */}
      <Section label="Recent" tools={pick(recents.slice(0, RECENTS_SHOWN).map((r) => r.slug))} />
      <Section label="Favourites" tools={pick(favourites)} />

      {sections.map((section) => (
        <Section key={section.group} label={section.label} tools={section.tools} />
      ))}
    </main>
  );
}
