"use client";

import { useEffect, useMemo, useState } from "react";
import { allMetas } from "@/lib/registry";
import { Rail } from "./Rail";
import { TopBar } from "./TopBar";
import { CommandPalette } from "./CommandPalette";
import { WorkspaceProvider } from "./WorkspaceProvider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Read here, not inside WorkspaceProvider — see the note in that file.
  const knownSlugs = useMemo(() => allMetas().map((m) => m.slug), []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <WorkspaceProvider knownSlugs={knownSlugs}>
      <div className="flex min-h-dvh">
        <Rail />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onOpenPalette={() => setPaletteOpen(true)} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </WorkspaceProvider>
  );
}
