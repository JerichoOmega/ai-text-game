import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveRound, autoResolve, physicalDamage, magicDamage, DAMAGE_FLOOR } from "../src/systems/CombatEngine";
import { CombatSystem } from "../src/systems/CombatSystem";
import { makeEnemy } from "../src/data/enemies";
import { makeTestPlayer } from "./testHelpers";
import type { Combatant, CombatEncounter } from "../src/domain/types";

function combatant(over: Partial<Combatant> = {}): Combatant {
  return {
    id: over.id ?? "c1",
    name: over.name ?? "Fighter",
    isPlayerParty: over.isPlayerParty ?? true,
    hp: over.hp ?? 30,
    maxHp: over.maxHp ?? 30,
    stats: over.stats ?? { attack: 10, defense: 4, magicPower: 8, magicDefense: 4, speed: 6 },
    combatAbilityIds: over.combatAbilityIds ?? [],
    defending: over.defending ?? false,
    xpReward: over.xpReward,
  };
}

function encounter(player: Combatant, enemies: Combatant[]): CombatEncounter {
  return { id: "enc", player, enemies, round: 1, outcome: "ongoing", canFlee: true };
}

test("physical damage = attack + power - defense, with a minimum floor", () => {
  const atk = combatant({ stats: { attack: 10, defense: 0, magicPower: 0, magicDefense: 0, speed: 5 } });
  const def = combatant({ stats: { attack: 0, defense: 4, magicPower: 0, magicDefense: 0, speed: 5 } });
  assert.equal(physicalDamage(atk, def, 6), 12); // 10 + 6 - 4
  // Overwhelming defense still deals the floor, never zero/negative.
  const tank = combatant({ stats: { attack: 0, defense: 100, magicPower: 0, magicDefense: 0, speed: 5 } });
  assert.equal(physicalDamage(atk, tank, 0), DAMAGE_FLOOR);
});

test("magic damage uses magic power vs magic defense", () => {
  const caster = combatant({ stats: { attack: 0, defense: 0, magicPower: 12, magicDefense: 0, speed: 5 } });
  const target = combatant({ stats: { attack: 0, defense: 0, magicPower: 0, magicDefense: 5, speed: 5 } });
  assert.equal(magicDamage(caster, target, 5), 12); // 12 + 5 - 5
});

test("defend halves the next incoming hit this round", () => {
  const player = combatant({ isPlayerParty: true, hp: 30, stats: { attack: 1, defense: 0, magicPower: 0, magicDefense: 0, speed: 1 } });
  const enemy = combatant({ id: "e1", name: "Brute", isPlayerParty: false, hp: 30, stats: { attack: 20, defense: 0, magicPower: 0, magicDefense: 0, speed: 10 } });
  // Enemy is faster, so it attacks after the player defends only if player acts first...
  // Player is slower here; force the defend-benefit path by giving player higher speed.
  const fastPlayer = { ...player, stats: { ...player.stats, speed: 99 } };
  const { encounter: after } = resolveRound(encounter(fastPlayer, [enemy]), { type: "defend" });
  // Full hit would be 20; halved (ceil) = 10, so player took 10.
  assert.equal(after.player.hp, 20);
});

test("turn order: a faster enemy strikes before a slower player's action", () => {
  const player = combatant({ isPlayerParty: true, hp: 5, stats: { attack: 1, defense: 0, magicPower: 0, magicDefense: 0, speed: 1 } });
  const enemy = combatant({ id: "e1", name: "Swift", isPlayerParty: false, hp: 100, stats: { attack: 10, defense: 0, magicPower: 0, magicDefense: 0, speed: 50 } });
  const { encounter: after } = resolveRound(encounter(player, [enemy]), { type: "attack" });
  // Enemy (speed 50) acts first, dealing 10 to a 5-HP player -> defeat before the player's basic attack matters.
  assert.equal(after.outcome, "defeat");
});

test("HP reduction and defeat at zero HP ends the encounter as a loss", () => {
  const player = combatant({ isPlayerParty: true, hp: 1, stats: { attack: 1, defense: 0, magicPower: 0, magicDefense: 0, speed: 1 } });
  const enemy = combatant({ id: "e1", isPlayerParty: false, hp: 50, stats: { attack: 30, defense: 0, magicPower: 0, magicDefense: 0, speed: 99 } });
  const { encounter: after } = resolveRound(encounter(player, [enemy]), { type: "attack" });
  assert.equal(after.player.hp, 0);
  assert.equal(after.outcome, "defeat");
});

test("victory when all enemies are defeated", () => {
  const player = combatant({ isPlayerParty: true, hp: 100, stats: { attack: 100, defense: 50, magicPower: 0, magicDefense: 50, speed: 99 } });
  const enemy = combatant({ id: "e1", isPlayerParty: false, hp: 10, stats: { attack: 1, defense: 0, magicPower: 0, magicDefense: 0, speed: 1 } });
  const { encounter: after } = resolveRound(encounter(player, [enemy]), { type: "attack" });
  assert.equal(after.outcome, "victory");
});

test("flee ends the encounter as fled", () => {
  const player = combatant({});
  const enemy = combatant({ id: "e1", isPlayerParty: false });
  const { encounter: after } = resolveRound(encounter(player, [enemy]), { type: "flee" });
  assert.equal(after.outcome, "fled");
});

test("healing ability restores HP without exceeding max", () => {
  const player = combatant({ isPlayerParty: true, hp: 5, maxHp: 30, combatAbilityIds: ["healing_touch"], stats: { attack: 1, defense: 50, magicPower: 6, magicDefense: 50, speed: 99 } });
  const enemy = combatant({ id: "e1", isPlayerParty: false, hp: 50, stats: { attack: 1, defense: 0, magicPower: 0, magicDefense: 0, speed: 1 } });
  const { encounter: after } = resolveRound(encounter(player, [enemy]), { type: "ability", abilityId: "healing_touch" });
  assert.ok(after.player.hp > 5, "healed");
  assert.ok(after.player.hp <= 30, "never above max");
});

test("autoResolve is deterministic and reproducible for the same encounter", () => {
  const player = makeTestPlayer();
  const a = CombatSystem.autoResolveEncounter(player);
  const b = CombatSystem.autoResolveEncounter(player);
  assert.equal(a.encounter.outcome, b.encounter.outcome);
  assert.deepEqual(a.logLines, b.logLines);
});

test("enemy stats scale with encounter level", () => {
  const l1 = makeEnemy("bandit", 1);
  const l5 = makeEnemy("bandit", 5);
  assert.ok(l5.maxHp > l1.maxHp);
  assert.ok(l5.stats.attack > l1.stats.attack);
  assert.ok((l5.xpReward ?? 0) > (l1.xpReward ?? 0));
});

test("victoryEvent is produced on victory and withheld otherwise", () => {
  const player = combatant({ hp: 100, stats: { attack: 100, defense: 99, magicPower: 0, magicDefense: 99, speed: 99 } });
  const enemy = combatant({ id: "e1", isPlayerParty: false, hp: 5, stats: { attack: 1, defense: 0, magicPower: 0, magicDefense: 0, speed: 1 } });
  const won = autoResolve(encounter(player, [enemy])).encounter;
  const event = CombatSystem.victoryEvent(won, { timestamp: { year: 1, season: "spring", day: 1 }, locationIds: ["s1"] });
  assert.ok(event, "victory yields an event");
  const ongoing: CombatEncounter = { ...encounter(player, [enemy]), outcome: "defeat" };
  assert.equal(CombatSystem.victoryEvent(ongoing, { timestamp: { year: 1, season: "spring", day: 1 } }), null);
});
