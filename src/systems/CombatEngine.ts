import type { Combatant, CombatAction, CombatEncounter } from "@/domain/types";
import { BASIC_ATTACK, getCombatAbility } from "@/data/abilities";

/**
 * Chronicle's single, deterministic, stat-driven combat resolver (Parts
 * 10–12, 17, 25). No RNG: damage and turn order are pure functions of the
 * six CombatStats + an ability modifier. This is the ONLY combat-rules
 * module — screens and CombatSystem orchestrate, they never recompute
 * damage themselves.
 *
 * Formulas:
 *   physical = max(FLOOR, attacker.attack     + power - defender.defense)
 *   magic    = max(FLOOR, attacker.magicPower + power - defender.magicDefense)
 *   heal     = power + floor(healer.magicPower / 2)
 *   defend halves the next incoming hit this round (rounded up, min FLOOR).
 * Turn order: highest Speed acts first; ties go to the player.
 */
export const DAMAGE_FLOOR = 1;
export const POTION_HEAL = 20;

export function physicalDamage(attacker: Combatant, defender: Combatant, power: number): number {
  return Math.max(DAMAGE_FLOOR, attacker.stats.attack + power - defender.stats.defense);
}

export function magicDamage(attacker: Combatant, defender: Combatant, power: number): number {
  return Math.max(DAMAGE_FLOOR, attacker.stats.magicPower + power - defender.stats.magicDefense);
}

export function healValue(healer: Combatant, power: number): number {
  return power + Math.floor(healer.stats.magicPower / 2);
}

function applyDamage(target: Combatant, rawDamage: number): { target: Combatant; dealt: number } {
  const dealt = target.defending ? Math.max(DAMAGE_FLOOR, Math.ceil(rawDamage / 2)) : rawDamage;
  return { target: { ...target, hp: Math.max(0, target.hp - dealt) }, dealt };
}

interface RoundState {
  player: Combatant;
  enemies: Combatant[];
  log: string[];
}

function firstAliveEnemyIndex(enemies: Combatant[]): number {
  return enemies.findIndex((e) => e.hp > 0);
}

/** Resolves the player's chosen action against the current state. */
function resolvePlayerAction(state: RoundState, action: CombatAction): boolean {
  const player = state.player;
  if (player.hp <= 0) return false;

  if (action.type === "flee") {
    state.log.push(`${player.name} flees the fight.`);
    return true; // signal: encounter ends as fled (handled by caller)
  }
  if (action.type === "defend") {
    state.player = { ...player, defending: true };
    state.log.push(`${player.name} raises a guard.`);
    return false;
  }
  if (action.type === "item") {
    const healed = Math.min(player.maxHp, player.hp + POTION_HEAL);
    state.player = { ...player, hp: healed };
    state.log.push(`${player.name} drinks a potion and recovers ${healed - player.hp} HP.`);
    return false;
  }

  const idx = firstAliveEnemyIndex(state.enemies);
  if (idx < 0) return false;
  const target = state.enemies[idx]!;

  if (action.type === "ability" && action.abilityId) {
    const ability = getCombatAbility(action.abilityId);
    if (ability && ability.kind === "heal") {
      const amount = healValue(player, ability.power);
      const healed = Math.min(player.maxHp, player.hp + amount);
      state.player = { ...player, hp: healed };
      state.log.push(`${player.name} uses ${ability.name} and recovers ${healed - player.hp} HP.`);
      return false;
    }
    if (ability && ability.kind === "guard") {
      state.player = { ...player, defending: true };
      state.log.push(`${player.name} uses ${ability.name} and braces for the next blow.`);
      return false;
    }
    if (ability) {
      const dmg = ability.kind === "magic" ? magicDamage(player, target, ability.power) : physicalDamage(player, target, ability.power);
      const { target: hurt, dealt } = applyDamage(target, dmg);
      state.enemies = state.enemies.map((e, i) => (i === idx ? hurt : e));
      state.log.push(`${player.name} uses ${ability.name} on ${target.name} for ${dealt} damage.`);
      if (hurt.hp <= 0) state.log.push(`${target.name} is defeated.`);
      return false;
    }
  }

  // Basic attack (default / fallback).
  const dmg = physicalDamage(player, target, BASIC_ATTACK.power);
  const { target: hurt, dealt } = applyDamage(target, dmg);
  state.enemies = state.enemies.map((e, i) => (i === idx ? hurt : e));
  state.log.push(`${player.name} strikes ${target.name} for ${dealt} damage.`);
  if (hurt.hp <= 0) state.log.push(`${target.name} is defeated.`);
  return false;
}

