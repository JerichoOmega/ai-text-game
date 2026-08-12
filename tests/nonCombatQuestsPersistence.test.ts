import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { resetDb as resetWebDb } from "@/data/db.web";
import { useWorldStore } from "@/state/useWorldStore";
import { worldRepository } from "@/data/repositories/worldRepository";
import { createId } from "@/utils/id";
import type { GameDate, Quest } from "@/domain/types";
import { makeTestNpc } from "./testHelpers";

/**
 * P0-2 end-to-end persistence: completing a non-combat quest through the real
 * store actions (talkTo / travelTo) must complete the quest through the
 * existing QuestSystem path AND survive a save/reload. Drives the real
 * Zustand store over the web SQLite engine via the expo-sqlite test stub.
 */

function store() {
  return useWorldStore.getState();
}

function makeQuest(objectiveType: "talk_to_npc" | "deliver_item", targetId: string, giverNpcId: string, now: GameDate): Quest {
  return {
    id: "quest_ctrl",
    templateId: "t",
    title: "Controlled Quest",
    contextSummary: "",
    giverNpcId,
    originEventId: null,
    status: "available",
    objectives: [{ id: createId("obj"), type: objectiveType, label: "do it", targetId, quantity: 1, progress: 0, complete: false }],
    reward: { gold: 40, reputationDelta: 5, factionId: null, itemIds: [] },
    issuedOn: now,
    expiresOn: null,
  };
}

beforeEach(async () => {
  await resetWebDb();
  useWorldStore.setState({ world: null, manager: null, storyLog: [], lastError: null, lastSavedAt: null });
  await store().initialize("Hero");
});

test("a talk_to_npc quest completes through talkTo and persists across save/reload", async () => {
  const manager = store().manager!;
  const now = manager.getWorld().currentDate;
  manager.setNpc(makeTestNpc("npc_giver", { name: "Garrick", settlementId: manager.getWorld().player.currentSettlementId }));
  const quest = makeQuest("talk_to_npc", "npc_giver", "npc_giver", now);
  manager.replaceWorld({ ...manager.getWorld(), quests: { [quest.id]: quest } });
  const goldBefore = manager.getWorld().player.gold;

  await store().talkTo("npc_giver");

  // Completed in the authoritative world.
  assert.equal(store().manager!.getQuest("quest_ctrl")!.status, "completed");
  assert.equal(store().manager!.getWorld().player.gold, goldBefore + 40);
  assert.equal(store().lastError, null);

  // Persisted.
  const reloaded = await worldRepository.loadAll();
  assert.equal(reloaded!.quests["quest_ctrl"]?.status, "completed");
  assert.equal(reloaded!.player.gold, goldBefore + 40);
});

test("a deliver_item quest completes through travelTo and persists across save/reload", async () => {
  const manager = store().manager!;
  const now = manager.getWorld().currentDate;
  const targetSettlementId = Object.keys(manager.getWorld().settlements)[0]!;
  const quest = makeQuest("deliver_item", targetSettlementId, "npc_giver", now);
  manager.replaceWorld({ ...manager.getWorld(), quests: { [quest.id]: quest } });
  const goldBefore = manager.getWorld().player.gold;

  await store().travelTo(targetSettlementId);

  assert.equal(store().manager!.getQuest("quest_ctrl")!.status, "completed");
  assert.equal(store().manager!.getWorld().player.gold, goldBefore + 40);
  assert.equal(store().manager!.getWorld().player.currentSettlementId, targetSettlementId);

  const reloaded = await worldRepository.loadAll();
  assert.equal(reloaded!.quests["quest_ctrl"]?.status, "completed");
  assert.equal(reloaded!.player.gold, goldBefore + 40);
  assert.equal(reloaded!.player.currentSettlementId, targetSettlementId);
});

test("travelling to the wrong settlement leaves a delivery quest active and persists that state", async () => {
  const manager = store().manager!;
  const now = manager.getWorld().currentDate;
  const ids = Object.keys(manager.getWorld().settlements);
  const target = ids[0]!;
  const wrong = ids[1] ?? ids[0]!;
  const injected = makeQuest("deliver_item", target, "npc_giver", now);
  manager.replaceWorld({ ...manager.getWorld(), quests: { [injected.id]: injected } });
  const goldBefore = manager.getWorld().player.gold;

  await store().travelTo(wrong);

  const quest = store().manager!.getQuest("quest_ctrl")!;
  assert.notEqual(quest.status, "completed");
  assert.equal(store().manager!.getWorld().player.gold, goldBefore); // no reward

  const reloaded = await worldRepository.loadAll();
  assert.notEqual(reloaded!.quests["quest_ctrl"]?.status, "completed");
});
