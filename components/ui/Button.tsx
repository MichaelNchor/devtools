"use client";

import { cx } from "@/lib/cx";

type Variant = "primary" | "ghost" | "danger";
type Size = "sm" | "md";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover shadow-sm",
  ghost: "bg-surface text-fg-2 border border-border hover:bg-surface-2 hover:text-fg",
  danger: "bg-surface text-destructive border border-border hover:bg-rose-tint",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-2.5 text-[12px] gap-1.5",
  md: "h-9 px-3.5 text-[13px] gap-2",
};

export function Button({ variant = "ghost", size = "md", className, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center rounded-md font-ui font-medium",
        "transition-colors duration-150",
        // Focus is never removed, only restyled — a keyboard user must always
        // be able to see where they are.
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        "disabled:cursor-not-allowed disabled:opacity-45",
        VARIANTS[variant], SIZES[size], className,
      )}
    />
  );
}
