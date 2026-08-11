import type { Combatant, CombatStats } from "@/domain/types";
import { createId } from "@/utils/id";

/**
 * Authored enemy templates (Part 22). Enemies use the same stat model as
 * the player but NOT the player's progression system — their difficulty is
 * authored at level 1 and scaled deterministically by encounter level.
 */
export interface EnemyTemplate {
  id: string;
  name: string;
  baseHp: number;
  baseStats: CombatStats;
  xpReward: number;
  combatAbilityIds: string[];
  canFlee: boolean;
}

export const ENEMIES: EnemyTemplate[] = [
  { id: "bandit", name: "Bandit", baseHp: 20, baseStats: { attack: 6, defense: 3, magicPower: 0, magicDefense: 2, speed: 4 }, xpReward: 40, combatAbilityIds: [], canFlee: true },
  { id: "wolf", name: "Wolf", baseHp: 16, baseStats: { attack: 7, defense: 2, magicPower: 0, magicDefense: 1, speed: 7 }, xpReward: 35, combatAbilityIds: [], canFlee: true },
  { id: "goblin", name: "Goblin", baseHp: 14, baseStats: { attack: 5, defense: 2, magicPower: 0, magicDefense: 2, speed: 6 }, xpReward: 30, combatAbilityIds: [], canFlee: true },
  { id: "skeleton", name: "Skeleton", baseHp: 22, baseStats: { attack: 6, defense: 5, magicPower: 0, magicDefense: 0, speed: 3 }, xpReward: 45, combatAbilityIds: [], canFlee: true },
  { id: "cutthroat", name: "Cutthroat", baseHp: 26, baseStats: { attack: 8, defense: 4, magicPower: 0, magicDefense: 3, speed: 5 }, xpReward: 60, combatAbilityIds: [], canFlee: false },
];

const BY_ID: Record<string, EnemyTemplate> = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));

export function getEnemyTemplate(id: string | undefined): EnemyTemplate | undefined {
  return id ? BY_ID[id] : undefined;
}

/** Per-level scaling applied on top of a template's level-1 stats. */
const ENEMY_GROWTH = { hp: 6, attack: 2, defense: 1, magicPower: 1, magicDefense: 1, speed: 1, xp: 15 };

/**
 * Builds a live Combatant for a template at a given encounter level.
 * Deterministic — pure arithmetic on the template, no RNG.
 */
export function makeEnemy(templateId: string, level = 1): Combatant {
  const t = BY_ID[templateId] ?? ENEMIES[0]!;
  const steps = Math.max(0, level - 1);
  const hp = t.baseHp + ENEMY_GROWTH.hp * steps;
  return {
    id: createId("enemy"),
    name: t.name,
    isPlayerParty: false,
    hp,
    maxHp: hp,
    stats: {
      attack: t.baseStats.attack + ENEMY_GROWTH.attack * steps,
      defense: t.baseStats.defense + ENEMY_GROWTH.defense * steps,
      magicPower: t.baseStats.magicPower + ENEMY_GROWTH.magicPower * steps,
      magicDefense: t.baseStats.magicDefense + ENEMY_GROWTH.magicDefense * steps,
      speed: t.baseStats.speed + ENEMY_GROWTH.speed * steps,
    },
    combatAbilityIds: t.combatAbilityIds,
    defending: false,
    xpReward: t.xpReward + ENEMY_GROWTH.xp * steps,
  };
}
