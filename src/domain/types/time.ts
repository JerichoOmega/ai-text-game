/**
 * Domain layer: pure types, zero dependencies on data/state/presentation.
 * The game clock. Every persisted fact in the world is timestamped with a
 * GameDate so history and NPC memory can be ordered and displayed
 * ("three months ago" instead of a raw counter).
 */

export type Season = "spring" | "summer" | "autumn" | "winter";

export interface GameDate {
  year: number;
  season: Season;
  /** Day within the season, 1-indexed. Seasons are DAYS_PER_SEASON long. */
  day: number;
}

export const DAYS_PER_SEASON = 30;
export const SEASON_ORDER: readonly Season[] = ["spring", "summer", "autumn", "winter"];

/** Total elapsed days since year 1, spring, day 1 — used for sorting/diffing dates. */
export function toAbsoluteDay(date: GameDate): number {
  const seasonIndex = SEASON_ORDER.indexOf(date.season);
  return (date.year - 1) * SEASON_ORDER.length * DAYS_PER_SEASON + seasonIndex * DAYS_PER_SEASON + (date.day - 1);
}

export function compareDates(a: GameDate, b: GameDate): number {
  return toAbsoluteDay(a) - toAbsoluteDay(b);
}

export function addDays(date: GameDate, days: number): GameDate {
  const absolute = toAbsoluteDay(date) + days;
  const year = Math.floor(absolute / (SEASON_ORDER.length * DAYS_PER_SEASON)) + 1;
  const remainder = absolute % (SEASON_ORDER.length * DAYS_PER_SEASON);
  const seasonIndex = Math.floor(remainder / DAYS_PER_SEASON);
  const day = (remainder % DAYS_PER_SEASON) + 1;
  const season = SEASON_ORDER[seasonIndex];
  if (season === undefined) {
    throw new Error(`addDays produced an invalid season index: ${seasonIndex}`);
  }
  return { year, season, day };
}

/** Human-readable relative phrasing for NPC dialogue and history, e.g. "three seasons ago". */
export function describeDaysAgo(from: GameDate, to: GameDate): string {
  const diff = toAbsoluteDay(to) - toAbsoluteDay(from);
  if (diff <= 0) return "just now";
  if (diff === 1) return "yesterday";
  if (diff < DAYS_PER_SEASON) return `${diff} days ago`;
  const seasons = Math.round(diff / DAYS_PER_SEASON);
  if (seasons < 4) return seasons === 1 ? "about a season ago" : `about ${seasons} seasons ago`;
  const years = Math.round(diff / (DAYS_PER_SEASON * SEASON_ORDER.length));
  return years === 1 ? "about a year ago" : `about ${years} years ago`;
}
