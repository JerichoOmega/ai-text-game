import type { ImageSourcePropType } from "react-native";

/**
 * Pure, asset-free artwork resolution logic (kept separate from the module that
 * `require()`s PNGs so it can be unit-tested without a bundler/asset loader).
 *
 * Settlement runtime ids are random per world (`createId`), so dedicated
 * artwork is keyed by the settlement's stable canonical NAME (slugified), never
 * by id. If no dedicated art is registered for a settlement, callers fall back
 * to the generic settlement painting.
 */

/** `"Green Hollow"` → `"green-hollow"`, `"Eastbridge"` → `"eastbridge"`. */
export function slugifyLocationName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface HasName {
  name?: string | null;
}

/**
 * Resolve the artwork source for a settlement. Returns the registered art when
 * a dedicated entry exists for the settlement's name; otherwise `fallback`.
 * Missing settlement, missing/empty name, or unknown name all resolve to
 * `fallback` so the banner can never render a broken image.
 */
export function resolveLocationArtwork(
  settlement: HasName | null | undefined,
  registry: Record<string, ImageSourcePropType>,
  fallback: ImageSourcePropType
): ImageSourcePropType {
  const name = settlement?.name;
  if (!name) return fallback;
  const key = slugifyLocationName(name);
  if (!key) return fallback;
  return registry[key] ?? fallback;
}
