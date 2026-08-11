import type { CombatStats } from "./world";

/**
 * Character progression domain types. Two ability *categories* that never
 * mix (Part 20): Character abilities affect the world/dialogue/exploration;
 * Combat abilities affect combat. Definitions live in src/data/abilities.ts;
 * races/backgrounds in src/data/origins.ts. All node-safe (no assets).
 */
export type AbilityCategory = "character" | "combat";

/** How a combat ability resolves against the stat model. */
export type CombatAbilityKind = "physical" | "magic" | "guard" | "heal";

export interface CharacterAbility {
  id: string;
  name: string;
  category: "character";
  description: string;
  /** Loose grouping for future "which situations does this open up" logic. */
  tag: string;
}

export interface CombatAbility {
  id: string;
  name: string;
  category: "combat";
  description: string;
  kind: CombatAbilityKind;
  /** Flat modifier added to the damage/heal/mitigation math. */
  power: number;
}

export type Ability = CharacterAbility | CombatAbility;

/** A stat nudge applied at character creation. Small by design. */
export type StatBias = Partial<CombatStats & { maxHp: number }>;

export interface Race {
  id: string;
  name: string;
  description: string;
  statBias: StatBias;
}

export interface Background {
  id: string;
  name: string;
  description: string;
  statBias: StatBias;
  /** The Level-1 Character Ability this background grants. */
  startingCharacterAbilityId: string;
  startingEquipmentIds: string[];
}

export interface Motivation {
  id: string;
  name: string;
  description: string;
}

/** The player's chosen identity at creation. */
export interface PlayerOrigin {
  raceId: string;
  backgroundId: string;
  motivation: string;
}
