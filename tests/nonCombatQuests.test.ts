import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { WorldStateManager } from "@/systems/WorldStateManager";
import { QuestSystem } from "@/systems/QuestSystem";
import { eventBus } from "@/systems/EventBus";
import { registerQuestProgressSubscriber } from "@/systems/eventSubscribers/questProgressSubscriber";
import { registerHistorySubscriber } from "@/systems/eventSubscribers/historySubscriber";
import { registerNpcMemorySubscriber } from "@/systems/eventSubscribers/npcMemorySubscriber";
import { createId } from "@/utils/id";
import type { DispatchInput, EventContext } from "@/systems/EventBus";
import type { GameDate, ObjectiveType, Quest, QuestReward, WorldEvent, WorldEventType } from "@/domain/types";
import { makeTestPlayer, makeTestWorld } from "./testHelpers";

/**
 * P0-2 regression suite: non-combat quest objectives (talk_to_npc,
 * deliver_item) must advance and complete through the existing EventBus ->
 * questProgressSubscriber -> QuestSystem path, the same way combat objectives
 * do. Pure-logic layer, driven by a hand-built recursive dispatch exactly
 * like questLoop.test.ts (no SQLite needed).
 */

const DATE: GameDate = { year: 212, season: "spring", day: 1 };

function makeDispatch(manager: WorldStateManager) {
  const dispatch = async (input: DispatchInput): Promise<WorldEvent> => {
    const event: WorldEvent = {
      id: createId("evt"),
      type: input.type,
      timestamp: input.timestamp,
      description: input.description,
      affectedEntityIds: input.affectedEntityIds,
      causedByEventId: input.causedByEventId ?? null,
      originatedFromPlayer: input.originatedFromPlayer ?? false,
    };
    const ctx: EventContext = { manager, dispatch };
    await eventBus.emit(event, ctx);
    return event;
  };
  return dispatch;
}

/** Fires a single world event through the bus (reaching the quest-progress subscriber). */
async function fire(manager: WorldStateManager, type: WorldEventType, affectedEntityIds: string[]): Promise<void> {
  await makeDispatch(manager)({ type, timestamp: DATE, description: "", affectedEntityIds, originatedFromPlayer: true });
}

const REWARD: QuestReward = { gold: 50, reputationDelta: 5, factionId: null, itemIds: [] };

function objective(type: ObjectiveType, targetId: string, id = createId("obj")) {
  return { id, type, label: "do the thing", targetId, quantity: 1, progress: 0, complete: false };
}

function makeQuest(objectives: Quest["objectives"], reward: QuestReward = REWARD): Quest {
  return {
    id: "quest_1",
    templateId: "t",
    title: "Test Quest",
    contextSummary: "",
    giverNpcId: "npc_giver",
    originEventId: null,
    status: "available",
    objectives,
    reward,
    issuedOn: DATE,
    expiresOn: null,
  };
}

function worldWith(quest: Quest, playerGold = 10): WorldStateManager {
  return new WorldStateManager(
    makeTestWorld({ player: makeTestPlayer({ gold: playerGold }), quests: { [quest.id]: quest } })
  );
}

beforeEach(() => {
  eventBus.reset();
  registerQuestProgressSubscriber();
  registerHistorySubscriber();
  registerNpcMemorySubscriber();
});

// --- talk_to_npc ------------------------------------------------------------

test("talk_to_npc advances when the correct NPC is spoken to", async () => {
  const quest = makeQuest([objective("talk_to_npc", "npc_giver", "o_talk"), objective("defeat_target", "monster_1", "o_fight")]);
  const m = worldWith(quest);

  await fire(m, "player_talked_to_npc", ["npc_giver"]);

  const after = m.getQuest("quest_1")!;
  assert.equal(after.objectives.find((o) => o.id === "o_talk")!.complete, true);
  assert.equal(after.status, "active"); // second objective still open
});

test("talking to the wrong NPC does not advance a talk_to_npc objective", async () => {
  const quest = makeQuest([objective("talk_to_npc", "npc_giver", "o_talk")]);
  const m = worldWith(quest);

  await fire(m, "player_talked_to_npc", ["npc_someone_else"]);

  const after = m.getQuest("quest_1")!;
  assert.equal(after.objectives[0]!.progress, 0);
  assert.equal(after.objectives[0]!.complete, false);
  assert.equal(after.status, "available"); // untouched
});

