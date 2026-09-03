"use client";

import { cx } from "@/lib/cx";

interface Props {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  ariaLabel: string;
  className?: string;
}

export function CodeArea({ value, onChange, placeholder, readOnly, ariaLabel, className }: Props) {
  return (
    <textarea
      value={value}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      placeholder={placeholder}
      readOnly={readOnly}
      aria-label={ariaLabel}
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      data-gramm="false"
      className={cx(
        "h-full w-full resize-none rounded-xl border-0 bg-transparent p-3",
        "font-mono text-[13px] leading-[1.55] text-fg",
        "placeholder:text-fg-muted",
        // ring-INSET, deliberately: this field fills a Panel that clips its
        // overflow, so an outer ring is cut off and shows as a stray arc along
        // the panel's edge. An inset ring is drawn inside the field's own box,
        // so it cannot be clipped and it outlines the whole input.
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]",
        readOnly && "bg-inset",
        className,
      )}
    />
  );
}
