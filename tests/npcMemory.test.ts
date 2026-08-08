import { test } from "node:test";
import assert from "node:assert/strict";
import { WorldStateManager } from "../src/systems/WorldStateManager";
import { NPCMemorySystem } from "../src/systems/NPCMemorySystem";
import type { GameDate, NPC } from "../src/domain/types";
import { makeTestNpc, makeTestWorld } from "./testHelpers";

function makeTestManager(npc: NPC): WorldStateManager {
  return new WorldStateManager(makeTestWorld({ npcs: { [npc.id]: npc } }));
}

test("a positive memory raises relationship above neutral", () => {
  const npc = makeTestNpc("npc_1");
  const manager = makeTestManager(npc);
  manager.setNpc(npc);

  NPCMemorySystem.remember(manager, npc.id, {
    type: "favor_received",
    summary: "Helped with the harvest.",
    timestamp: { year: 1, season: "spring", day: 1 },
    sentiment: 40,
  });

  const updated = manager.getNpc(npc.id)!;
  assert.ok(updated.playerRelationship > 0);
});

test("a minor memory's influence fades toward neutral over time, a major one does not", () => {
  const npc = makeTestNpc("npc_2");
  const manager = makeTestManager(npc);
  manager.setNpc(npc);

  NPCMemorySystem.remember(manager, npc.id, {
    type: "conversation", // minor
    summary: "Made small talk.",
    timestamp: { year: 1, season: "spring", day: 1 },
    sentiment: 30,
  });

  // Push a much-later, neutral memory to force relationship recompute at a
  // far-future date and confirm the old minor memory has decayed toward
  // negligible influence (weight < the decay threshold used internally).
  const farFuture: GameDate = { year: 20, season: "spring", day: 1 };
  NPCMemorySystem.remember(manager, npc.id, {
    type: "conversation",
    summary: "Nodded in passing.",
    timestamp: farFuture,
    sentiment: 0,
  });

  const afterMinorDecay = manager.getNpc(npc.id)!;
  const oldMinorMemory = afterMinorDecay.memories.find((m) => m.summary === "Made small talk.")!;
  assert.equal(oldMinorMemory.decayed, true);

  // Now do the same with a major (world_event_witnessed) memory and confirm
  // it is NOT flagged decayed even after the same span of time.
  const npc2 = makeTestNpc("npc_3");
  const manager2 = makeTestManager(npc2);
  manager2.setNpc(npc2);

  NPCMemorySystem.remember(manager2, npc2.id, {
    type: "world_event_witnessed",
    summary: "Watched the kingdom go to war.",
    timestamp: { year: 1, season: "spring", day: 1 },
    sentiment: -50,
  });
  NPCMemorySystem.remember(manager2, npc2.id, {
    type: "conversation",
    summary: "Nodded in passing.",
    timestamp: farFuture,
    sentiment: 0,
  });

  const afterMajorCheck = manager2.getNpc(npc2.id)!;
  const majorMemory = afterMajorCheck.memories.find((m) => m.summary === "Watched the kingdom go to war.")!;
  assert.equal(majorMemory.decayed, false);
});

test("getProminentMemories sorts non-decayed memories ahead of decayed ones", () => {
  const npc = makeTestNpc("npc_4");
  const manager = makeTestManager(npc);
  manager.setNpc(npc);

  NPCMemorySystem.remember(manager, npc.id, {
    type: "conversation",
    summary: "Old small talk.",
    timestamp: { year: 1, season: "spring", day: 1 },
    sentiment: 5,
  });
  NPCMemorySystem.remember(manager, npc.id, {
    type: "favor_received",
    summary: "Recent big favor.",
    timestamp: { year: 20, season: "spring", day: 1 },
    sentiment: 90,
  });

  const updated = manager.getNpc(npc.id)!;
  const prominent = NPCMemorySystem.getProminentMemories(updated, 2);
  assert.equal(prominent[0]?.summary, "Recent big favor.");
});
