"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Trash2 } from "lucide-react";
import { KEYS, remove, removeByPrefix, TOOL_KEY_PREFIX } from "@/lib/storage";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";

type RailDefault = "expanded" | "collapsed";

function Section({ title, hint, children }: {
  title: string; hint: string; children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-bg/40 px-5 py-4">
      <h2 className="font-display text-[15px] font-semibold tracking-[-0.02em] text-fg">{title}</h2>
      <p className="mt-1 max-w-prose text-[12.5px] leading-relaxed text-fg-muted">{hint}</p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/**
 * A destructive action that asks first. The confirm step is inline rather
 * than a window.confirm so it is styled, keyboard-reachable, and testable.
 */
function DangerButton({ label, confirmLabel, onConfirm }: {
  label: string; confirmLabel: string; onConfirm: () => string;
}) {
  const [armed, setArmed] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => setDone(null), 4000);
    return () => clearTimeout(id);
  }, [done]);

  if (done) {
    return (
      <p className="inline-flex items-center gap-1.5 rounded-full bg-up-tint px-3 py-1.5 text-[12.5px] text-up">
        <Check size={13} aria-hidden />
        {done}
      </p>
    );
  }

  if (!armed) {
    return (
      <Button size="sm" variant="danger" onClick={() => setArmed(true)}>
        <Trash2 size={13} aria-hidden />
        {label}
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-warn">
        <AlertCircle size={13} aria-hidden />
        {confirmLabel}
      </span>
      <Button size="sm" variant="danger" onClick={() => { setDone(onConfirm()); setArmed(false); }}>
        Yes, clear it
      </Button>
      <Button size="sm" onClick={() => setArmed(false)}>Cancel</Button>
    </span>
  );
}

export default function Settings() {
  const [rail, setRail] = useState<RailDefault>("expanded");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEYS.rail);
      if (stored === "collapsed" || stored === "expanded") setRail(stored);
    } catch { /* site data blocked; the default stands for this tab */ }
  }, []);

  function chooseRail(next: RailDefault) {
    setRail(next);
    try { localStorage.setItem(KEYS.rail, next); } catch { /* nothing to do */ }
  }

  return (
    <main className="mx-auto flex max-w-[900px] flex-col gap-4 p-5 lg:p-8">
      <header>
        <h1 className="font-display text-[2rem] font-extrabold tracking-[-0.04em] text-fg">Settings</h1>
        <p className="mt-2 max-w-prose text-[14px] leading-relaxed text-fg-muted">
          This browser only. Nothing is sent anywhere.
        </p>
      </header>

      <Section
        title="Theme"
        hint="System follows your operating system setting and changes with it."
      >
        <ThemeToggle />
      </Section>

      <Section
        title="Rail"
        hint="How the sidebar opens on a fresh page load. Below 1024px it is a drawer regardless."
      >
        <Segmented
          label="Rail default state"
          value={rail}
          onChange={chooseRail}
          options={[
            { value: "expanded", label: "Expanded" },
            { value: "collapsed", label: "Collapsed" },
          ]}
        />
      </Section>

      <Section
        title="Where your data goes"
        hint="Nowhere. Every tool is a function that runs in this tab, so there is no server to send anything to and no analytics, logging or telemetry of any kind."
      >
        <ul className="flex max-w-prose flex-col gap-1.5 text-[12.5px] leading-relaxed text-fg-muted">
          <li>The app makes no network requests at all once the page has loaded.</li>
          <li>
            Tools that handle secrets — JWT, Hash and Password — additionally never
            save your input, so it dies with the tab.
          </li>
          <li>
            Don&apos;t take our word for it: open your browser&apos;s network tab and
            use any tool, or read the source.
          </li>
        </ul>
      </Section>

      <Section
        title="Stored tool input"
        hint="Each tool remembers what you last typed into it, so you can come back to it. Tools that handle secrets — JWT, Hash, and Password — never store anything."
      >
        <DangerButton
          label="Clear all tool input"
          confirmLabel="This clears saved input for every tool."
          onConfirm={() => {
            const removed = removeByPrefix(TOOL_KEY_PREFIX);
            return `Cleared input for ${removed} tool${removed === 1 ? "" : "s"}.`;
          }}
        />
      </Section>

      <Section
        title="Favourites and recents"
        hint="The pinned tools in your sidebar and the list of what you have opened lately."
      >
        <DangerButton
          label="Clear favourites and recents"
          confirmLabel="This unpins every tool and forgets your history."
          onConfirm={() => {
            remove(KEYS.favourites);
            remove(KEYS.recents);
            // Both lists are read on mount, so a reload is what makes the
            // sidebar agree with storage again.
            return "Cleared. Reload to update the sidebar.";
          }}
        />
      </Section>
    </main>
  );
}
