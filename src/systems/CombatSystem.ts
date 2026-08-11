import type { Combatant, CombatEncounter, EntityId, GameDate, PlayerCharacter } from "@/domain/types";
import { CharacterSystem } from "./CharacterSystem";
import { autoResolve } from "./CombatEngine";
import { makeEnemy } from "@/data/enemies";
import type { DispatchInput } from "./EventBus";
import { createId } from "@/utils/id";

/**
 * Encounter setup + the bridge from a resolved fight to the world's event
 * stream. It owns NO combat rules — CombatEngine is the single resolver.
 * On a player victory it maps the outcome onto the existing
 * `bandit_leader_slain` event (already wired to quest-progress, history,
 * NPC-memory and achievement subscribers), rather than inventing a new one.
 */

export function toPlayerCombatant(player: PlayerCharacter): Combatant {
  return {
    id: player.id,
    name: player.name,
    isPlayerParty: true,
    hp: player.hp,
    maxHp: player.maxHp,
    stats: CharacterSystem.effectiveStats(player),
    combatAbilityIds: player.combatAbilityIds,
    defending: false,
  };
}

export interface CreateEncounterOptions {
  enemyTemplateIds: string[];
  level: number;
  canFlee?: boolean;
}

export const CombatSystem = {
  createEncounter(player: PlayerCharacter, { enemyTemplateIds, level, canFlee }: CreateEncounterOptions): CombatEncounter {
    const enemies = enemyTemplateIds.map((id) => makeEnemy(id, level));
    return {
      id: createId("enc"),
      player: toPlayerCombatant(player),
      enemies,
      round: 1,
      outcome: "ongoing",
      canFlee: canFlee ?? enemies.every((e) => e.hp > 0),
    };
  },

  /** The standard road-threat encounter a combat quest resolves into. */
  startQuestEncounter(player: PlayerCharacter): CombatEncounter {
    return this.createEncounter(player, { enemyTemplateIds: ["bandit"], level: player.level, canFlee: true });
  },

  /** Total XP for defeating every enemy in the encounter. */
  totalXpReward(encounter: CombatEncounter): number {
    return encounter.enemies.reduce((sum, e) => sum + (e.xpReward ?? 0), 0);
  },

  /**
   * Fully resolves an encounter headlessly (player basic-attacks) — used by
   * the quest event-bridge and tests. Wraps CombatEngine.autoResolve.
   */
  autoResolveEncounter(player: PlayerCharacter): { encounter: CombatEncounter; logLines: string[] } {
    const start = this.startQuestEncounter(player);
    const { encounter, log } = autoResolve(start);
    return { encounter, logLines: log };
  },

  /** Victory -> completion event; anything else -> null (no consequence). */
  victoryEvent(encounter: CombatEncounter, options: { timestamp: GameDate; locationIds?: EntityId[]; description?: string }): DispatchInput | null {
    if (encounter.outcome !== "victory") return null;
    const defeatedIds = encounter.enemies.map((e) => e.id);
    return {
      type: "bandit_leader_slain",
      timestamp: options.timestamp,
      description: options.description ?? "The raiders threatening the roads were driven off.",
      affectedEntityIds: [...(options.locationIds ?? []), ...defeatedIds],
      originatedFromPlayer: true,
    };
  },
};
