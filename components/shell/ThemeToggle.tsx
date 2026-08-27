"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { KEYS } from "@/lib/storage";
import { cx } from "@/lib/cx";

type Choice = "light" | "dark" | "system";

function apply(choice: Choice) {
  const dark = choice === "dark" ||
    (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  try {
    if (choice === "system") localStorage.removeItem(KEYS.theme);
    else localStorage.setItem(KEYS.theme, choice);
  } catch { /* site data blocked; the class is still applied for this tab */ }
}

const OPTIONS: { value: Choice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>("system");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEYS.theme);
      setChoice(stored === "light" || stored === "dark" ? stored : "system");
    } catch { /* leave the default */ }
  }, []);

  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-md bg-surface-2 p-0.5">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={choice === value}
          aria-label={label}
          title={label}
          onClick={() => { setChoice(value); apply(value); }}
          className={cx(
            "rounded-sm p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
            choice === value ? "bg-surface text-fg shadow-xs" : "text-fg-muted hover:text-fg",
          )}
        >
          <Icon size={14} aria-hidden />
        </button>
      ))}
    </div>
  );
}
