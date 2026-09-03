"use client";

import { cx } from "@/lib/cx";

interface Props<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  id?: string;
  ariaLabel?: string;
  className?: string;
}

export function Select<T extends string>({ value, options, onChange, id, ariaLabel, className }: Props<T>) {
  return (
    <select
      id={id}
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className={cx(
        "h-9 rounded-full border border-border bg-surface px-3 font-ui text-[13px] text-fg",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]",
        className,
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );
}
