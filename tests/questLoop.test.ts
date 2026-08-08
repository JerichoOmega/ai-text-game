import { test } from "node:test";
import assert from "node:assert/strict";
import { WorldStateManager } from "../src/systems/WorldStateManager";
import { QuestGenerator } from "../src/systems/QuestGenerator";
import { QuestSystem } from "../src/systems/QuestSystem";
import { CombatSystem } from "../src/systems/CombatSystem";
import { eventBus } from "../src/systems/EventBus";
import { registerQuestProgressSubscriber } from "../src/systems/eventSubscribers/questProgressSubscriber";
import { registerNpcMemorySubscriber } from "../src/systems/eventSubscribers/npcMemorySubscriber";
import { createId } from "../src/utils/id";
import type { DispatchInput, EventContext } from "../src/systems/EventBus";
import type { GameDate, Quest, WorldEvent } from "../src/domain/types";
import { makeTestNpc, makeTestSettlement, makeTestWorld } from "./testHelpers";

/**
 * End-to-end tests for the core gameplay loop wiring:
 *   Combat -> Event -> Objective progress -> Completion -> Reward ->
 *   Reputation -> History event -> NPC memory.
 *
 * Everything here stays inside the pure-logic layer (systems/ + domain/)
 * and drives events through a hand-built dispatch, exactly like
 * eventBus.test.ts — the SQLite/Expo-backed EventEngine/HistoryLog write
 * path is not importable under plain node (documented environment limit),
 * so these test the connections at the same node-safe seam the rest of the
 * suite uses. The history assertion verifies the completion *event* is
 * emitted; the actual chronicle row write is exercised by the app runtime.
 */

const DATE: GameDate = { year: 212, season: "spring", day: 1 };

function toWorldEvent(input: DispatchInput): WorldEvent {
  return {
    id: createId("evt"),
    type: input.type,
    timestamp: input.timestamp,
    description: input.description,
    affectedEntityIds: input.affectedEntityIds,
    causedByEventId: input.causedByEventId ?? null,
    originatedFromPlayer: input.originatedFromPlayer ?? false,
  };
}

/** A recursive dispatch matching EventEngine's cascade shape, capturing
 * every dispatched input, so completeQuest's quest_completed event (and any
 * follow-ups) flow to the registered subscribers. */
function makeDispatch(manager: WorldStateManager, captured: DispatchInput[]) {
  const dispatch = async (input: DispatchInput): Promise<WorldEvent> => {
    captured.push(input);
    const event = toWorldEvent(input);
    const ctx: EventContext = { manager, dispatch };
    await eventBus.emit(event, ctx);
    return event;
  };
  return dispatch;
}

/** A world with one dangerous-road settlement + a quest-giver, and the
 * generator's real clear_roads combat quest registered on it. */
function makeCombatQuestWorld() {
  const settlement = makeTestSettlement("settlement_1", { name: "Millbrook", roadSafety: 20, prosperity: 60, population: 200 });
  const giver = makeTestNpc("npc_giver", { name: "Garrick", role: "innkeeper", settlementId: "settlement_1" });
  const manager = new WorldStateManager(
    makeTestWorld({
      currentDate: DATE,
      settlements: { [settlement.id]: settlement },
      npcs: { [giver.id]: giver },
    })
  );
  const generated = QuestGenerator.generateAvailableQuests(manager, DATE, 5);
  const quest = generated.find((q) => q.templateId === "clear_roads");
  assert.ok(quest, "expected the generator to produce a clear_roads combat quest");
  manager.setQuest(quest);
  return { manager, quest, settlement, giver };
}

function makeQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: "quest_x",
    templateId: "clear_roads",
    title: "Test Quest",
    contextSummary: "",
    giverNpcId: "npc_giver",
    originEventId: null,
    status: "active",
    objectives: [
      { id: "obj_1", type: "clear_location", label: "Clear the roads", targetId: "settlement_1", quantity: 1, progress: 0, complete: false },
    ],
    reward: { gold: 50, reputationDelta: 5, factionId: null, itemIds: [] },
    issuedOn: DATE,
    expiresOn: null,
    ...overrides,
  };
}

