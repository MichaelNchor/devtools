import type { ToolGuide as Guide } from "@/lib/tools/guides";

export function ToolGuide({ guide }: { guide: Guide }) {
  return (
    <details className="group mt-8 max-w-2xl">
      <summary className="cursor-pointer list-none font-display text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-muted transition-colors hover:text-fg [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          About
          <span aria-hidden className="text-[10px] transition-transform group-open:rotate-45">+</span>
        </span>
      </summary>
      <p className="mt-2.5 text-[13px] leading-relaxed text-fg-2">{guide.summary}</p>
    </details>
  );
}
