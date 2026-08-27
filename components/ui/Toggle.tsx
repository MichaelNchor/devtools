"use client";

import { cx } from "@/lib/cx";

interface Props {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

export function Toggle({ checked, onChange, label }: Props) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative h-[18px] w-8 rounded-full transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
          checked ? "bg-primary" : "bg-surface-2 border border-border",
        )}
      >
        <span
          className={cx(
            "absolute top-[2px] h-[12px] w-[12px] rounded-full bg-surface shadow-xs transition-transform",
            checked ? "translate-x-[17px]" : "translate-x-[3px]",
          )}
        />
      </button>
      {/* aria-label already names the switch; without this the same words
          also sit in the tree as loose text and get announced twice. */}
      <span aria-hidden="true" className="font-ui text-[12px] text-fg-2">{label}</span>
    </label>
  );
}
