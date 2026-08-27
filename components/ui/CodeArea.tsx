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
        "h-full w-full resize-none rounded-md border border-border bg-surface p-3",
        "font-ui text-[13px] leading-[1.55] text-fg",
        "placeholder:text-fg-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        readOnly && "bg-inset",
        className,
      )}
    />
  );
}
