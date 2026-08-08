import { test } from "node:test";
import assert from "node:assert/strict";
import { WorldStateManager } from "../src/systems/WorldStateManager";
import { QuestGenerator } from "../src/systems/QuestGenerator";
import type { NPC, Settlement } from "../src/domain/types";
import { makeTestNpc, makeTestWorld } from "./testHelpers";

function baseWorld(settlement: Settlement, npc: NPC) {
  return makeTestWorld({
    player: { ...makeTestWorld().player, currentSettlementId: settlement.id },
    settlements: { [settlement.id]: settlement },
    npcs: { [npc.id]: npc },
  });
}

function makeNpc(settlementId: string): NPC {
  return makeTestNpc("npc_1", { name: "Giver", role: "innkeeper", settlementId });
}

test("a settlement with dangerous roads generates a road-clearing quest", () => {
  const settlement: Settlement = {
    id: "settlement_1",
    name: "Millbrook",
    kingdomId: "kingdom_1",
    type: "village",
    population: 200,
    prosperity: 50,
    roadSafety: 20, // below the 50 threshold
    destroyed: false,
    destroyedOn: null,
    controllingFactionId: null,
  };
  const npc = makeNpc(settlement.id);
  const manager = new WorldStateManager(baseWorld(settlement, npc));

  const quests = QuestGenerator.generateAvailableQuests(manager, manager.getWorld().currentDate, 5);
  assert.ok(quests.some((q) => q.templateId === "clear_roads"));
});

test("a safe, prosperous settlement does NOT generate a road-clearing quest", () => {
  const settlement: Settlement = {
    id: "settlement_2",
    name: "Stoneford",
    kingdomId: "kingdom_1",
    type: "town",
    population: 500,
    prosperity: 80,
    roadSafety: 90, // well above threshold
    destroyed: false,
    destroyedOn: null,
    controllingFactionId: null,
  };
  const npc = makeNpc(settlement.id);
  const manager = new WorldStateManager(baseWorld(settlement, npc));

  const quests = QuestGenerator.generateAvailableQuests(manager, manager.getWorld().currentDate, 5);
  assert.equal(quests.some((q) => q.templateId === "clear_roads"), false);
});

test("a destroyed settlement never generates quests", () => {
  const settlement: Settlement = {
    id: "settlement_3",
    name: "Ashfall",
    kingdomId: "kingdom_1",
    type: "village",
    population: 0,
    prosperity: 0,
    roadSafety: 0,
    destroyed: true,
    destroyedOn: { year: 1, season: "spring", day: 1 },
    controllingFactionId: null,
  };
  const npc = makeNpc(settlement.id);
  const manager = new WorldStateManager(baseWorld(settlement, npc));

  const quests = QuestGenerator.generateAvailableQuests(manager, manager.getWorld().currentDate, 5);
  assert.equal(quests.length, 0);
});
