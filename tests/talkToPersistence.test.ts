import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { resetDb as resetWebDb } from "@/data/db.web";
import { useWorldStore } from "@/state/useWorldStore";
import { SaveManager } from "@/systems/SaveManager";
import { DialogueSystem } from "@/systems/DialogueSystem";
import { worldRepository } from "@/data/repositories/worldRepository";
import { eventBus } from "@/systems/EventBus";
import type { WorldState } from "@/domain/types";

/**
 * P1-3 regression suite: useWorldStore.talkTo must persist the conversation
 * (NPC memory + recomputed relationship) through the SAME transactional
 * boundary as every other authoritative mutation (runTransactionalWorldUpdate
 * -> SaveManager.save), rather than mutating `manager` in memory only. Drives
 * the real Zustand store over the web SQLite engine in Node via the
 * expo-sqlite test stub.
 */

function store() {
  return useWorldStore.getState();
}

function firstNpcId(): string {
  const world = store().world!;
  return Object.keys(world.npcs)[0]!;
}

beforeEach(async () => {
  await resetWebDb();
  eventBus.reset();
  useWorldStore.setState({
    world: null,
    manager: null,
    storyLog: [],
    lastError: null,
    lastSavedAt: null,
  });
  await store().initialize("Hero");
});

test("talkTo persists the conversation memory and it survives a save/reload", async () => {
  const npcId = firstNpcId();
  const before = store().manager!.getNpc(npcId)!;
  assert.equal(before.memories.length, 0);

  await store().talkTo(npcId);

  // Committed to the authoritative in-memory world.
  const after = store().manager!.getNpc(npcId)!;
  assert.equal(after.memories.length, 1);
  assert.equal(after.memories[0]?.type, "conversation");
  assert.equal(store().lastError, null);

  // Durable: a fresh load from the database still has it.
  const reloaded = await worldRepository.loadAll();
  assert.ok(reloaded);
  const reloadedNpc = reloaded.npcs[npcId];
  assert.ok(reloadedNpc);
  assert.equal(reloadedNpc.memories.length, 1);
  assert.equal(reloadedNpc.memories[0]?.type, "conversation");
  assert.equal(reloadedNpc.memories[0]?.summary, "Spoke with the player.");
});

test("talkTo persists the recomputed NPC relationship", async () => {
  const npcId = firstNpcId();
  assert.equal(store().manager!.getNpc(npcId)!.playerRelationship, 0);

  await store().talkTo(npcId);

  // One positive (sentiment 2) conversation memory -> relationship recomputes to 2.
  assert.equal(store().manager!.getNpc(npcId)!.playerRelationship, 2);

  const reloaded = await worldRepository.loadAll();
  assert.equal(reloaded!.npcs[npcId]?.playerRelationship, 2);
});

test("a failed save does not commit the conversation to the authoritative world", async () => {
  const npcId = firstNpcId();
  const memsBefore = store().manager!.getNpc(npcId)!.memories.length;
  const relBefore = store().manager!.getNpc(npcId)!.playerRelationship;

  const originalSave = SaveManager.save;
  SaveManager.save = (async (_w: WorldState) => {
    throw new Error("simulated disk write failure");
  }) as typeof SaveManager.save;

  try {
    await store().talkTo(npcId);
  } finally {
    SaveManager.save = originalSave;
  }

  // In-memory authoritative world is unchanged.
  const npc = store().manager!.getNpc(npcId)!;
  assert.equal(npc.memories.length, memsBefore);
  assert.equal(npc.playerRelationship, relBefore);
  assert.equal(store().lastError, "Couldn't save the conversation. Nothing changed.");

  // Nothing was persisted either.
  const reloaded = await worldRepository.loadAll();
  assert.equal(reloaded!.npcs[npcId]?.memories.length, memsBefore);
});

test("existing conversation behavior is unchanged: the greeting is logged verbatim", async () => {
  const npcId = firstNpcId();
  const npc = store().manager!.getNpc(npcId)!;
  const expectedLine = DialogueSystem.getGreeting(npc, store().world!);

  const logBefore = store().storyLog.length;
  await store().talkTo(npcId);

  const log = store().storyLog;
  assert.equal(log.length, logBefore + 1);
  assert.equal(log[log.length - 1], `${npc.name}: "${expectedLine}"`);
  // A neutral, memory-less seed NPC greets generically.
  assert.equal(expectedLine, "Hello, traveler.");
});

test("talking twice accumulates two persisted memories (no lost conversation)", async () => {
  const npcId = firstNpcId();

  await store().talkTo(npcId);
  await store().talkTo(npcId);

  assert.equal(store().manager!.getNpc(npcId)!.memories.length, 2);
  const reloaded = await worldRepository.loadAll();
  assert.equal(reloaded!.npcs[npcId]?.memories.length, 2);
});
