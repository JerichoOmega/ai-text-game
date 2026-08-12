import { test } from "node:test";
import assert from "node:assert/strict";

import { resolveQuestAffordance } from "@/presentation/quests/questAffordance";
import type { GameDate, ObjectiveType, Quest, WorldState } from "@/domain/types";
import { makeTestNpc, makeTestSettlement, makeTestWorld } from "./testHelpers";

/**
 * Unit tests for the pure quest-card affordance resolver — the logic the
 * quests screen renders from. RN-free, so testable without a renderer.
 * Verifies which action a talk_to_npc / deliver_item / combat quest shows,
 * without touching the underlying quest/event logic.
 */

const DATE: GameDate = { year: 212, season: "spring", day: 1 };

function quest(type: ObjectiveType, targetId: string | null, complete = false): Quest {
  return {
    id: "q1",
    templateId: "t",
    title: "Q",
    contextSummary: "",
    giverNpcId: "npc_giver",
    originEventId: null,
    status: "active",
    objectives: [{ id: "o1", type, label: "l", targetId, quantity: 1, progress: complete ? 1 : 0, complete }],
    reward: { gold: 10, reputationDelta: 0, factionId: null, itemIds: [] },
    issuedOn: DATE,
    expiresOn: null,
  };
}

/** World where the player is in `here`, with the given settlements and npcs. */
function world(overrides: Partial<WorldState> = {}): WorldState {
  return makeTestWorld({ ...overrides });
}

test("combat objective resolves to the combat affordance (preserving the battle button)", () => {
  const a = resolveQuestAffordance(quest("clear_location", "settlement_1"), world());
  assert.equal(a.kind, "combat");
});

test("talk_to_npc resolves to a talk affordance, marking the NPC as here when co-located", () => {
  const npc = makeTestNpc("npc_giver", { name: "Garrick", settlementId: "settlement_1" });
  const w = world({ npcs: { [npc.id]: npc }, settlements: { settlement_1: makeTestSettlement("settlement_1", { name: "Eastbridge" }) } });
  const a = resolveQuestAffordance(quest("talk_to_npc", "npc_giver"), w);
  assert.equal(a.kind, "talk");
  if (a.kind === "talk") {
    assert.equal(a.npcId, "npc_giver");
    assert.equal(a.npcName, "Garrick");
    assert.equal(a.npcHere, true);
  }
});

test("talk_to_npc marks the NPC as elsewhere and names their settlement", () => {
  const npc = makeTestNpc("npc_giver", { name: "Garrick", settlementId: "settlement_far" });
  const w = world({
    npcs: { [npc.id]: npc },
    settlements: { settlement_far: makeTestSettlement("settlement_far", { name: "Stoneford" }) },
    // player defaults to settlement_1 (not where the npc is)
  });
  const a = resolveQuestAffordance(quest("talk_to_npc", "npc_giver"), w);
  assert.equal(a.kind, "talk");
  if (a.kind === "talk") {
    assert.equal(a.npcHere, false);
    assert.equal(a.npcSettlementId, "settlement_far");
    assert.equal(a.npcSettlementName, "Stoneford");
  }
});

test("talk_to_npc with a missing or dead NPC resolves to none", () => {
  assert.equal(resolveQuestAffordance(quest("talk_to_npc", "ghost"), world()).kind, "none");
  const dead = makeTestNpc("npc_giver", { alive: false });
  const w = world({ npcs: { [dead.id]: dead } });
  assert.equal(resolveQuestAffordance(quest("talk_to_npc", "npc_giver"), w).kind, "none");
});

test("deliver_item resolves to a deliver affordance, atDestination false when the player is elsewhere", () => {
  const w = world({ settlements: { settlement_target: makeTestSettlement("settlement_target", { name: "Millbrook" }) } });
  const a = resolveQuestAffordance(quest("deliver_item", "settlement_target"), w);
  assert.equal(a.kind, "deliver");
  if (a.kind === "deliver") {
    assert.equal(a.settlementId, "settlement_target");
    assert.equal(a.settlementName, "Millbrook");
    assert.equal(a.atDestination, false);
  }
});

test("deliver_item marks atDestination true when the player is already at the destination", () => {
  const w = world({
    player: { ...makeTestWorld().player, currentSettlementId: "settlement_target" },
    settlements: { settlement_target: makeTestSettlement("settlement_target", { name: "Millbrook" }) },
  });
  const a = resolveQuestAffordance(quest("deliver_item", "settlement_target"), w);
  assert.equal(a.kind, "deliver");
  if (a.kind === "deliver") assert.equal(a.atDestination, true);
});

test("deliver_item to a missing or destroyed settlement resolves to none", () => {
  assert.equal(resolveQuestAffordance(quest("deliver_item", "nowhere"), world()).kind, "none");
  const gone = makeTestSettlement("settlement_target", { destroyed: true });
  const w = world({ settlements: { settlement_target: gone } });
  assert.equal(resolveQuestAffordance(quest("deliver_item", "settlement_target"), w).kind, "none");
});

test("a fully-complete quest resolves to none", () => {
  assert.equal(resolveQuestAffordance(quest("talk_to_npc", "npc_giver", true), world()).kind, "none");
});

test("combat takes precedence when a quest has both an incomplete combat and talk objective", () => {
  const q = quest("clear_location", "settlement_1");
  q.objectives.push({ id: "o2", type: "talk_to_npc", label: "l", targetId: "npc_giver", quantity: 1, progress: 0, complete: false });
  assert.equal(resolveQuestAffordance(q, world()).kind, "combat");
});
