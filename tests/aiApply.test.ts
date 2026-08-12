import { test } from "node:test";
import assert from "node:assert/strict";

import { WorldStateManager } from "@/systems/WorldStateManager";
import { buildGmContext } from "@/systems/ai/context/ContextBuilder";
import { GM_OUTPUT_SCHEMA_VERSION, type GmProposalBatch } from "@/systems/ai/contract/GmOutput";
import { applyGmProposals } from "@/systems/ai/apply/applyProposals";
import { rumorFeed } from "@/systems/RumorSystem";
import type { GameDate } from "@/domain/types";
import { makeTestNpc, makeTestSettlement, makeTestWorld } from "./testHelpers";

/**
 * Phase 3C-1: the single authoritative apply choke point. Proves proposals are
 * validated + clamped and only reach gameplay via WorldTransaction + persist,
 * that authority-sensitive kinds are not applied, and that a failed persist
 * leaves authoritative state unchanged.
 */

const NOW: GameDate = { year: 1, season: "spring", day: 1 };

function setup() {
  const settlement = makeTestSettlement("settlement_1", { name: "Eastbridge" });
  const npc = makeTestNpc("npc_0", { name: "Elara", settlementId: "settlement_1", playerRelationship: 0, memories: [] });
  const manager = new WorldStateManager(makeTestWorld({ settlements: { settlement_1: settlement }, npcs: { npc_0: npc } }));
  const context = buildGmContext(manager, { kind: "scene" });
  return { manager, context };
}

function batch(proposals: GmProposalBatch["proposals"]): GmProposalBatch {
  return { schemaVersion: GM_OUTPUT_SCHEMA_VERSION, proposals };
}

const okPersist = async () => {};
const failPersist = async () => {
  throw new Error("disk full");
};

test("record_memory is applied with a clamped sentiment and persisted", async () => {
  const { manager, context } = setup();
  const report = await applyGmProposals(
    manager,
    context,
    batch([{ kind: "record_memory", npcId: "npc_0", summary: "Helped me greatly", sentiment: 9999 }]),
    NOW,
    okPersist
  );
  assert.equal(report.committed, true);
  assert.equal(report.applied.length, 1);
  const npc = manager.getWorld().npcs.npc_0!;
  assert.equal(npc.memories.length, 1);
  assert.equal(npc.memories[0]!.sentiment, 100); // clamped from 9999
  assert.ok(npc.playerRelationship > 0);
});

test("adjust_relationship nudges the derived relationship in the given direction", async () => {
  const { manager, context } = setup();
  const report = await applyGmProposals(
    manager,
    context,
    batch([{ kind: "adjust_relationship", npcId: "npc_0", direction: "up", magnitude: "large", reason: "saved the town" }]),
    NOW,
    okPersist
  );
  assert.equal(report.committed, true);
  assert.ok(manager.getWorld().npcs.npc_0!.playerRelationship > 0);
});

test("proposals referencing a disallowed entity are skipped, never applied", async () => {
  const { manager, context } = setup();
  const report = await applyGmProposals(
    manager,
    context,
    batch([{ kind: "record_memory", npcId: "ghost_npc", summary: "x", sentiment: 5 }]),
    NOW,
    okPersist
  );
  assert.equal(report.committed, false);
  assert.equal(report.applied.length, 0);
  assert.equal(report.skipped.length, 1);
  assert.equal(manager.getWorld().npcs.npc_0!.memories.length, 0);
});

test("offer_quest and advance_quest_objective are validated but NOT applied (AI cannot author/complete quests)", async () => {
  const { manager, context } = setup();
  const report = await applyGmProposals(
    manager,
    context,
    batch([
      { kind: "offer_quest", templateHint: "bandits", rewardTier: "small", rationale: "roads unsafe" },
      { kind: "advance_quest_objective", questId: "npc_0", objectiveId: "obj_1" },
    ]),
    NOW,
    okPersist
  );
  assert.equal(report.committed, false);
  assert.equal(report.applied.length, 0);
  assert.equal(report.skipped.length, 2);
  assert.equal(Object.keys(manager.getWorld().quests).length, 0);
});

test("spawn_rumor is added to the rumor feed after commit", async () => {
  rumorFeed.clear();
  const { manager, context } = setup();
  const report = await applyGmProposals(
    manager,
    context,
    batch([{ kind: "spawn_rumor", text: "Strangers were seen at the north gate." }]),
    NOW,
    okPersist
  );
  assert.equal(report.committed, true);
  const recent = rumorFeed.getRecent(5).map((r) => r.text);
  assert.deepEqual(recent, ["Strangers were seen at the north gate."]);
  rumorFeed.clear();
});

test("a failed persist leaves authoritative state byte-for-byte unchanged", async () => {
  const { manager, context } = setup();
  const before = JSON.stringify(manager.getWorld());
  const report = await applyGmProposals(
    manager,
    context,
    batch([{ kind: "record_memory", npcId: "npc_0", summary: "should not persist", sentiment: 50 }]),
    NOW,
    failPersist
  );
  assert.equal(report.committed, false);
  assert.equal(report.stage, "persist");
  assert.equal(JSON.stringify(manager.getWorld()), before);
  assert.equal(manager.getWorld().npcs.npc_0!.memories.length, 0);
});
