import { test } from "node:test";
import assert from "node:assert/strict";

import { WorldStateManager } from "@/systems/WorldStateManager";
import { DialogueSystem } from "@/systems/DialogueSystem";
import { QuestGenerator } from "@/systems/QuestGenerator";
import { generateRumorFromEvent, rumorFeed } from "@/systems/RumorSystem";
import { GameMaster } from "@/systems/ai/GameMaster";
import { OfflineProvider } from "@/systems/ai/providers/OfflineProvider";
import type { AIProvider, ProviderRequest, ProviderResponse } from "@/systems/ai/providers/AIProvider";
import { AI_ENABLED, DEFAULT_AI_CONFIG, isAiEnabled } from "@/systems/ai/aiConfig";
import { NarrativeDialogue } from "@/systems/ai/narrative/NarrativeDialogue";
import { QuestOffers } from "@/systems/ai/narrative/QuestOffers";
import { Rumors } from "@/systems/ai/narrative/Rumors";
import type { GameDate, WorldEvent } from "@/domain/types";
import { makeTestNpc, makeTestSettlement, makeTestWorld } from "./testHelpers";

/**
 * Phase 3B-2: deterministic AI wrappers with AI OFF by default. Proves each
 * wrapper delegates to its existing deterministic system, produces identical
 * output to the pre-AI build, never mutates WorldState by generating content,
 * never touches a provider while disabled, and that the flag defaults off.
 */

const NOW: GameDate = { year: 1, season: "spring", day: 1 };

/** Records every provider call so a test can assert zero network work. */
class SpyProvider implements AIProvider {
  readonly id = "spy";
  calls = 0;
  isConfigured(): boolean {
    return true;
  }
  async complete(_req: ProviderRequest): Promise<ProviderResponse> {
    this.calls += 1;
    return { ok: false, reason: "unconfigured" };
  }
}

function questWorld(): WorldStateManager {
  // roadSafety < 50 guarantees a deterministic clear_roads quest.
  const settlement = makeTestSettlement("settlement_1", { name: "Ashford", roadSafety: 20 });
  const npc = makeTestNpc("npc_0", { name: "Aldric", role: "innkeeper", settlementId: "settlement_1" });
  return new WorldStateManager(
    makeTestWorld({ settlements: { settlement_1: settlement }, npcs: { npc_0: npc } })
  );
}

function npcWorld(): WorldStateManager {
  const settlement = makeTestSettlement("settlement_1", { name: "Ashford" });
  const npc = makeTestNpc("npc_0", { name: "Aldric", settlementId: "settlement_1", playerRelationship: 0 });
  return new WorldStateManager(
    makeTestWorld({ settlements: { settlement_1: settlement }, npcs: { npc_0: npc } })
  );
}

function banditEvent(): WorldEvent {
  return {
    id: "evt_1",
    type: "bandit_leader_slain",
    timestamp: NOW,
    description: "The Blackfen bandits scattered when their captain fell.",
    affectedEntityIds: [],
    causedByEventId: null,
    originatedFromPlayer: true,
  };
}

test("AI is disabled by default", () => {
  assert.equal(AI_ENABLED, false);
  assert.equal(DEFAULT_AI_CONFIG.enabled, false);
  assert.equal(isAiEnabled(), false);
  assert.equal(isAiEnabled(undefined), false);
});

test("NarrativeDialogue (AI off) returns exactly the deterministic greeting", async () => {
  const m = npcWorld();
  const npc = m.getWorld().npcs.npc_0!;
  const wrapper = new NarrativeDialogue(); // default config = off
  const res = await wrapper.getGreeting(npc, m);
  assert.equal(res.source, "deterministic");
  assert.equal(res.line, DialogueSystem.getGreeting(npc, m.getWorld()));
});

test("NarrativeDialogue delegates responses/replies to DialogueSystem verbatim", () => {
  const m = npcWorld();
  const npc = m.getWorld().npcs.npc_0!;
  const wrapper = new NarrativeDialogue();
  assert.deepEqual(wrapper.getResponses(npc, m), DialogueSystem.getResponses(npc, m.getWorld()));
  assert.equal(wrapper.getReply(npc, m, "news"), DialogueSystem.getReply(npc, m.getWorld(), "news"));
});

test("NarrativeDialogue never consults a provider while AI is off", async () => {
  const m = npcWorld();
  const npc = m.getWorld().npcs.npc_0!;
  const spy = new SpyProvider();
  const wrapper = new NarrativeDialogue(DEFAULT_AI_CONFIG, new GameMaster(spy));
  await wrapper.getGreeting(npc, m);
  assert.equal(spy.calls, 0);
});

test("NarrativeDialogue still returns deterministic line even with AI enabled + offline GameMaster", async () => {
  const m = npcWorld();
  const npc = m.getWorld().npcs.npc_0!;
  const wrapper = new NarrativeDialogue({ enabled: true }, new GameMaster(new OfflineProvider()));
  const res = await wrapper.getGreeting(npc, m);
  assert.equal(res.source, "deterministic");
  assert.equal(res.line, DialogueSystem.getGreeting(npc, m.getWorld()));
});

test("QuestOffers (AI off) produces the deterministic generator's quests", async () => {
  const m = questWorld();
  const wrapper = new QuestOffers();
  const res = await wrapper.generate(m, NOW);
  assert.equal(res.source, "deterministic");
  assert.ok(res.quests.length >= 1);
  // Matches what QuestGenerator itself would produce (templateIds/targets/rewards).
  const direct = QuestGenerator.generateAvailableQuests(m, NOW);
  assert.deepEqual(
    res.quests.map((q) => q.templateId),
    direct.map((q) => q.templateId)
  );
  assert.equal(res.quests[0]!.templateId, "clear_roads");
});

test("QuestOffers does not mutate the world when generating offers", async () => {
  const m = questWorld();
  const before = JSON.stringify(m.getWorld());
  await new QuestOffers().generate(m, NOW);
  assert.equal(JSON.stringify(m.getWorld()), before);
});

test("QuestOffers never consults a provider while AI is off", async () => {
  const m = questWorld();
  const spy = new SpyProvider();
  await new QuestOffers(DEFAULT_AI_CONFIG, new GameMaster(spy)).generate(m, NOW);
  assert.equal(spy.calls, 0);
});

test("Rumors.fromEvent (AI off) reproduces RumorSystem behavior exactly", () => {
  const event = banditEvent();

  rumorFeed.clear();
  new Rumors().fromEvent(event, 5);
  const viaWrapper = new Rumors().getRecent(10).map((r) => r.text);

  rumorFeed.clear();
  generateRumorFromEvent(event, 5);
  const direct = rumorFeed.getRecent(10).map((r) => r.text);

  assert.deepEqual(viaWrapper, direct);
  assert.equal(viaWrapper.length, 1);

  rumorFeed.clear();
});

test("Rumors.ambientRumor returns null (adds nothing) while AI is off", async () => {
  rumorFeed.clear();
  const m = npcWorld();
  const spy = new SpyProvider();
  const rumors = new Rumors(DEFAULT_AI_CONFIG, new GameMaster(spy));
  const result = await rumors.ambientRumor(m);
  assert.equal(result, null);
  assert.equal(spy.calls, 0);
  assert.equal(rumorFeed.getRecent(10).length, 0);
});