test("combat: an auto-resolved encounter produces a deterministic player victory", () => {
  const player = makeTestWorld().player;
  const { encounter } = CombatSystem.resolveAutoBattle(player);
  assert.equal(encounter.resolved, true);
  assert.equal(encounter.playerVictorious, true);
});

test("combat result advances the appropriate quest objective (via the event bus)", async () => {
  const { manager, quest, settlement } = makeCombatQuestWorld();
  eventBus.reset();
  registerQuestProgressSubscriber();

  const { encounter } = CombatSystem.resolveAutoBattle(manager.getWorld().player);
  const victory = CombatSystem.victoryEvent(encounter, { timestamp: DATE, locationIds: [settlement.id] });
  assert.ok(victory);

  const captured: DispatchInput[] = [];
  const dispatch = makeDispatch(manager, captured);
  await eventBus.emit(toWorldEvent(victory), { manager, dispatch });

  const objective = manager.getQuest(quest.id)!.objectives[0]!;
  assert.equal(objective.complete, true);
  assert.ok(objective.progress >= objective.quantity);
});

test("objective completion updates quest progress and moves an available quest to active", () => {
  const twoObjective = makeQuest({
    status: "available",
    objectives: [
      { id: "obj_1", type: "clear_location", label: "a", targetId: "settlement_1", quantity: 1, progress: 0, complete: false },
      { id: "obj_2", type: "defeat_target", label: "b", targetId: "monster_1", quantity: 2, progress: 0, complete: false },
    ],
  });
  const manager = new WorldStateManager(makeTestWorld({ quests: { [twoObjective.id]: twoObjective } }));

  QuestSystem.advanceObjective(manager, twoObjective.id, "obj_1", 1);
  const afterFirst = manager.getQuest(twoObjective.id)!;
  assert.equal(afterFirst.status, "active");
  assert.equal(afterFirst.objectives[0]!.complete, true);
  assert.equal(afterFirst.objectives[1]!.complete, false);
  assert.equal(QuestSystem.isSatisfied(afterFirst), false);

  QuestSystem.advanceObjective(manager, twoObjective.id, "obj_2", 1);
  const partial = manager.getQuest(twoObjective.id)!;
  assert.equal(partial.objectives[1]!.progress, 1);
  assert.equal(partial.objectives[1]!.complete, false, "quantity 2 objective isn't complete after a single advance");
});

test("completing the final objective completes the quest (one authoritative path)", async () => {
  const quest = makeQuest({
    objectives: [
      { id: "obj_1", type: "clear_location", label: "a", targetId: "settlement_1", quantity: 1, progress: 0, complete: false },
      { id: "obj_2", type: "defeat_target", label: "b", targetId: "monster_1", quantity: 1, progress: 0, complete: false },
    ],
  });
  const manager = new WorldStateManager(makeTestWorld({ quests: { [quest.id]: quest } }));
  eventBus.reset();
  const captured: DispatchInput[] = [];
  const dispatch = makeDispatch(manager, captured);

  QuestSystem.advanceObjective(manager, quest.id, "obj_1", 1);
  assert.equal((await QuestSystem.checkAndCompleteQuest(manager, quest.id, dispatch)), null, "not completed while one objective remains");
  assert.equal(manager.getQuest(quest.id)!.status, "active");

  QuestSystem.advanceObjective(manager, quest.id, "obj_2", 1);
  const completed = await QuestSystem.checkAndCompleteQuest(manager, quest.id, dispatch);
  assert.ok(completed);
  assert.equal(manager.getQuest(quest.id)!.status, "completed");
});

test("quest completion grants the existing reward (gold + items)", async () => {
  const quest = makeQuest({ reward: { gold: 75, reputationDelta: 0, factionId: null, itemIds: ["item_sword"] } });
  quest.objectives[0]!.complete = true;
  const manager = new WorldStateManager(makeTestWorld({ player: { ...makeTestWorld().player, gold: 20 }, quests: { [quest.id]: quest } }));
  eventBus.reset();
  const captured: DispatchInput[] = [];

  await QuestSystem.checkAndCompleteQuest(manager, quest.id, makeDispatch(manager, captured));

  assert.equal(manager.getWorld().player.gold, 95);
  assert.deepEqual(manager.getWorld().player.inventoryItemIds, ["item_sword"]);
});

