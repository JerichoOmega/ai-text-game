import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LEVEL_CAP,
  abilityCategoryForLevel,
  expectedCharacterUnlocks,
  expectedCombatUnlocks,
  grantXp,
  pendingAbilitySelection,
  applyAbilityChoice,
  xpForLevel,
} from "../src/systems/ProgressionSystem";
import { CHARACTER_ABILITIES, COMBAT_ABILITIES } from "../src/data/abilities";
import { makeTestPlayer } from "./testHelpers";
import type { PlayerCharacter } from "../src/domain/types";

const SEED = 12345;

/** Drives a fresh level-1 character all the way to the cap, choosing an
 * ability at every level, and returns the sequence of chosen categories. */
function playToCap(): { player: PlayerCharacter; categories: string[] } {
  let player = makeTestPlayer();
  const categories: string[] = [];
  // L1 character ability is granted at creation in the real flow; the test
  // player starts with none, so resolve the L1 pending choice first.
  let guard = 0;
  while (guard++ < 100) {
    const pending = pendingAbilitySelection(player, SEED);
    if (pending) {
      categories.push(`${pending.level}:${pending.category}`);
      player = applyAbilityChoice(player, pending.choices[0]!.id, SEED);
      continue;
    }
    if (player.level >= LEVEL_CAP) break;
    player = grantXp(player, 100000).player; // enough to level once (clamped by loop)
  }
  return { player, categories };
}

test("category alternates: L1 character, L2 combat, ... L12 combat", () => {
  for (let lvl = 1; lvl <= 12; lvl++) {
    assert.equal(abilityCategoryForLevel(lvl), lvl % 2 === 1 ? "character" : "combat");
  }
});

test("a level-12 run yields exactly 6 character + 6 combat unlocks", () => {
  const { player } = playToCap();
  assert.equal(player.level, 12);
  assert.equal(player.characterAbilityIds.length, 6, "6 character abilities");
  assert.equal(player.combatAbilityIds.length, 6, "6 combat abilities");
  assert.equal(expectedCharacterUnlocks(12), 6);
  assert.equal(expectedCombatUnlocks(12), 6);
});

test("XP accumulates and triggers a level-up at the threshold; excess carries over", () => {
  const player = makeTestPlayer();
  const need = xpForLevel(1); // 100
  const res = grantXp(player, need + 30);
  assert.equal(res.player.level, 2);
  assert.equal(res.player.xp, 30, "excess XP carries into the new level");
  assert.equal(res.levelUps.length, 1);
  assert.equal(res.levelUps[0]!.category, "combat"); // L2
});

test("a large XP grant can raise multiple levels at once", () => {
  const player = makeTestPlayer();
  const res = grantXp(player, 5000);
  assert.ok(res.player.level > 2, "multiple levels gained");
  assert.ok(res.player.level <= 12);
});

test("level-up applies stat growth and increases max HP", () => {
  const player = makeTestPlayer();
  const before = { ...player.stats, maxHp: player.maxHp };
  const res = grantXp(player, xpForLevel(1));
  assert.ok(res.player.maxHp > before.maxHp, "maxHp grows");
  assert.ok(res.player.stats.attack > before.attack, "attack grows");
  assert.ok(res.player.stats.speed >= before.speed, "speed grows");
});

test("level is capped at 12; XP stops accruing at the cap (no level 13)", () => {
  let player = makeTestPlayer();
  player = grantXp(player, 1_000_000).player; // way past the cap
  assert.equal(player.level, 12);
  assert.equal(player.xp, 0, "XP frozen at cap");
  assert.equal(player.xpToNextLevel, 0);
  // Further XP does nothing.
  const after = grantXp(player, 1_000_000);
  assert.equal(after.player.level, 12);
  assert.equal(after.levelUps.length, 0);
});

test("pending selection reflects the earliest unmet unlock and offers 3-4 unowned choices", () => {
  const player = makeTestPlayer(); // level 1, no abilities
  const pending = pendingAbilitySelection(player, SEED)!;
  assert.ok(pending, "a level-1 character ability is owed");
  assert.equal(pending.category, "character");
  assert.equal(pending.level, 1);
  assert.ok(pending.choices.length >= 3 && pending.choices.length <= 4);
  assert.ok(pending.choices.every((c) => c.category === "character"));
});

test("choices are deterministic for the same seed/level", () => {
  const player = makeTestPlayer();
  const a = pendingAbilitySelection(player, SEED)!.choices.map((c) => c.id);
  const b = pendingAbilitySelection(player, SEED)!.choices.map((c) => c.id);
  assert.deepEqual(a, b);
});

test("cannot unlock two abilities from one level; wrong-category or off-list ids are rejected", () => {
  const player = makeTestPlayer();
  const pending = pendingAbilitySelection(player, SEED)!;
  const chosen = pending.choices[0]!.id;

  const after = applyAbilityChoice(player, chosen, SEED);
  assert.equal(after.characterAbilityIds.length, 1);

  // A second character pick at the same level is a no-op (level 1 only owes one).
  const other = CHARACTER_ABILITIES.find((a) => a.id !== chosen && !after.characterAbilityIds.includes(a.id))!;
  const twice = applyAbilityChoice(after, other.id, SEED);
  assert.equal(twice.characterAbilityIds.length, 1, "second unlock at the same level is rejected");

  // A combat ability id is rejected while a character choice is owed.
  const combatId = COMBAT_ABILITIES[0]!.id;
  const wrongCat = applyAbilityChoice(player, combatId, SEED);
  assert.equal(wrongCat.combatAbilityIds.length, 0, "wrong category rejected");
});

test("no pending selection once all unlocks for the current level are made", () => {
  let player = makeTestPlayer();
  const pending = pendingAbilitySelection(player, SEED)!;
  player = applyAbilityChoice(player, pending.choices[0]!.id, SEED);
  assert.equal(pendingAbilitySelection(player, SEED), null, "level 1 fully resolved");
});
