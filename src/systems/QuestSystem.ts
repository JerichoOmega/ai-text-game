import type {
  EntityId,
  ObjectiveType,
  PlayerCharacter,
  Quest,
  QuestReward,
  QuestStatus,
  WorldEvent,
} from "@/domain/types";
import type { WorldStateManager } from "./WorldStateManager";
import type { DispatchInput } from "./EventBus";
import { ReputationSystem } from "./ReputationSystem";

/**
 * The single authoritative home for quest *progression* logic — advancing
 * objectives, deciding when a quest is satisfied, and completing it exactly
 * once. QuestGenerator still owns quest *creation*; this owns everything
 * that happens to a quest after it exists.
 *
 * Deliberately holds NO reference to EventEngine or any repository: quest
 * completion emits its consequence purely through an injected `dispatch`
 * (the EventBus dispatch), so history recording and NPC memory happen via
 * the existing subscriber architecture rather than QuestSystem reaching
 * into those systems directly. This is also what keeps QuestSystem
 * unit-testable without the SQLite/Expo layer.
 */
export type QuestDispatch = (input: DispatchInput) => Promise<WorldEvent>;

/** Objective types a combat victory is allowed to advance. Both already
 * exist in the domain model; no new objective type is introduced. */
export const COMBAT_OBJECTIVE_TYPES: ReadonlySet<ObjectiveType> = new Set<ObjectiveType>([
  "clear_location",
  "defeat_target",
]);

const TERMINAL_STATUSES: ReadonlySet<QuestStatus> = new Set<QuestStatus>(["completed", "failed", "expired"]);

function grantReward(player: PlayerCharacter, reward: QuestReward): PlayerCharacter {
  return {
    ...player,
    gold: player.gold + reward.gold,
    inventoryItemIds: [...player.inventoryItemIds, ...reward.itemIds],
  };
}

/**
 * Reputation scope is read off existing quest metadata: a faction-scoped
 * reward (reward.factionId set) adjusts that faction's standing, otherwise
 * the delta applies to global standing. A reward with no reputation delta
 * produces no reputation change at all — we never fabricate one.
 */
function applyReputation(player: PlayerCharacter, reward: QuestReward): PlayerCharacter {
  if (reward.reputationDelta === 0) return player;
  if (reward.factionId) {
    return ReputationSystem.adjust(player, "faction", reward.factionId, reward.reputationDelta);
  }
  return ReputationSystem.adjust(player, "global", "global", reward.reputationDelta);
}

export const QuestSystem = {
  /**
   * Advances a single objective's progress and marks it complete when it
   * reaches its required quantity. Moves an "available" quest to "active"
   * on first progress. Pure world-state mutation — no reward, no event, no
   * completion side effects (that is checkAndCompleteQuest's job). Returns
   * the updated quest, or the unchanged quest if nothing applied.
   */
  advanceObjective(manager: WorldStateManager, questId: EntityId, objectiveId: EntityId, amount = 1): Quest | null {
    const quest = manager.getQuest(questId);
    if (!quest) return null;
    if (TERMINAL_STATUSES.has(quest.status)) return quest;

    let changed = false;
    const objectives = quest.objectives.map((objective) => {
      if (objective.id !== objectiveId || objective.complete) return objective;
      const progress = Math.min(objective.quantity, objective.progress + amount);
      changed = true;
      return { ...objective, progress, complete: progress >= objective.quantity };
    });
    if (!changed) return quest;

    const status: QuestStatus = quest.status === "available" ? "active" : quest.status;
    const updated: Quest = { ...quest, objectives, status };
    manager.setQuest(updated);
    return updated;
  },

  /** True when every objective on the quest is complete. */
  isSatisfied(quest: Quest): boolean {
    return quest.objectives.length > 0 && quest.objectives.every((o) => o.complete);
  },

  /**
   * The gate in front of the one completion path: if (and only if) every
   * objective is satisfied and the quest isn't already finished, complete
   * it. Objective state is authoritative — completion is derived from it,
   * never set independently by UI or anywhere else.
   */
  async checkAndCompleteQuest(manager: WorldStateManager, questId: EntityId, dispatch: QuestDispatch): Promise<Quest | null> {
    const quest = manager.getQuest(questId);
    if (!quest || TERMINAL_STATUSES.has(quest.status)) return null;
    if (!this.isSatisfied(quest)) return null;
    return this.completeQuest(manager, questId, dispatch);
  },

  /**
   * THE authoritative quest-completion path. Grants the reward, adjusts
   * reputation, flips the quest to "completed", and announces the
   * completion on the EventBus (which drives history + NPC memory through
   * their existing subscribers).
   *
   * Idempotent by design: an already-completed quest returns null before
   * any reward is granted, so a quest can never pay out twice.
   */
  async completeQuest(manager: WorldStateManager, questId: EntityId, dispatch: QuestDispatch): Promise<Quest | null> {
    const quest = manager.getQuest(questId);
    if (!quest) return null;
    if (quest.status === "completed") return null;

    const now = manager.getWorld().currentDate;

    // Reward + reputation are applied atomically with the status flip, all
    // on the same manager, before the completion event is dispatched.
    const rewarded = applyReputation(grantReward(manager.getWorld().player, quest.reward), quest.reward);
    manager.replaceWorld({ ...manager.getWorld(), player: rewarded });

    const completed: Quest = {
      ...quest,
      status: "completed",
      objectives: quest.objectives.map((o) => ({ ...o, progress: Math.max(o.progress, o.quantity), complete: true })),
    };
    manager.setQuest(completed);

    // giverNpcId first so the existing npcMemorySubscriber "quest_completed"
    // handler (reads affectedEntityIds[0]) records the giver's memory.
    await dispatch({
      type: "quest_completed",
      timestamp: now,
      description: `You completed "${quest.title}".`,
      affectedEntityIds: [quest.giverNpcId, quest.id],
      originatedFromPlayer: true,
    });

    return completed;
  },
};
