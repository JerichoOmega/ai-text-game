import type { ImageSourcePropType } from "react-native";
import { resolveLocationArtwork } from "./locationArtworkResolver";

/** Generic dark-fantasy settlement vista used whenever a location has no dedicated art. */
export const GENERIC_SETTLEMENT_ART: ImageSourcePropType = require("../../../../assets/journey/town-settlement.png");

/**
 * Presentation-only registry mapping a settlement's slugified canonical name to
 * dedicated Journey hero artwork. This is intentionally separate from gameplay /
 * world state — no simulation data references it.
 *
 * To add a location-specific painting later, drop the file under
 * `assets/journey/locations/` and add one line here, e.g.:
 *
 *   millbrook: require("../../../../assets/journey/locations/millbrook.png"),
 *
 * Anything not listed here automatically uses GENERIC_SETTLEMENT_ART.
 */
export const LOCATION_ART: Record<string, ImageSourcePropType> = {
  // No dedicated location artwork exists yet — every settlement resolves to the
  // generic fallback. Add entries above as real art is produced.
};

/** Resolve the Journey hero artwork for the current settlement (generic fallback-safe). */
export function getLocationArtwork(settlement: { name?: string | null } | null | undefined): ImageSourcePropType {
  return resolveLocationArtwork(settlement, LOCATION_ART, GENERIC_SETTLEMENT_ART);
}
