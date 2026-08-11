import type { EntityId } from "./kingdom";
import type { CombatStats } from "./world";

/**
 * Chronicle's single, stat-driven combat model (MVP). Deterministic:
 * damage is a pure function of the six CombatStats + an ability modifier,
 * turn order is by Speed. No positioning/grid, no elaborate status-effect
 * system — the one transient state is `defending` (halves the next incoming
 * hit this round). See src/systems/CombatEngine.ts for the rules and
 * DESIGN_SYSTEM.md "Combat & Progression" for the formulas.
 */
export interface Combatant {
  id: EntityId;
  name: string;
  isPlayerParty: boolean;
  hp: number;
  maxHp: number;
  /** Effective stats (player: base + equipment; enemy: authored/scaled). */
  stats: CombatStats;
  /** Combat ability ids this combatant may use. */
  combatAbilityIds: string[];
  /** True until the start of this combatant's next turn; halves incoming damage. */
  defending: boolean;
  /** XP awarded to the player when this combatant is defeated (enemies only). */
  xpReward?: number;
}

export type CombatActionType = "attack" | "ability" | "defend" | "item" | "flee";

export interface CombatAction {
  type: CombatActionType;
  /** Set when type === "ability". */
  abilityId?: string | null;
  /** Set when type === "item". */
  itemId?: string | null;
}

export type CombatOutcome = "ongoing" | "victory" | "defeat" | "fled";

export interface CombatEncounter {
  id: EntityId;
  player: Combatant;
  enemies: Combatant[];
  round: number;
  outcome: CombatOutcome;
  canFlee: boolean;
}
