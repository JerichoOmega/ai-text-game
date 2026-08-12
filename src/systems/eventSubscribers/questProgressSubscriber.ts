import type { EventContext } from "../EventBus";
import type { ObjectiveType, WorldEvent } from "@/domain/types";
import { eventBus } from "../EventBus";
import { QuestSystem, COMBAT_OBJECTIVE_TYPES } from "../QuestSystem";

/**
 * Turns player-driven world events into quest objective progress, then lets
 * QuestSystem decide (authoritatively) whether the quest is now complete.
 * This is the "Player action -> Event -> Quest Objective Progress -> Quest
 * Completion" seam, kept on the EventBus so gameplay systems never call each
 * other directly.
 *
 * Three event->objective mappings, all matched by target id against the
 * event's affected entities, using objective types that already exist in the
 * domain model (no new objective type is introduced):
 *   - combat victory      -> clear_location / defeat_target
 *   - talked to an NPC     -> talk_to_npc  (target = the NPC)
 *   - arrived at settlement -> deliver_item (target = the destination)
 * Completion — reward, reputation, history and the quest_completed event —
 * all flow through the single existing QuestSystem path unchanged.
 */
const SOCIAL_OBJECTIVE_TYPES: ReadonlySet<ObjectiveType> = new Set<ObjectiveType>(["talk_to_npc"]);
const DELIVERY_OBJECTIVE_TYPES: ReadonlySet<ObjectiveType> = new Set<ObjectiveType>(["deliver_item"]);

export function registerQuestProgressSubscriber(): void {
  eventBus.on("bandit_leader_slain", advanceObjectivesOfTypes(COMBAT_OBJECTIVE_TYPES));
  eventBus.on("dungeon_cleared", advanceObjectivesOfTypes(COMBAT_OBJECTIVE_TYPES));
  eventBus.on("player_talked_to_npc", advanceObjectivesOfTypes(SOCIAL_OBJECTIVE_TYPES));
  eventBus.on("player_arrived_at_settlement", advanceObjectivesOfTypes(DELIVERY_OBJECTIVE_TYPES));
}

/**
 * Builds a handler that advances every incomplete objective of the given
 * types whose target was involved in the event, then completes the quest if
 * that satisfied it. Identical in shape to the original combat-only handler,
 * generalized over the allowed objective types.
 */
function advanceObjectivesOfTypes(types: ReadonlySet<ObjectiveType>) {
  return async (event: WorldEvent, ctx: EventContext): Promise<void> => {
    const affected = new Set(event.affectedEntityIds);
    const quests = Object.values(ctx.manager.getWorld().quests);

    for (const quest of quests) {
      if (quest.status === "completed" || quest.status === "failed" || quest.status === "expired") continue;

      let advancedAny = false;
      for (const objective of quest.objectives) {
        if (objective.complete) continue;
        if (!types.has(objective.type)) continue;
        // A targeted objective only advances when its target was involved;
        // an untargeted objective advances on any relevant event.
        if (objective.targetId !== null && !affected.has(objective.targetId)) continue;
        QuestSystem.advanceObjective(ctx.manager, quest.id, objective.id, 1);
        advancedAny = true;
      }

      if (advancedAny) {
        await QuestSystem.checkAndCompleteQuest(ctx.manager, quest.id, ctx.dispatch);
      }
    }
  };
}
