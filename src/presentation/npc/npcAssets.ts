import type { ImageSourcePropType } from "react-native";
import { NPC_CHARACTERS, resolveExpressionKey } from "@/data/npcRegistry";
import { Logger } from "@/utils/logger";

/**
 * RN-only static asset map for the 12 canonical recurring NPCs (base
 * portraits + 6 expressions each). Kept out of npcRegistry.ts so that data
 * module stays node-test-safe. Metro requires literal require() calls, so
 * every asset is enumerated once here — the single source of truth for
 * characterId -> art.
 */
const BASE_PORTRAITS: Record<string, ImageSourcePropType> = {
  alden: require("../../../assets/characters/npc/portraits/alden.png"),
  elara: require("../../../assets/characters/npc/portraits/elara.png"),
  caelan: require("../../../assets/characters/npc/portraits/caelan.png"),
  lyssara: require("../../../assets/characters/npc/portraits/lyssara.png"),
  borin: require("../../../assets/characters/npc/portraits/borin.png"),
  brunna: require("../../../assets/characters/npc/portraits/brunna.png"),
  garruk: require("../../../assets/characters/npc/portraits/garruk.png"),
  vesha: require("../../../assets/characters/npc/portraits/vesha.png"),
  perrin: require("../../../assets/characters/npc/portraits/perrin.png"),
  mira: require("../../../assets/characters/npc/portraits/mira.png"),
  kael: require("../../../assets/characters/npc/portraits/kael.png"),
  seraphine: require("../../../assets/characters/npc/portraits/seraphine.png"),
};

// key = `${characterId}_${expressionKey}`
const EXPRESSIONS: Record<string, ImageSourcePropType> = {
  alden_angry: require("../../../assets/characters/npc/expressions/alden_angry.png"),
  alden_concerned: require("../../../assets/characters/npc/expressions/alden_concerned.png"),
  alden_friendly: require("../../../assets/characters/npc/expressions/alden_friendly.png"),
  alden_neutral: require("../../../assets/characters/npc/expressions/alden_neutral.png"),
  alden_skeptical: require("../../../assets/characters/npc/expressions/alden_skeptical.png"),
  alden_smiling: require("../../../assets/characters/npc/expressions/alden_smiling.png"),
  elara_amused: require("../../../assets/characters/npc/expressions/elara_amused.png"),
  elara_curious: require("../../../assets/characters/npc/expressions/elara_curious.png"),
  elara_determined: require("../../../assets/characters/npc/expressions/elara_determined.png"),
  elara_friendly: require("../../../assets/characters/npc/expressions/elara_friendly.png"),
  elara_neutral: require("../../../assets/characters/npc/expressions/elara_neutral.png"),
  elara_worried: require("../../../assets/characters/npc/expressions/elara_worried.png"),
  caelan_concerned: require("../../../assets/characters/npc/expressions/caelan_concerned.png"),
  caelan_disapproving: require("../../../assets/characters/npc/expressions/caelan_disapproving.png"),
  caelan_neutral: require("../../../assets/characters/npc/expressions/caelan_neutral.png"),
  caelan_smirking: require("../../../assets/characters/npc/expressions/caelan_smirking.png"),
  caelan_surprised: require("../../../assets/characters/npc/expressions/caelan_surprised.png"),
  caelan_thoughtful: require("../../../assets/characters/npc/expressions/caelan_thoughtful.png"),
  lyssara_angry: require("../../../assets/characters/npc/expressions/lyssara_angry.png"),
  lyssara_kind: require("../../../assets/characters/npc/expressions/lyssara_kind.png"),
  lyssara_neutral: require("../../../assets/characters/npc/expressions/lyssara_neutral.png"),
  lyssara_playful: require("../../../assets/characters/npc/expressions/lyssara_playful.png"),
  lyssara_sad: require("../../../assets/characters/npc/expressions/lyssara_sad.png"),
  lyssara_suspicious: require("../../../assets/characters/npc/expressions/lyssara_suspicious.png"),
  borin_angry: require("../../../assets/characters/npc/expressions/borin_angry.png"),
  borin_grumpy: require("../../../assets/characters/npc/expressions/borin_grumpy.png"),
  borin_jovial: require("../../../assets/characters/npc/expressions/borin_jovial.png"),
  borin_neutral: require("../../../assets/characters/npc/expressions/borin_neutral.png"),
  borin_proud: require("../../../assets/characters/npc/expressions/borin_proud.png"),
  borin_skeptical: require("../../../assets/characters/npc/expressions/borin_skeptical.png"),
  brunna_annoyed: require("../../../assets/characters/npc/expressions/brunna_annoyed.png"),
  brunna_determined: require("../../../assets/characters/npc/expressions/brunna_determined.png"),
  brunna_laughing: require("../../../assets/characters/npc/expressions/brunna_laughing.png"),
  brunna_neutral: require("../../../assets/characters/npc/expressions/brunna_neutral.png"),
  brunna_warm: require("../../../assets/characters/npc/expressions/brunna_warm.png"),
  brunna_worried: require("../../../assets/characters/npc/expressions/brunna_worried.png"),
  garruk_enraged: require("../../../assets/characters/npc/expressions/garruk_enraged.png"),
  garruk_grinning: require("../../../assets/characters/npc/expressions/garruk_grinning.png"),
  garruk_irritated: require("../../../assets/characters/npc/expressions/garruk_irritated.png"),
  garruk_neutral: require("../../../assets/characters/npc/expressions/garruk_neutral.png"),
  garruk_respectful: require("../../../assets/characters/npc/expressions/garruk_respectful.png"),
  garruk_threatened: require("../../../assets/characters/npc/expressions/garruk_threatened.png"),
  vesha_confident: require("../../../assets/characters/npc/expressions/vesha_confident.png"),
  vesha_defiant: require("../../../assets/characters/npc/expressions/vesha_defiant.png"),
  vesha_furious: require("../../../assets/characters/npc/expressions/vesha_furious.png"),
  vesha_neutral: require("../../../assets/characters/npc/expressions/vesha_neutral.png"),
  vesha_sad: require("../../../assets/characters/npc/expressions/vesha_sad.png"),
  vesha_smirking: require("../../../assets/characters/npc/expressions/vesha_smirking.png"),
  perrin_cheerful: require("../../../assets/characters/npc/expressions/perrin_cheerful.png"),
  perrin_friendly: require("../../../assets/characters/npc/expressions/perrin_friendly.png"),
  perrin_guilty: require("../../../assets/characters/npc/expressions/perrin_guilty.png"),
  perrin_nervous: require("../../../assets/characters/npc/expressions/perrin_nervous.png"),
  perrin_neutral: require("../../../assets/characters/npc/expressions/perrin_neutral.png"),
  perrin_surprised: require("../../../assets/characters/npc/expressions/perrin_surprised.png"),
  mira_disappointed: require("../../../assets/characters/npc/expressions/mira_disappointed.png"),
  mira_excited: require("../../../assets/characters/npc/expressions/mira_excited.png"),
  mira_kind: require("../../../assets/characters/npc/expressions/mira_kind.png"),
  mira_neutral: require("../../../assets/characters/npc/expressions/mira_neutral.png"),
  mira_skeptical: require("../../../assets/characters/npc/expressions/mira_skeptical.png"),
  mira_worried: require("../../../assets/characters/npc/expressions/mira_worried.png"),
  kael_amused: require("../../../assets/characters/npc/expressions/kael_amused.png"),
  kael_angry: require("../../../assets/characters/npc/expressions/kael_angry.png"),
  kael_brooding: require("../../../assets/characters/npc/expressions/kael_brooding.png"),
  kael_charming: require("../../../assets/characters/npc/expressions/kael_charming.png"),
  kael_neutral: require("../../../assets/characters/npc/expressions/kael_neutral.png"),
  kael_surprised: require("../../../assets/characters/npc/expressions/kael_surprised.png"),
  seraphine_furious: require("../../../assets/characters/npc/expressions/seraphine_furious.png"),
  seraphine_kind: require("../../../assets/characters/npc/expressions/seraphine_kind.png"),
  seraphine_neutral: require("../../../assets/characters/npc/expressions/seraphine_neutral.png"),
  seraphine_playful: require("../../../assets/characters/npc/expressions/seraphine_playful.png"),
  seraphine_sad: require("../../../assets/characters/npc/expressions/seraphine_sad.png"),
  seraphine_suspicious: require("../../../assets/characters/npc/expressions/seraphine_suspicious.png"),
};

