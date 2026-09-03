"use client";

import { useMemo, useState } from "react";
import { Braces, PenLine } from "lucide-react";
import { Panel } from "./Panel";
import { CodeArea } from "./CodeArea";
import { JsonViewer } from "./JsonViewer";
import { cx } from "@/lib/cx";

/**
 * A JSON field that can be read folded or edited as text.
 *
 * Folding and editing cannot share one control — a textarea has no tree to
 * collapse — so this owns both and swaps between them. Editing is the default
 * because an input is somewhere you paste; the Fold control only appears once
 * the content actually parses, since there is nothing to fold otherwise.
 */
export function JsonPanel({
  title, subtitle, value, onChange, ariaLabel, placeholder,
  className, actions, readOnly = false, initialDepth,
}: {
  title: string;
  subtitle?: string | undefined;
  value: string;
  onChange?: ((value: string) => void) | undefined;
  ariaLabel: string;
  placeholder?: string | undefined;
  className?: string | undefined;
  actions?: React.ReactNode;
  readOnly?: boolean;
  initialDepth?: number | undefined;
}) {
  const [mode, setMode] = useState<"edit" | "fold">(readOnly ? "fold" : "edit");

  const parsed = useMemo(() => {
    if (!value.trim()) return { ok: false as const };
    try { return { ok: true as const, value: JSON.parse(value) as unknown }; }
    catch { return { ok: false as const }; }
  }, [value]);

  const canFold = parsed.ok;
  const folded = canFold && mode === "fold";

  return (
    <Panel
      title={title}
      subtitle={subtitle}
      className={className}
      actions={
        <>
          {canFold ? (
            <div role="group" aria-label={`${ariaLabel} view`} className="flex items-center gap-0.5">
              {([["edit", "Edit", PenLine], ["fold", "Fold", Braces]] as const).map(
                ([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={mode === key}
                    onClick={() => setMode(key)}
                    title={label}
                    className={cx(
                      "inline-flex items-center gap-1 rounded-full px-2 py-1 font-ui text-[11px] transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                      mode === key ? "bg-surface-2 text-fg" : "text-fg-muted hover:text-fg",
                    )}
                  >
                    <Icon size={11} aria-hidden />
                    {label}
                  </button>
                ),
              )}
            </div>
          ) : null}
          {actions}
        </>
      }
    >
      {folded ? (
        <JsonViewer value={parsed.value} className="h-full" initialDepth={initialDepth} />
      ) : (
        <CodeArea
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          ariaLabel={ariaLabel}
          placeholder={placeholder}
          className="h-full rounded-none border-0"
        />
      )}
    </Panel>
  );
}
