"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ToolMeta } from "@/lib/registry/types";
import { KEYS, readJson, remove, writeJson } from "@/lib/storage";
import { readShareFromHash, SHARE_PREFIX, encodeShare } from "@/lib/share";

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

/**
 * The write gate, extracted so it can be regression-tested without a DOM.
 * Two of the three places a secret could escape used to live only inside a
 * React hook and a component, where the node-environment suite could not
 * reach them — an accidental `&&`/`||` flip would have gone unnoticed.
 */
export function mayPersist(meta: ToolMeta): boolean {
  return !meta.handlesSecrets;
}

/**
 * The share gate, extracted for the same reason. `shareable: false` means no
 * button at all; a `null` payload means the button renders disabled because
 * the state exceeds SHARE_LIMIT.
 */
export function shareGate(
  meta: ToolMeta,
  shareState: unknown,
): { shareable: false } | { shareable: true; payload: string | null } {
  if (meta.handlesSecrets || shareState === undefined) return { shareable: false };
  return { shareable: true, payload: encodeShare(shareState) };
}

export function useToolState<T extends object>(
  meta: ToolMeta,
  defaults: T,
  isValid: (value: unknown) => value is T,
): [T, (patch: Partial<T>) => void, () => void] {
  const [state, setState] = useState<T>(defaults);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<T | null>(null);

  // Restore after mount. The server has no localStorage and no hash, so doing
  // this during render would produce a hydration mismatch.
  useEffect(() => {
    const restored = initialToolState(meta, defaults, window.location.hash, isValid);
    setState(restored);
    if (window.location.hash.startsWith(SHARE_PREFIX)) {
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
      if (mayPersist(meta)) {
        pending.current = next;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          writeJson(KEYS.tool(meta.slug), next);
          pending.current = null;
        }, DEBOUNCE_MS);
      }
      return next;
    });
  }, [meta.handlesSecrets, meta.slug]);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    pending.current = null;
    remove(KEYS.tool(meta.slug));
    setState(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.slug]);

  // Flush on unmount rather than cancel. Cancelling threw away up to 400ms of
  // the user's most recent edit whenever they navigated mid-debounce, which
  // defeats the point of persisting at all. A pending value can only exist for
  // a tool that passed mayPersist(), so flushing cannot leak a secret.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (pending.current !== null) {
      writeJson(KEYS.tool(meta.slug), pending.current);
      pending.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.slug]);

  return [state, update, reset];
}