test("quest completion adjusts reputation when the reward has a delta, and not otherwise", async () => {
  // With a delta -> global standing changes.
  const rewarding = makeQuest({ reward: { gold: 0, reputationDelta: 5, factionId: null, itemIds: [] } });
  rewarding.objectives[0]!.complete = true;
  const m1 = new WorldStateManager(makeTestWorld({ quests: { [rewarding.id]: rewarding } }));
  eventBus.reset();
  await QuestSystem.checkAndCompleteQuest(m1, rewarding.id, makeDispatch(m1, []));
  const globalRep = m1.getWorld().player.reputations.find((r) => r.scope === "global");
  assert.ok(globalRep);
  assert.equal(globalRep.standing, 5);

  // No delta -> no reputation entry fabricated.
  const flat = makeQuest({ id: "quest_flat", reward: { gold: 10, reputationDelta: 0, factionId: null, itemIds: [] } });
  flat.objectives[0]!.complete = true;
  const m2 = new WorldStateManager(makeTestWorld({ quests: { [flat.id]: flat } }));
  await QuestSystem.checkAndCompleteQuest(m2, flat.id, makeDispatch(m2, []));
  assert.equal(m2.getWorld().player.reputations.length, 0);
});

test("quest completion records the appropriate history event (dispatches quest_completed)", async () => {
  const quest = makeQuest();
  quest.objectives[0]!.complete = true;
  const manager = new WorldStateManager(makeTestWorld({ quests: { [quest.id]: quest } }));
  eventBus.reset();
  const captured: DispatchInput[] = [];

  await QuestSystem.checkAndCompleteQuest(manager, quest.id, makeDispatch(manager, captured));

  const completion = captured.find((e) => e.type === "quest_completed");
  assert.ok(completion, "a quest_completed event must be emitted for the history/memory architecture");
  assert.equal(completion.affectedEntityIds[0], "npc_giver");
  assert.ok(completion.description.includes(quest.title));
});

test("relevant NPC memory is created through the existing architecture on completion", async () => {
  const quest = makeQuest();
  quest.objectives[0]!.complete = true;
  const giver = makeTestNpc("npc_giver", { name: "Garrick" });
  const manager = new WorldStateManager(makeTestWorld({ npcs: { [giver.id]: giver }, quests: { [quest.id]: quest } }));

  eventBus.reset();
  registerNpcMemorySubscriber(); // real subscriber (node-safe)

  await QuestSystem.checkAndCompleteQuest(manager, quest.id, makeDispatch(manager, []));

  const memories = manager.getNpc("npc_giver")!.memories;
  assert.equal(memories.length, 1);
  assert.equal(memories[0]!.type, "quest_outcome");
});

test("an incomplete quest does not grant completion rewards", async () => {
  const quest = makeQuest(); // objective still incomplete
  const manager = new WorldStateManager(makeTestWorld({ player: { ...makeTestWorld().player, gold: 20 }, quests: { [quest.id]: quest } }));
  eventBus.reset();

  const result = await QuestSystem.checkAndCompleteQuest(manager, quest.id, makeDispatch(manager, []));
  assert.equal(result, null);
  assert.equal(manager.getQuest(quest.id)!.status, "active");
  assert.equal(manager.getWorld().player.gold, 20);
});

test("completing the same quest twice cannot duplicate rewards", async () => {
  const quest = makeQuest({ reward: { gold: 60, reputationDelta: 5, factionId: null, itemIds: ["item_a"] } });
  quest.objectives[0]!.complete = true;
  const manager = new WorldStateManager(makeTestWorld({ player: { ...makeTestWorld().player, gold: 0 }, quests: { [quest.id]: quest } }));
  eventBus.reset();

  const first = await QuestSystem.completeQuest(manager, quest.id, makeDispatch(manager, []));
  assert.ok(first);
  const second = await QuestSystem.completeQuest(manager, quest.id, makeDispatch(manager, []));
  assert.equal(second, null, "a second completion must be a no-op");

  assert.equal(manager.getWorld().player.gold, 60);
  assert.deepEqual(manager.getWorld().player.inventoryItemIds, ["item_a"]);
  assert.equal(manager.getWorld().player.reputations.find((r) => r.scope === "global")!.standing, 5);
});
