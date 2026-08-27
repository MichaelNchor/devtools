import { KEYS, readJson, writeJson } from "./storage";

export interface RecentEntry {
  slug: string;
  at: number;
}

export const RECENTS_STORED = 12;
export const RECENTS_SHOWN = 6;

/**
 * `known` is the list of currently registered slugs. Anything stored that is
 * not in it is dropped on read, so a tool removed in a later release cannot
 * leave a dead row in the rail or a card that navigates to a 404.
 */
export function readFavourites(known: string[]): string[] {
  const stored = readJson<unknown>(KEYS.favourites, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((s): s is string => typeof s === "string" && known.includes(s));
}

export function toggleFavourite(slug: string, current: string[]): string[] {
  return current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
}

export function saveFavourites(list: string[]): void {
  writeJson(KEYS.favourites, list);
}

export function readRecents(known: string[]): RecentEntry[] {
  const stored = readJson<unknown>(KEYS.recents, []);
  if (!Array.isArray(stored)) return [];
  return stored.filter(
    (e): e is RecentEntry =>
      typeof e === "object" && e !== null &&
      typeof (e as RecentEntry).slug === "string" &&
      typeof (e as RecentEntry).at === "number" &&
      known.includes((e as RecentEntry).slug),
  );
}

export function recordRecent(slug: string, current: RecentEntry[], now: number): RecentEntry[] {
  // Filter first, then unshift: revisiting a tool moves it rather than
  // adding a second row for it.
  return [{ slug, at: now }, ...current.filter((e) => e.slug !== slug)].slice(0, RECENTS_STORED);
}

export function saveRecents(list: RecentEntry[]): void {
  writeJson(KEYS.recents, list);
}
