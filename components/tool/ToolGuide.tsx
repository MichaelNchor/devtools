import { Info } from "lucide-react";
import type { ToolGuide as Guide } from "@/lib/tools/guides";

/**
 * Guidance, not output — and it should not look like output.
 *
 * A raised surface with a shadow is what this system uses for the tool's own
 * working areas, so explanation borrowing that treatment made a paragraph
 * compete with the result above it. This sits UNLIFTED on the page colour
 * with a hairline, and is marked in --sky: the one brand hue not carrying
 * status meaning, so guidance never reads as a verdict.
 *
 * No left-edge accent: the rail's position marker is the only sanctioned edge
 * indicator in this system.
 */
export function ToolGuide({ guide }: { guide: Guide }) {
  return (
    <section className="mt-6 rounded-xl border border-border bg-inset p-5 lg:p-6">
      <div className="flex items-center gap-2">
        <Info size={14} aria-hidden className="text-sky" />
        <h2 className="eyebrow eyebrow-info">How it works</h2>
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
