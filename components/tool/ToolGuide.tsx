import { Info } from "lucide-react";
import type { ToolGuide as Guide } from "@/lib/tools/guides";

/**
 * Sits under every tool. Not decoration: each point is a gotcha or a
 * guarantee that the tool's own controls cannot state on their own.
 */
export function ToolGuide({ guide }: { guide: Guide }) {
  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-5 shadow-sm lg:p-6">
      <div className="flex items-center gap-2">
        <Info size={14} aria-hidden className="text-fg-muted" />
        <h2 className="eyebrow">How it works</h2>
      </div>

      <p className="mt-2.5 max-w-3xl text-[13px] leading-relaxed text-fg-2">{guide.summary}</p>

      <dl className="mt-4 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
        {guide.points.map((point) => (
          <div key={point.title}>
            <dt className="font-ui text-[12.5px] font-semibold text-fg">{point.title}</dt>
            <dd className="mt-0.5 text-[12.5px] leading-relaxed text-fg-muted">{point.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
