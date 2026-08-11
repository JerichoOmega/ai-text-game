import type { ImageSourcePropType } from "react-native";
import type { NpcRole } from "@/domain/types";

/**
 * Generic, role-based portrait fallback — the LAST tier of the unified
 * portraitForNpc() resolver (see shopkeeperPortraits.ts). Canonical key
 * NPCs (characterId) and authored shopkeepers (shopkeeperId) resolve to
 * their own art first; only ordinary generated NPCs reach here and share a
 * small set of role-appropriate painted portraits with a villager fallback.
 * This is NOT a character-customization system, and it never produces a
 * canonical character's face.
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
