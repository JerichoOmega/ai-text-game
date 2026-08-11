import type { CombatStats, EntityId, PlayerCharacter, PlayerOrigin } from "@/domain/types";
import { getBackground, getRace, DEFAULT_ORIGIN } from "@/data/origins";
import { equipmentBonus } from "@/data/equipment";
import { xpForLevel } from "./ProgressionSystem";

/**
 * Character creation + derived-stat helpers. Deterministic: the same origin
 * always produces the same starting character. There is no class and no
 * manual point allocation (Part 7) — identity comes from race + background,
 * which apply a modest one-time stat bias and grant the Level-1 Character
 * Ability.
 */
const BASE_STATS: CombatStats = { attack: 6, defense: 5, magicPower: 5, magicDefense: 5, speed: 5 };
const BASE_MAX_HP = 30;
const STARTING_GOLD = 20;

function biasedStats(raceId: string, backgroundId: string): { stats: CombatStats; maxHp: number } {
  const race = getRace(raceId);
  const bg = getBackground(backgroundId);
  const stats: CombatStats = { ...BASE_STATS };
  let maxHp = BASE_MAX_HP;
  for (const bias of [race?.statBias, bg?.statBias]) {
    if (!bias) continue;
    stats.attack += bias.attack ?? 0;
    stats.defense += bias.defense ?? 0;
    stats.magicPower += bias.magicPower ?? 0;
    stats.magicDefense += bias.magicDefense ?? 0;
    stats.speed += bias.speed ?? 0;
    maxHp += bias.maxHp ?? 0;
  }
  return { stats, maxHp };
}

export interface CreateStartingPlayerOptions {
  id: EntityId;
  name: string;
  currentSettlementId: EntityId;
  origin?: PlayerOrigin;
}

export const CharacterSystem = {
  createStartingPlayer({ id, name, currentSettlementId, origin = DEFAULT_ORIGIN }: CreateStartingPlayerOptions): PlayerCharacter {
    const { stats, maxHp } = biasedStats(origin.raceId, origin.backgroundId);
    const bg = getBackground(origin.backgroundId);
    return {
      id,
      name,
      raceId: origin.raceId,
      backgroundId: origin.backgroundId,
      motivation: origin.motivation,
      level: 1,
      xp: 0,
      xpToNextLevel: xpForLevel(1),
      hp: maxHp,
      maxHp,
      stats,
      gold: STARTING_GOLD,
      currentSettlementId,
      inventoryItemIds: [],
      equipmentItemIds: bg ? [...bg.startingEquipmentIds] : [],
      characterAbilityIds: bg ? [bg.startingCharacterAbilityId] : [],
      combatAbilityIds: [],
      reputations: [],
    };
  },

  /** Effective combat stats = base + equipped item modifiers (Part 21). */
  effectiveStats(player: PlayerCharacter): CombatStats {
    const bonus = equipmentBonus(player.equipmentItemIds);
    return {
      attack: player.stats.attack + bonus.attack,
      defense: player.stats.defense + bonus.defense,
      magicPower: player.stats.magicPower + bonus.magicPower,
      magicDefense: player.stats.magicDefense + bonus.magicDefense,
      speed: player.stats.speed + bonus.speed,
    };
  },
};
