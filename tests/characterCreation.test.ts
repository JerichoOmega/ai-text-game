import { test } from "node:test";
import assert from "node:assert/strict";
import { CharacterSystem } from "../src/systems/CharacterSystem";
import { RACES, BACKGROUNDS, getBackground } from "../src/data/origins";
import { getEquipment } from "../src/data/equipment";
import { getCharacterAbility } from "../src/data/abilities";

const BASE = { name: "Aria", id: "player_1", currentSettlementId: "s1" };

test("origins: 5-ish curated races and backgrounds, all resolvable with a starting ability", () => {
  assert.ok(RACES.length >= 4 && RACES.length <= 6);
  assert.ok(BACKGROUNDS.length >= 4 && BACKGROUNDS.length <= 6);
  for (const b of BACKGROUNDS) {
    assert.ok(getCharacterAbility(b.startingCharacterAbilityId), `${b.id} grants a real character ability`);
    for (const e of b.startingEquipmentIds) assert.ok(getEquipment(e), `${b.id} equipment ${e} exists`);
  }
});

test("a new character starts at level 1 with exactly one Character Ability and no Combat Abilities", () => {
  const bg = getBackground("soldier")!;
  const player = CharacterSystem.createStartingPlayer({ ...BASE, origin: { raceId: "human", backgroundId: "soldier", motivation: "duty" } });
  assert.equal(player.level, 1);
  assert.equal(player.xp, 0);
  assert.equal(player.characterAbilityIds.length, 1);
  assert.equal(player.characterAbilityIds[0], bg.startingCharacterAbilityId);
  assert.equal(player.combatAbilityIds.length, 0);
  assert.equal(player.hp, player.maxHp, "starts at full health");
});

test("starting stats are deterministic for the same origin", () => {
  const origin = { raceId: "elf", backgroundId: "scholar", motivation: "fortune" };
  const a = CharacterSystem.createStartingPlayer({ ...BASE, origin });
  const b = CharacterSystem.createStartingPlayer({ ...BASE, origin });
  assert.deepEqual(a.stats, b.stats);
  assert.equal(a.maxHp, b.maxHp);
});

test("race + background apply their stat bias on top of the base", () => {
  // Dwarf (+defense +maxHp) soldier (+attack +maxHp) should out-tank an elf scholar.
  const dwarf = CharacterSystem.createStartingPlayer({ ...BASE, origin: { raceId: "dwarf", backgroundId: "soldier", motivation: "duty" } });
  const elf = CharacterSystem.createStartingPlayer({ ...BASE, origin: { raceId: "elf", backgroundId: "scholar", motivation: "duty" } });
  assert.ok(dwarf.stats.defense > elf.stats.defense);
  assert.ok(dwarf.maxHp > elf.maxHp);
  assert.ok(elf.stats.magicPower > dwarf.stats.magicPower);
});

test("effective stats include equipped item modifiers", () => {
  // Soldier starts with a worn sword (+2 attack).
  const player = CharacterSystem.createStartingPlayer({ ...BASE, origin: { raceId: "human", backgroundId: "soldier", motivation: "duty" } });
  assert.ok(player.equipmentItemIds.includes("worn_sword"));
  const eff = CharacterSystem.effectiveStats(player);
  assert.equal(eff.attack, player.stats.attack + 2, "worn sword adds +2 attack");
});

test("the default (unspecified) origin still produces a valid character", () => {
  const player = CharacterSystem.createStartingPlayer(BASE);
  assert.equal(player.level, 1);
  assert.equal(player.characterAbilityIds.length, 1);
  assert.ok(player.stats.attack > 0);
});

test("persistence shape: a created character round-trips through JSON intact", () => {
  const player = CharacterSystem.createStartingPlayer({ ...BASE, origin: { raceId: "orc", backgroundId: "outlaw", motivation: "revenge" } });
  const restored = JSON.parse(JSON.stringify(player));
  assert.deepEqual(restored.stats, player.stats);
  assert.deepEqual(restored.characterAbilityIds, player.characterAbilityIds);
  assert.deepEqual(restored.equipmentItemIds, player.equipmentItemIds);
  assert.equal(restored.raceId, "orc");
  assert.equal(restored.backgroundId, "outlaw");
});
