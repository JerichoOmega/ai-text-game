import type { Ability, AbilityCategory, PlayerCharacter } from "@/domain/types";
import { abilitiesForCategory, getAbility } from "@/data/abilities";
import { mulberry32 } from "@/utils/rng";

/**
 * Level & ability progression (Parts 1–3, 13–16, 29). Deterministic and
 * pure — no RNG except the seeded, reproducible level-up choice roll.
 *
 * Rules:
 *  - LEVEL_CAP = 12. XP stops accruing at the cap.
 *  - One ability per level, category alternating: L1 Character, L2 Combat,
 *    L3 Character ... L12 Combat -> exactly 6 Character + 6 Combat unlocks.
 *  - Stat growth is a fixed table applied automatically each level.
 *  - The player never allocates points and never converts a category.
 */
export const LEVEL_CAP = 12;

const STAT_GROWTH = { maxHp: 6, attack: 2, defense: 2, magicPower: 2, magicDefense: 2, speed: 1 };

/** XP required to advance FROM `level` to `level + 1`. Gentle linear curve. */
export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 60;
}

/** Odd levels grant a Character ability, even levels a Combat ability. */
export function abilityCategoryForLevel(level: number): AbilityCategory {
  return level % 2 === 1 ? "character" : "combat";
}

/** How many unlocks of each category a character at `level` should have. */
export function expectedCharacterUnlocks(level: number): number {
  return Math.ceil(level / 2);
}
export function expectedCombatUnlocks(level: number): number {
  return Math.floor(level / 2);
}

export interface LevelUpRecord {
  level: number;
  category: AbilityCategory;
}

export interface GrantXpResult {
  player: PlayerCharacter;
  levelUps: LevelUpRecord[];
}

function applyStatGrowth(player: PlayerCharacter): PlayerCharacter {
  const maxHp = player.maxHp + STAT_GROWTH.maxHp;
  return {
    ...player,
    maxHp,
    hp: player.hp + STAT_GROWTH.maxHp, // level-up heals by the HP gained
    stats: {
      attack: player.stats.attack + STAT_GROWTH.attack,
      defense: player.stats.defense + STAT_GROWTH.defense,
      magicPower: player.stats.magicPower + STAT_GROWTH.magicPower,
      magicDefense: player.stats.magicDefense + STAT_GROWTH.magicDefense,
      speed: player.stats.speed + STAT_GROWTH.speed,
    },
  };
}

/**
 * Adds XP and applies any resulting level-ups (stat growth + level bump).
 * Ability *selection* is deferred to the UI (see pendingAbilitySelection).
 * At the cap, XP is frozen at 0 and no further levels occur. Excess XP
 * carries over between levels below the cap.
 */
export function grantXp(player: PlayerCharacter, amount: number): GrantXpResult {
  if (amount <= 0 || player.level >= LEVEL_CAP) {
    return { player: atCapClamp(player), levelUps: [] };
  }
  let next = { ...player, xp: player.xp + amount };
  const levelUps: LevelUpRecord[] = [];

  while (next.level < LEVEL_CAP && next.xp >= next.xpToNextLevel) {
    next = { ...next, xp: next.xp - next.xpToNextLevel, level: next.level + 1 };
    next = applyStatGrowth(next);
    next = { ...next, xpToNextLevel: xpForLevel(next.level) };
    levelUps.push({ level: next.level, category: abilityCategoryForLevel(next.level) });
  }

  return { player: atCapClamp(next), levelUps };
}

/** At the cap, freeze XP progression (Part 29). */
function atCapClamp(player: PlayerCharacter): PlayerCharacter {
  if (player.level >= LEVEL_CAP) return { ...player, level: LEVEL_CAP, xp: 0, xpToNextLevel: 0 };
  return player;
}

export interface PendingSelection {
  level: number;
  category: AbilityCategory;
  choices: Ability[];
}

/**
 * Derives whether the player owes an ability choice, purely from their
 * unlock counts vs. their level — so it survives save/load with no extra
 * persisted state. Returns the earliest unmet unlock's category with a
 * deterministic, seed-stable set of 3–4 choices (never already-owned).
 */
export function pendingAbilitySelection(player: PlayerCharacter, seed: number): PendingSelection | null {
  const charCount = player.characterAbilityIds.length;
  const combatCount = player.combatAbilityIds.length;
  const nextCharLevel = charCount * 2 + 1; // 1, 3, 5, ...
  const nextCombatLevel = combatCount * 2 + 2; // 2, 4, 6, ...

  const candidates: Array<{ level: number; category: AbilityCategory }> = [];
  if (nextCharLevel <= player.level && charCount < expectedCharacterUnlocks(player.level)) {
    candidates.push({ level: nextCharLevel, category: "character" });
  }
  if (nextCombatLevel <= player.level && combatCount < expectedCombatUnlocks(player.level)) {
    candidates.push({ level: nextCombatLevel, category: "combat" });
  }
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.level - b.level);
  const next = candidates[0]!;
  const owned = new Set(next.category === "character" ? player.characterAbilityIds : player.combatAbilityIds);
  const pool = abilitiesForCategory(next.category).filter((a) => !owned.has(a.id));
  const choices = pickChoices(pool, seed, next.level, next.category, 4);
  return { level: next.level, category: next.category, choices };
}

/** Deterministic shuffle-and-take, seeded so reloads show the same offer. */
function pickChoices(pool: Ability[], seed: number, level: number, category: AbilityCategory, count: number): Ability[] {
  const rng = mulberry32(((seed >>> 0) ^ (level * 2654435761) ^ (category === "character" ? 1 : 2)) >>> 0);
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr.slice(0, Math.min(count, arr.length));
}

/**
 * Applies a chosen ability. Validates that the id is a real ability of the
 * category the player currently owes and isn't already owned — so the UI
 * can never unlock two abilities from one level or the wrong category.
 * Returns the unchanged player if the choice is invalid.
 */
export function applyAbilityChoice(player: PlayerCharacter, abilityId: string, seed: number): PlayerCharacter {
  const pending = pendingAbilitySelection(player, seed);
  if (!pending) return player;
  const ability = getAbility(abilityId);
  if (!ability || ability.category !== pending.category) return player;
  if (!pending.choices.some((c) => c.id === abilityId)) return player;

  if (ability.category === "character") {
    return { ...player, characterAbilityIds: [...player.characterAbilityIds, ability.id] };
  }
  return { ...player, combatAbilityIds: [...player.combatAbilityIds, ability.id] };
}

export const ProgressionSystem = {
  LEVEL_CAP,
  xpForLevel,
  abilityCategoryForLevel,
  expectedCharacterUnlocks,
  expectedCombatUnlocks,
  grantXp,
  pendingAbilitySelection,
  applyAbilityChoice,
};
