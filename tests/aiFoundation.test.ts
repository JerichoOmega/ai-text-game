import { test } from "node:test";
import assert from "node:assert/strict";

import { WorldStateManager } from "@/systems/WorldStateManager";
import { buildGmContext, CONTEXT_LIMITS } from "@/systems/ai/context/ContextBuilder";
import { isAllowedEntity } from "@/systems/ai/context/GmContext";
import { parseProposal, parseProposalBatch } from "@/systems/ai/contract/schema";
import { validateProposal, clampProposedSentiment } from "@/systems/ai/validation/ProposalValidator";
import { OfflineProvider } from "@/systems/ai/providers/OfflineProvider";
import { GameMaster } from "@/systems/ai/GameMaster";
import type { GmProposal, GmResult } from "@/systems/ai/contract/GmOutput";
import { makeTestNpc, makeTestSettlement, makeTestWorld } from "./testHelpers";

function val<T>(r: GmResult<T>): T {
  return r.ok ? r.value : r.fallback;
}

/**
 * Phase 3B-1: offline AI foundation. No network, no AI, no gameplay writes.
 * Proves the context is bounded and never leaks raw WorldState, the allow-list
 * is sound, forbidden proposals can't be accepted, malformed output fails
 * safely, the offline provider does no I/O, and the GameMaster runs entirely
 * on deterministic fallback with no configuration.
 */

function worldManager(npcCount = 3, questCount = 1): WorldStateManager {
  const settlement = makeTestSettlement("settlement_1", { name: "Eastbridge", prosperity: 65, roadSafety: 70 });
  const npcs: Record<string, ReturnType<typeof makeTestNpc>> = {};
  for (let i = 0; i < npcCount; i++) {
    const npc = makeTestNpc(`npc_${i}`, { name: `NPC ${i}`, settlementId: "settlement_1" });
    npcs[npc.id] = npc;
  }
  const quests: Record<string, any> = {};
  for (let i = 0; i < questCount; i++) {
    quests[`quest_${i}`] = {
      id: `quest_${i}`,
      templateId: "t",
      title: `Quest ${i}`,
      contextSummary: "",
      giverNpcId: "npc_0",
      originEventId: null,
      status: "active",
      objectives: [{ id: `obj_${i}`, type: "talk_to_npc", label: "talk", targetId: "npc_0", quantity: 1, progress: 0, complete: false }],
      reward: { gold: 10, reputationDelta: 0, factionId: null, itemIds: [] },
      issuedOn: { year: 1, season: "spring", day: 1 },
      expiresOn: null,
    };
  }
  return new WorldStateManager(makeTestWorld({ settlements: { settlement_1: settlement }, npcs, quests }));
}

test("ContextBuilder never exposes a raw WorldState (no live objects / save-critical fields)", () => {
  const ctx = buildGmContext(worldManager(), { kind: "scene" });
  assert.equal((ctx as unknown as Record<string, unknown>).world, undefined);
  const serialized = JSON.stringify(ctx);
  // Save-critical / raw fields must not leak into the AI-facing DTO.
  for (const leak of ["rngCursor", "saveVersion", "inventoryItemIds", "combatAbilityIds", "playerRelationship", "memories"]) {
    assert.ok(!serialized.includes(leak), `context leaked raw field "${leak}"`);
  }
  // Player numbers are banded, not exact.
  assert.equal(typeof ctx.shortTerm.player.health, "string");
});

test("ContextBuilder enforces item/count limits", () => {
  const m = worldManager(20, 12);
  const ctx = buildGmContext(m, { kind: "scene" });
  assert.ok(ctx.session.npcsPresent.length <= CONTEXT_LIMITS.npcsPresent);
  assert.ok(ctx.session.activeQuests.length <= CONTEXT_LIMITS.activeQuests);
  assert.ok(ctx.history.length <= CONTEXT_LIMITS.history);
  assert.ok(JSON.stringify(ctx).length <= CONTEXT_LIMITS.maxSerializedBytes);
});

