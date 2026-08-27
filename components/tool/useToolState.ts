"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolMeta } from "@/lib/registry/types";
import { KEYS, readJson, remove, writeJson } from "@/lib/storage";
import { readShareFromHash } from "@/lib/share";

const DEBOUNCE_MS = 400;

/**
 * Precedence: a share hash beats stored state beats defaults. A link the user
 * just opened is the most specific intent they have expressed, so it wins over
 * whatever the tab happened to hold from last time.
 *
 * Tools with `handlesSecrets` take neither path. Their state is never written
 * to storage and never read from a URL, so they open empty every time — a
 * token pasted here must not outlive the tab that pasted it.
 */
export function initialToolState<T>(
  meta: ToolMeta,
  defaults: T,
  hash: string,
  isValid: (value: unknown) => value is T,
): T {
  if (meta.handlesSecrets) return defaults;

  const shared = readShareFromHash<unknown>(hash);
  if (isValid(shared)) return shared;

  const stored = readJson<unknown>(KEYS.tool(meta.slug), null);
  if (isValid(stored)) return stored;

  return defaults;
}

export function useToolState<T extends object>(
  meta: ToolMeta,
  defaults: T,
  isValid: (value: unknown) => value is T,
): [T, (patch: Partial<T>) => void, () => void] {
  const [state, setState] = useState<T>(defaults);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore after mount. The server has no localStorage and no hash, so doing
  // this during render would produce a hydration mismatch.
  useEffect(() => {
    const restored = initialToolState(meta, defaults, window.location.hash, isValid);
    setState(restored);
    if (window.location.hash.startsWith("#s=")) {
      // Clear the payload from the address bar so it does not ride along into
      // history or a screenshot once it has been applied.
      window.history.replaceState(null, "", window.location.pathname);
    }
    // Deliberately mount-only: re-running on every `defaults` identity change
    // would clobber what the user has typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.slug]);

  const update = useCallback((patch: Partial<T>) => {
    setState((current) => {
      const next = { ...current, ...patch };
      if (!meta.handlesSecrets) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => writeJson(KEYS.tool(meta.slug), next), DEBOUNCE_MS);
      }
      return next;
    });
  }, [meta.handlesSecrets, meta.slug]);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    remove(KEYS.tool(meta.slug));
    setState(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.slug]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return [state, update, reset];
}
