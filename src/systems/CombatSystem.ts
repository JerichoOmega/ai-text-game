import type { CombatAction, CombatEncounter, Combatant, EntityId, GameDate, PlayerCharacter } from "@/domain/types";
import { CombatEngine } from "./CombatEngine";
import type { DispatchInput } from "./EventBus";
import { createId } from "@/utils/id";

/**
 * The thin bridge between combat *outcomes* and the world's event stream.
 * CombatEngine stays a pure turn resolver that knows nothing about quests
 * or events; this module runs an encounter to its conclusion and, on a
 * player victory, translates that result into an existing domain event.
 *
 * It maps a road/location-clearing victory onto the existing
 * `bandit_leader_slain` event rather than inventing a new combat event
 * type — that event already carries the exact "the threat near this
 * settlement is gone" meaning, and already has world-consequence, history,
 * and achievement subscribers behind it. The quest-progress subscriber is
 * the new listener that turns it into objective progress.
 */

function toPlayerCombatant(player: PlayerCharacter): Combatant {
  return {
    id: player.id,
    name: player.name,
    isPlayerParty: true,
    hp: player.hp,
    maxHp: player.maxHp,
    position: "front",
    statusEffects: [],
    abilities: [],
  };
}

function makeEnemy(name: string, hp: number): Combatant {
  return {
    id: createId("enemy"),
    name,
    isPlayerParty: false,
    hp,
    maxHp: hp,
    position: "front",
    statusEffects: [],
    abilities: [],
  };
}

export interface AutoBattleResult {
  encounter: CombatEncounter;
  logLines: string[];
}

export interface VictoryEventOptions {
  timestamp: GameDate;
  /** Location/settlement ids the victory clears — used to match quest objectives. */
  locationIds?: EntityId[];
  description?: string;
}

const MAX_ROUNDS = 20;

export const CombatSystem = {
  /**
   * Resolves a full encounter deterministically by having the player attack
   * the standing enemy each round (and vice-versa) until one side falls.
   * CombatEngine.resolveTurn contains no randomness, so the same inputs
   * always produce the same outcome — the determinism the design requires.
   */
  resolveAutoBattle(player: PlayerCharacter, enemyName = "Bandit raiders", enemyHp = 12): AutoBattleResult {
    let encounter: CombatEncounter = {
      id: createId("enc"),
      combatants: [toPlayerCombatant(player), makeEnemy(enemyName, enemyHp)],
      round: 1,
      environment: "road",
      environmentalFeatures: [],
      resolved: false,
      playerVictorious: null,
    };

    const logLines: string[] = [];
    let guard = 0;
    while (!encounter.resolved && guard < MAX_ROUNDS) {
      const self = encounter.combatants.find((c) => c.isPlayerParty && c.hp > 0);
      const enemy = encounter.combatants.find((c) => !c.isPlayerParty && c.hp > 0);
      if (!self || !enemy) break;

      const actions: CombatAction[] = [
        { actorId: self.id, type: "attack", targetId: enemy.id, abilityId: null },
        { actorId: enemy.id, type: "attack", targetId: self.id, abilityId: null },
      ];
      const turn = CombatEngine.resolveTurn(encounter, actions);
      encounter = turn.encounter;
      logLines.push(...turn.logLines);
      guard++;
    }

    return { encounter, logLines };
  },

  /**
   * Translates a resolved encounter into the completion event, or null if
   * the player did not win (a loss produces no world consequence here).
   */
  victoryEvent(encounter: CombatEncounter, options: VictoryEventOptions): DispatchInput | null {
    if (!encounter.resolved || encounter.playerVictorious !== true) return null;
    const defeatedIds = encounter.combatants.filter((c) => !c.isPlayerParty).map((c) => c.id);
    return {
      type: "bandit_leader_slain",
      timestamp: options.timestamp,
      description: options.description ?? "The raiders threatening the roads were driven off.",
      affectedEntityIds: [...(options.locationIds ?? []), ...defeatedIds],
      originatedFromPlayer: true,
    };
  },
};