test("completing the final talk_to_npc objective completes the quest and awards the reward", async () => {
  const quest = makeQuest([objective("talk_to_npc", "npc_giver", "o_talk")]);
  const m = worldWith(quest, 10);

  await fire(m, "player_talked_to_npc", ["npc_giver"]);

  const after = m.getQuest("quest_1")!;
  assert.equal(after.status, "completed");
  assert.equal(m.getWorld().player.gold, 60); // 10 + reward 50
  assert.equal(m.getWorld().player.reputations.find((r) => r.scope === "global")!.standing, 5);
});

// --- deliver_item -----------------------------------------------------------

test("deliver_item advances only when the player arrives at the target settlement", async () => {
  const quest = makeQuest([objective("deliver_item", "settlement_target", "o_deliver"), objective("defeat_target", "m1", "o_fight")]);
  const m = worldWith(quest);

  await fire(m, "player_arrived_at_settlement", ["settlement_target"]);

  const after = m.getQuest("quest_1")!;
  assert.equal(after.objectives.find((o) => o.id === "o_deliver")!.complete, true);
  assert.equal(after.status, "active");
});

test("arriving at an incorrect settlement does not advance a deliver_item objective", async () => {
  const quest = makeQuest([objective("deliver_item", "settlement_target", "o_deliver")]);
  const m = worldWith(quest);

  await fire(m, "player_arrived_at_settlement", ["settlement_wrong"]);

  const after = m.getQuest("quest_1")!;
  assert.equal(after.objectives[0]!.progress, 0);
  assert.equal(after.objectives[0]!.complete, false);
  assert.equal(after.status, "available");
});

test("completing the final delivery objective completes the quest and awards the reward", async () => {
  const quest = makeQuest([objective("deliver_item", "settlement_target", "o_deliver")], { gold: 30, reputationDelta: 8, factionId: null, itemIds: [] });
  const m = worldWith(quest, 5);

  await fire(m, "player_arrived_at_settlement", ["settlement_target"]);

  const after = m.getQuest("quest_1")!;
  assert.equal(after.status, "completed");
  assert.equal(m.getWorld().player.gold, 35); // 5 + reward 30
  assert.equal(m.getWorld().player.reputations.find((r) => r.scope === "global")!.standing, 8);
});

// --- regressions: combat path + reputation/history --------------------------

test("existing combat quest progression still works", async () => {
  const quest = makeQuest([objective("clear_location", "settlement_target", "o_clear")]);
  const m = worldWith(quest, 0);

  await fire(m, "bandit_leader_slain", ["settlement_target"]);

  const after = m.getQuest("quest_1")!;
  assert.equal(after.status, "completed");
  assert.equal(m.getWorld().player.gold, 50);
});

test("quest completion still records a history entry and reputation via existing subscribers", async () => {
  const quest = makeQuest([objective("talk_to_npc", "npc_giver", "o_talk")]);
  const m = worldWith(quest, 0);

  await fire(m, "player_talked_to_npc", ["npc_giver"]);

  // Reputation applied through QuestSystem/ReputationSystem.
  assert.equal(m.getWorld().player.reputations.find((r) => r.scope === "global")!.standing, 5);
  // History recorded through the wildcard history subscriber (quest_completed = personal).
  const personal = m.getWorld().history.filter((h) => h.category === "personal");
  assert.ok(personal.some((h) => h.headline.includes("Test Quest")), "expected a quest_completed history entry");
});

test("QuestSystem still exposes exactly one completion path (idempotent)", async () => {
  const quest = makeQuest([objective("talk_to_npc", "npc_giver", "o_talk")]);
  const m = worldWith(quest, 0);
  const dispatch = makeDispatch(m);

  await fire(m, "player_talked_to_npc", ["npc_giver"]);
  assert.equal(m.getWorld().player.gold, 50);

  // A second completion attempt must be a no-op (no double reward).
  const again = await QuestSystem.completeQuest(m, "quest_1", dispatch);
  assert.equal(again, null);
  assert.equal(m.getWorld().player.gold, 50);
});
