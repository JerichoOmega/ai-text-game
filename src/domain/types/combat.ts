import type { EntityId } from "./kingdom";

export type StatusEffectType = "poisoned" | "stunned" | "bleeding" | "shielded" | "enraged" | "slowed";

export interface StatusEffect {
  type: StatusEffectType;
  remainingTurns: number;
  magnitude: number;
}

export type Position = "front" | "mid" | "back";

export interface Combatant {
  id: EntityId;
  name: string;
  isPlayerParty: boolean;
  hp: number;
  maxHp: number;
  position: Position;
  statusEffects: StatusEffect[];
  abilities: string[];
}

export type CombatActionType = "attack" | "ability" | "move" | "item" | "defend" | "flee";

export interface CombatAction {
  actorId: EntityId;
  type: CombatActionType;
  targetId: EntityId | null;
  abilityId: string | null;
}

export interface CombatEncounter {
  id: EntityId;
  combatants: Combatant[];
  round: number;
  environment: "road" | "dungeon" | "settlement" | "wilderness";
  /** Environmental effects available this fight, e.g. "oil_slick", "high_ground". */
  environmentalFeatures: string[];
  resolved: boolean;
  playerVictorious: boolean | null;
}
