import type { ImageSourcePropType } from "react-native";
import type { NpcRole } from "@/domain/types";

/**
 * Resolves an NPC to a portrait art reference by role. Chronicle has no
 * per-character portrait assets, so this is a deliberate placeholder
 * scheme: a small set of shared, role-appropriate painted portraits with a
 * villager fallback. It is NOT a character-customization system.
 *
 * The dialogue screen depends only on this resolver returning an
 * ImageSourcePropType, so richer/unique art (or a portrait id stored on the
 * NPC) can be swapped in later without touching the UI.
 */
const MERCHANT = require("../../../assets/images/merchant-portrait.jpg");
const GUARD = require("../../../assets/images/guard-portrait.jpg");
const VILLAGER = require("../../../assets/images/villager-portrait.jpg");

export function npcPortrait(role: NpcRole): ImageSourcePropType {
  switch (role) {
    case "merchant":
    case "innkeeper":
      return MERCHANT;
    case "guard":
    case "mercenary":
    case "bandit":
      return GUARD;
    default:
      return VILLAGER;
  }
}

/** A short, human-readable occupation label for the nameplate. */
export function roleLabel(role: NpcRole): string {
  const labels: Record<NpcRole, string> = {
    ruler: "Ruler",
    noble: "Noble",
    merchant: "Merchant",
    guard: "Town Guard",
    farmer: "Farmer",
    innkeeper: "Innkeeper",
    priest: "Priest",
    bandit: "Outlaw",
    mercenary: "Mercenary",
    commoner: "Villager",
  };
  return labels[role];
}
