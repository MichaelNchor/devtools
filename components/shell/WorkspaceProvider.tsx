"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  readFavourites, saveFavourites, toggleFavourite,
  readRecents, saveRecents, recordRecent, type RecentEntry,
} from "@/lib/workspace";

interface WorkspaceValue {
  favourites: string[];
  recents: RecentEntry[];
  isFavourite: (slug: string) => boolean;
  toggle: (slug: string) => void;
  visit: (slug: string) => void;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

/**
 * `knownSlugs` arrives as a prop rather than being read from the registry:
 * the registry imports the tool components, which reach this file, so
 * importing it back would close a cycle. AppShell supplies it.
 */
export function WorkspaceProvider(
  { knownSlugs, children }: { knownSlugs: string[]; children: React.ReactNode },
) {
  const [favourites, setFavourites] = useState<string[]>([]);
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const known = useMemo(() => knownSlugs, [knownSlugs]);

  // Hydration: the server renders an empty workspace and the client fills it
  // in after mount. Reading storage during render would mismatch.
  useEffect(() => {
    setFavourites(readFavourites(known));
    setRecents(readRecents(known));
  }, [known]);

  const toggle = useCallback((slug: string) => {
    setFavourites((current) => {
      const next = toggleFavourite(slug, current);
      saveFavourites(next);
      return next;
    });
  }, []);

  const visit = useCallback((slug: string) => {
    setRecents((current) => {
      const next = recordRecent(slug, current, Date.now());
      saveRecents(next);
      return next;
    });
  }, []);

  const value = useMemo<WorkspaceValue>(
    () => ({ favourites, recents, isFavourite: (s) => favourites.includes(s), toggle, visit }),
    [favourites, recents, toggle, visit],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return value;
}