/** True if the given id is a known canonical recurring NPC. */
export function isRecurringNpc(characterId: string | undefined): characterId is string {
  return !!characterId && characterId in BASE_PORTRAITS;
}

/** The canonical base portrait for a recurring NPC, or null if unknown. */
export function recurringBasePortrait(characterId: string): ImageSourcePropType | null {
  return BASE_PORTRAITS[characterId] ?? null;
}

/**
 * Resolves a recurring NPC's portrait for an emotional state. Fallback
 * chain: mapped expression -> the character's neutral -> base portrait.
 * Logs and returns null for a wholly-unknown character (caller then uses a
 * generic fallback) — never substitutes another NPC's art, never generates.
 */
export function recurringExpressionAsset(characterId: string, emotion: string): ImageSourcePropType | null {
  if (!isRecurringNpc(characterId)) {
    Logger.error("npcAssets", `Unknown recurring NPC "${characterId}" — no canonical portrait`);
    return null;
  }
  const key = resolveExpressionKey(characterId, emotion);
  const asset = EXPRESSIONS[`${characterId}_${key}`] ?? EXPRESSIONS[`${characterId}_neutral`];
  if (asset) return asset;
  Logger.error("npcAssets", `Missing expression "${key}" for "${characterId}"; using base portrait`);
  return BASE_PORTRAITS[characterId] ?? null;
}

/** Total canonical assets registered — used by verification. */
export const RECURRING_ASSET_COUNTS = {
  characters: NPC_CHARACTERS.length,
  portraits: Object.keys(BASE_PORTRAITS).length,
  expressions: Object.keys(EXPRESSIONS).length,
};
