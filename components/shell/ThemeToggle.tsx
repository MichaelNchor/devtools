"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { KEYS } from "@/lib/storage";

type Choice = "light" | "dark" | "system";

const SYSTEM_DARK = "(prefers-color-scheme: dark)";

function resolve(choice: Choice): boolean {
  return choice === "dark" || (choice === "system" && matchMedia(SYSTEM_DARK).matches);
}

function apply(choice: Choice) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolve(choice));
  // The same attribute the pre-paint script stamps. It is what lights the
  // selected option, so it has to move with the choice.
  root.setAttribute("data-theme-choice", choice);
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
  // Only aria-checked reads this. The VISUAL selected state is painted by CSS
  // from data-theme-choice, which is already correct in the first paint — see
  // the rule in globals.css. Driving the highlight from state here is what
  // made the toggle flicker on every navigation.
  const [choice, setChoice] = useState<Choice | null>(null);

  useEffect(() => {
    const stamped = document.documentElement.getAttribute("data-theme-choice");
    setChoice(stamped === "light" || stamped === "dark" ? stamped : "system");
  }, []);

  // On "system" the OS can change under us, and the page should follow without
  // a reload. Only meaningful while no explicit choice is stored.
  useEffect(() => {
    if (choice !== "system") return;
    const media = matchMedia(SYSTEM_DARK);
    const sync = () => document.documentElement.classList.toggle("dark", media.matches);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [choice]);

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-lg bg-surface-2 p-1"
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          aria-label={label}
          title={label}
          data-theme-option={value}
          onClick={() => { setChoice(value); apply(value); }}
          className="rounded-md p-1.5 text-fg-muted transition-colors duration-150 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <Icon size={14} aria-hidden />
        </button>
      ))}
    </div>
  );
}