/** Deterministic enemy behavior: a basic attack on the player. */
function resolveEnemyAction(state: RoundState, enemyIndex: number): void {
  const enemy = state.enemies[enemyIndex];
  if (!enemy || enemy.hp <= 0 || state.player.hp <= 0) return;
  const dmg = physicalDamage(enemy, state.player, BASIC_ATTACK.power);
  const { target, dealt } = applyDamage(state.player, dmg);
  state.player = target;
  state.log.push(`${enemy.name} hits ${state.player.name} for ${dealt} damage.`);
  if (state.player.hp <= 0) state.log.push(`${state.player.name} is struck down.`);
}

export interface RoundResult {
  encounter: CombatEncounter;
  log: string[];
}

/**
 * Resolves one full round: every living combatant acts once, in Speed
 * order (player wins ties). Returns the next encounter state and this
 * round's narration. The player's `defending` guard is cleared at the end
 * of the round.
 */
export function resolveRound(encounter: CombatEncounter, playerAction: CombatAction): RoundResult {
  const state: RoundState = {
    player: { ...encounter.player },
    enemies: encounter.enemies.map((e) => ({ ...e })),
    log: [],
  };

  // Build Speed-ordered turn list. "player" sentinel + enemy indices.
  type Turn = { kind: "player" } | { kind: "enemy"; index: number };
  const turns: Array<{ turn: Turn; speed: number; playerTie: number }> = [
    { turn: { kind: "player" }, speed: state.player.stats.speed, playerTie: 1 },
    ...state.enemies.map((e, index) => ({ turn: { kind: "enemy" as const, index }, speed: e.stats.speed, playerTie: 0 })),
  ];
  turns.sort((a, b) => b.speed - a.speed || b.playerTie - a.playerTie);

  let fled = false;
  for (const { turn } of turns) {
    if (turn.kind === "player") {
      fled = resolvePlayerAction(state, playerAction);
      if (fled) break;
    } else {
      resolveEnemyAction(state, turn.index);
    }
    // Stop early if the fight is already decided.
    if (state.player.hp <= 0 || state.enemies.every((e) => e.hp <= 0)) break;
  }

  const playerAlive = state.player.hp > 0;
  const enemiesAlive = state.enemies.some((e) => e.hp > 0);
  let outcome = encounter.outcome;
  if (fled) outcome = "fled";
  else if (!playerAlive) outcome = "defeat";
  else if (!enemiesAlive) outcome = "victory";
  else outcome = "ongoing";

  // Guard lasts only through this round.
  const clearedPlayer = { ...state.player, defending: false };

  return {
    encounter: {
      ...encounter,
      player: clearedPlayer,
      enemies: state.enemies,
      round: encounter.round + 1,
      outcome,
    },
    log: state.log,
  };
}

const MAX_ROUNDS = 40;

/**
 * Headless resolution used for tests and the quest event-bridge: the player
 * repeatedly makes a basic attack until the encounter resolves. Drives the
 * exact same resolveRound rules — NOT a separate combat calculation.
 */
export function autoResolve(encounter: CombatEncounter): RoundResult {
  let current = encounter;
  const log: string[] = [];
  let guard = 0;
  while (current.outcome === "ongoing" && guard < MAX_ROUNDS) {
    const { encounter: next, log: roundLog } = resolveRound(current, { type: "attack" });
    current = next;
    log.push(...roundLog);
    guard++;
  }
  return { encounter: current, log };
}

export const CombatEngine = {
  physicalDamage,
  magicDamage,
  healValue,
  resolveRound,
  autoResolve,
  DAMAGE_FLOOR,
  POTION_HEAL,
};
