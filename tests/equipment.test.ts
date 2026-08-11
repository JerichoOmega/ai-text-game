import { test } from "node:test";
import assert from "node:assert/strict";
import { equipItem, unequipItem, equippedItemForSlot } from "../src/systems/EquipmentSystem";
import { CharacterSystem } from "../src/systems/CharacterSystem";
import { CombatSystem, toPlayerCombatant } from "../src/systems/CombatSystem";
import { getEquipment } from "../src/data/equipment";
import { findShopItem } from "../src/data/shopCatalog";
import { makeTestPlayer } from "./testHelpers";
import type { PlayerCharacter } from "../src/domain/types";

const SWORD = "item_iron_sword";
const CLOAK = "item_travelers_cloak";
const POTION = "item_healing_potion";

function playerWith(inventory: string[], equipment: string[] = []): PlayerCharacter {
  return makeTestPlayer({ inventoryItemIds: inventory, equipmentItemIds: equipment });
}

test("unification: a purchased shop item id is itself a valid equipment id", () => {
  assert.ok(findShopItem(SWORD), "sword is in the shop catalog");
  assert.ok(getEquipment(SWORD), "sword resolves as equipment");
  assert.equal(getEquipment(SWORD)!.slot, "weapon");
  assert.ok(findShopItem(CLOAK) && getEquipment(CLOAK));
  assert.equal(getEquipment(CLOAK)!.slot, "armor");
  // Consumables/utility are NOT equippable.
  assert.ok(findShopItem(POTION), "potion is in the shop catalog");
  assert.equal(getEquipment(POTION), undefined, "potion is not equipment");
});

test("equip weapon: moves id from inventory to equipment and raises effective attack", () => {
  const p = playerWith([SWORD]);
  const baseAttack = CharacterSystem.effectiveStats(p).attack;
  const after = equipItem(p, SWORD);
  assert.deepEqual(after.inventoryItemIds, [], "removed from inventory");
  assert.deepEqual(after.equipmentItemIds, [SWORD], "now equipped");
  assert.equal(CharacterSystem.effectiveStats(after).attack, baseAttack + 3);
  assert.equal(equippedItemForSlot(after, "weapon"), SWORD);
});

test("equip armor: raises effective defense and speed", () => {
  const p = playerWith([CLOAK]);
  const base = CharacterSystem.effectiveStats(p);
  const after = equipItem(p, CLOAK);
  const eff = CharacterSystem.effectiveStats(after);
  assert.equal(eff.defense, base.defense + 2);
  assert.equal(eff.speed, base.speed + 1);
});

test("unequip restores the base effective stats", () => {
  const p = playerWith([], [SWORD]);
  const base = CharacterSystem.effectiveStats(makeTestPlayer());
  assert.equal(CharacterSystem.effectiveStats(p).attack, base.attack + 3, "equipped bonus applied");
  const after = unequipItem(p, SWORD);
  assert.deepEqual(after.equipmentItemIds, []);
  assert.deepEqual(after.inventoryItemIds, [SWORD], "returned to inventory");
  assert.equal(CharacterSystem.effectiveStats(after).attack, base.attack, "back to base");
});

test("one item per slot: equipping a second weapon displaces the first back to inventory", () => {
  const p = playerWith([SWORD], ["worn_sword"]); // worn_sword already equipped
  const after = equipItem(p, SWORD);
  assert.equal(equippedItemForSlot(after, "weapon"), SWORD, "new weapon equipped");
  assert.ok(after.inventoryItemIds.includes("worn_sword"), "old weapon back in inventory");
  assert.ok(!after.equipmentItemIds.includes("worn_sword"), "old weapon no longer equipped");
});

test("combat reads equipped stats via toPlayerCombatant (interactive + auto share this path)", () => {
  const bare = playerWith([SWORD]);
  const equipped = equipItem(bare, SWORD);
  const bareCombatant = toPlayerCombatant(bare);
  const equippedCombatant = toPlayerCombatant(equipped);
  assert.equal(equippedCombatant.stats.attack, bareCombatant.stats.attack + 3, "combat sees the +3");
  // startQuestEncounter (used by both interactive begin and autoResolve) also builds from effectiveStats.
  const enc = CombatSystem.startQuestEncounter(equipped);
  assert.equal(enc.player.stats.attack, CharacterSystem.effectiveStats(equipped).attack);
});

test("invalid operations are rejected safely (no change)", () => {
  const p = playerWith([POTION, SWORD], [CLOAK]);
  assert.equal(equipItem(p, POTION), p, "cannot equip a consumable");
  assert.equal(equipItem(p, "not_owned_sword"), p, "cannot equip an unowned item");
  assert.equal(unequipItem(p, SWORD), p, "cannot unequip something not equipped");
});

test("deterministic: equipping the same item from the same state yields the same result", () => {
  const p = playerWith([SWORD]);
  assert.deepEqual(equipItem(p, SWORD), equipItem(p, SWORD));
});

test("persistence shape: inventory + equipment survive a JSON round-trip", () => {
  const p = equipItem(playerWith([SWORD, POTION]), SWORD);
  const restored = JSON.parse(JSON.stringify(p)) as PlayerCharacter;
  assert.deepEqual(restored.equipmentItemIds, p.equipmentItemIds);
  assert.deepEqual(restored.inventoryItemIds, p.inventoryItemIds);
  assert.equal(CharacterSystem.effectiveStats(restored).attack, CharacterSystem.effectiveStats(p).attack);
});

test("does not mutate its input player", () => {
  const p = playerWith([SWORD]);
  const inv = [...p.inventoryItemIds];
  equipItem(p, SWORD);
  assert.deepEqual(p.inventoryItemIds, inv, "input left unchanged");
});
