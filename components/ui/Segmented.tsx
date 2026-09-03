"use client";

import { useRef } from "react";
import { cx } from "@/lib/cx";

interface Props<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}

const NAV_KEYS = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];

export function Segmented<T extends string>({ value, options, onChange, label }: Props<T>) {
  const groupRef = useRef<HTMLDivElement>(null);
  const activeIndex = options.findIndex((option) => option.value === value);

  function onKeyDown(event: React.KeyboardEvent) {
    if (!NAV_KEYS.includes(event.key)) return;
    event.preventDefault();
    const last = options.length - 1;
    const from = activeIndex === -1 ? 0 : activeIndex;

    let next: number;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else if (event.key === "ArrowRight" || event.key === "ArrowDown") next = from === last ? 0 : from + 1;
    else next = from === 0 ? last : from - 1;

    const target = options[next];
    if (!target) return;
    onChange(target.value);
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="inline-flex rounded-full bg-inset p-1"
    >
      {options.map((option, index) => {
        const active = option.value === value;
        const tabbable = activeIndex === -1 ? index === 0 : active;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={tabbable ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cx(
              "rounded-full px-3 py-1 font-ui text-[12px] font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
              active ? "bg-primary text-on-primary" : "text-fg-muted hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