test("allow-list contains only entities that exist in the world", () => {
  const m = worldManager(4, 2);
  const world = m.getWorld();
  const ctx = buildGmContext(m, { kind: "scene" });
  assert.ok(ctx.allowedEntityIds.length > 0);
  for (const id of ctx.allowedEntityIds) {
    const exists = !!world.npcs[id] || !!world.settlements[id] || !!world.quests[id];
    assert.ok(exists, `allow-list contained unknown id "${id}"`);
  }
});

test("unknown entity ids are rejected by the allow-list and the validator", () => {
  const ctx = buildGmContext(worldManager(), { kind: "scene" });
  assert.equal(isAllowedEntity(ctx, "totally_made_up"), false);
  const check = validateProposal(ctx, { kind: "record_memory", npcId: "totally_made_up", summary: "x", sentiment: 5 });
  assert.equal(check.valid, false);
});

test("valid proposals referencing allow-listed entities pass validation", () => {
  const ctx = buildGmContext(worldManager(), { kind: "scene" });
  const check = validateProposal(ctx, { kind: "adjust_relationship", npcId: "npc_0", direction: "up", magnitude: "small", reason: "helped" });
  assert.equal(check.valid, true);
});

test("forbidden proposal kinds cannot be represented/accepted", () => {
  for (const kind of ["set_hp", "give_gold", "grant_xp", "spawn_item", "kill_npc", "destroy_settlement", "set_time"]) {
    assert.equal(parseProposal({ kind, value: 999 }), null, `forbidden proposal kind "${kind}" was accepted`);
  }
});

test("malformed provider output fails safely (returns null, drops bad proposals)", () => {
  assert.equal(parseProposalBatch("not json at all"), null);
  assert.equal(parseProposalBatch(JSON.stringify({ proposals: [] })), null); // missing schemaVersion
  const batch = parseProposalBatch(
    JSON.stringify({
      schemaVersion: 1,
      narrative: "ok",
      proposals: [
        { kind: "spawn_rumor", text: "a whisper" }, // valid
        { kind: "set_hp", value: 1 }, // forbidden -> dropped
        { kind: "adjust_relationship", npcId: "npc_0" }, // incomplete -> dropped
      ],
    })
  );
  assert.ok(batch);
  assert.equal(batch.proposals.length, 1);
  assert.equal(batch.proposals[0]?.kind, "spawn_rumor");
});

test("clampProposedSentiment bounds AI-proposed sentiment", () => {
  assert.equal(clampProposedSentiment(9999), 100);
  assert.equal(clampProposedSentiment(-9999), -100);
  assert.equal(clampProposedSentiment(3.6), 4);
});

test("OfflineProvider is configured but performs no network work (signals fallback)", async () => {
  const provider = new OfflineProvider();
  assert.equal(provider.isConfigured(), true);
  const res = await provider.complete({ operation: "narrate", system: "", user: "", expectJson: false });
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.reason, "unconfigured");
});

test("GameMaster runs with no AI configuration and returns deterministic fallback", async () => {
  const gm = new GameMaster(new OfflineProvider());

  const narration = await gm.narrate({ context: buildGmContext(worldManager(), { kind: "scene" }) });
  assert.equal(narration.ok, false);
  const narr = val(narration);
  assert.ok(narr.narrative.includes("Eastbridge"));

  const dialogue = await gm.converse({ context: buildGmContext(worldManager(), { kind: "npc", npcId: "npc_0" }), npcId: "npc_0" });
  const d = val(dialogue);
  assert.equal(d.speakerNpcId, "npc_0");
  assert.deepEqual(d.proposals, []);

  const quest = await gm.proposeQuest({ context: buildGmContext(worldManager(), { kind: "scene" }) });
  const q = val(quest);
  assert.deepEqual(q.proposals, []);
});

test("GameMaster is effect-free: building context + calling it does not change the world", async () => {
  const m = worldManager(3, 1);
  const before = JSON.stringify(m.getWorld());
  const gm = new GameMaster(new OfflineProvider());
  await gm.narrate({ context: buildGmContext(m, { kind: "scene" }) });
  await gm.reactToPlayerAction({ context: buildGmContext(m, { kind: "scene" }), actionText: "look around" });
  assert.equal(JSON.stringify(m.getWorld()), before);
});

// keeps the unused import meaningful for the type-checker
const _typecheckProposal: GmProposal = { kind: "spawn_rumor", text: "x" };
void _typecheckProposal;
