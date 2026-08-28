"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck, X } from "lucide-react";

/**
 * Spec 5.2 asks for a "quiet runs-locally marker that LINKS to a short
 * explanation of the no-network guarantee". It shipped as a bare badge whose
 * only explanation was a title tooltip — invisible on touch, undiscoverable
 * everywhere, and so the badge asserted something without ever saying what.
 * This is the explanation it was always supposed to open.
 */
export function LocalBadge() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="What “runs locally” means"
        className="inline-flex items-center gap-1.5 rounded-full bg-up-tint px-2.5 py-1 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <ShieldCheck size={12} className="text-up" aria-hidden />
        <span className="font-ui text-[10.5px] font-semibold uppercase tracking-[.14em] text-up">
          Runs locally
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="The no-network guarantee"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[19rem] rounded-xl border border-border bg-surface p-4 shadow-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-ui text-[13px] font-semibold text-fg">
              Nothing you paste leaves this tab
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-mr-1 -mt-1 rounded-md p-1 text-fg-muted hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <X size={13} aria-hidden />
            </button>
          </div>

          <ul className="mt-2.5 flex flex-col gap-2 text-[12.5px] leading-relaxed text-fg-muted">
            <li className="flex gap-2">
              <span aria-hidden className="text-up">✓</span>
              <span>
                Every tool is a function that runs in your browser. There is no
                server to send anything to.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="text-up">✓</span>
              <span>
                No analytics, no logging, no telemetry — the app makes no network
                requests at all after the page loads.
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="text-up">✓</span>
              <span>
                Tools that handle secrets — JWT, Hash, Password — additionally
                never save your input, so it dies with the tab.
              </span>
            </li>
          </ul>

          <p className="mt-3 border-t border-border pt-2.5 text-[11.5px] leading-relaxed text-fg-muted">
            Don&apos;t take our word for it — open the network tab and use any
            tool, or read the source. It is a static site.
          </p>
        </div>
      ) : null}
    </div>
  );
}
