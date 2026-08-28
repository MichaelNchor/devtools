"use client";

import { cx } from "@/lib/cx";

interface Props {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

/**
 * The knob is anchored with an explicit `left`, which is load-bearing.
 *
 * An absolutely positioned child with no horizontal offset falls back to its
 * static position, and a <button> is `text-align: center` in every UA
 * stylesheet — so the knob's origin was the MIDDLE of the track. The transform
 * then pushed it from there: off-centre when off, and clean out of the track
 * and over the label text when on.
 *
 * The whole row is one button, so the words are part of the hit target and
 * supply the accessible name. A <label> wrapping a <button> does not reliably
 * forward its clicks, which left the visible text looking clickable and inert.
 */
export function Toggle({ checked, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cx(
        "group inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-md py-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
      )}
    >
      <span
        aria-hidden
        className={cx(
          // Border is present in BOTH states. Adding it only when off shifted
          // the inner box by a pixel, so the knob twitched as it moved.
          "relative h-5 w-9 shrink-0 rounded-full border transition-colors duration-150",
          checked ? "border-primary bg-primary" : "border-border bg-surface-2",
        )}
      >
        <span
          className={cx(
            // --switch-knob does not invert with the theme; `bg-surface` is
            // near-black in dark mode, which sank the knob into the track.
            "absolute left-[2px] top-[2px] h-3.5 w-3.5 rounded-full bg-[var(--switch-knob)]",
            // Hairline plus a lift, so the knob has an edge even when it sits
            // on the pale off-track where fill alone would not separate them.
            "shadow-[0_0_0_1px_rgba(0,0,0,.10),0_1px_2px_rgba(0,0,0,.25)]",
            "transition-transform duration-200 ease-[var(--ease-out-quart)]",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </span>
      <span className="font-ui text-[12px] leading-none text-fg-2 group-hover:text-fg">
        {label}
      </span>
    </button>
  );
}
