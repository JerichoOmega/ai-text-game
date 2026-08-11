import type { ImageSourcePropType } from "react-native";
import type { NpcRole } from "@/domain/types";
import { npcPortrait } from "./npcPortrait";

/**
 * shopkeeperId -> official portrait asset (the individual character
 * references from the supplied roster archive). RN-only: kept out of the
 * shopkeepers data module so that module stays node-test-safe.
 *
 * Assets confirmed bundled at build time; on-device rendering could not be
 * verified in this environment (no simulator / hermesc arch mismatch).
 */
const SHOPKEEPER_PORTRAITS: Record<string, ImageSourcePropType> = {
  marabelle: require("../../../assets/images/shopkeepers/marabelle.png"),
  eldric: require("../../../assets/images/shopkeepers/eldric.png"),
  brogan: require("../../../assets/images/shopkeepers/brogan.png"),
  lyra: require("../../../assets/images/shopkeepers/lyra.png"),
  zahir: require("../../../assets/images/shopkeepers/zahir.png"),
  pip: require("../../../assets/images/shopkeepers/pip.png"),
  sister_miriam: require("../../../assets/images/shopkeepers/sister_miriam.png"),
  grok: require("../../../assets/images/shopkeepers/grok.png"),
  silas: require("../../../assets/images/shopkeepers/silas.png"),
  tobias: require("../../../assets/images/shopkeepers/tobias.png"),
};

/**
 * Resolves the portrait for an NPC: an official shopkeeper's authored art
 * when the NPC carries a known shopkeeperId, otherwise the generic
 * role-based placeholder.
 */
export function portraitForNpc(npc: { role: NpcRole; shopkeeperId?: string }): ImageSourcePropType {
  if (npc.shopkeeperId && SHOPKEEPER_PORTRAITS[npc.shopkeeperId]) {
    return SHOPKEEPER_PORTRAITS[npc.shopkeeperId]!;
  }
  return npcPortrait(npc.role);
}
