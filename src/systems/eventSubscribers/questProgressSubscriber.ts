import type { EventContext } from "../EventBus";
import type { WorldEvent } from "@/domain/types";
import { eventBus } from "../EventBus";
import { QuestSystem, COMBAT_OBJECTIVE_TYPES } from "../QuestSystem";

/**
 * Turns combat-victory world events into quest objective progress, then
 * lets QuestSystem decide (authoritatively) whether the quest is now
 * complete. This is the "Combat Result -> Event -> Quest Objective
 * Progress -> Quest Completion" seam, kept on the EventBus so CombatEngine
 * and QuestSystem never call each other directly.
 *
 * It only advances objective types the domain model already has for combat
 * (clear_location / defeat_target), matched by target id against the
 * event's affected entities.
 */
export function registerQuestProgressSubscriber(): void {
  eventBus.on("bandit_leader_slain", advanceCombatObjectives);
  eventBus.on("dungeon_cleared", advanceCombatObjectives);
}

async function advanceCombatObjectives(event: WorldEvent, ctx: EventContext): Promise<void> {
  const affected = new Set(event.affectedEntityIds);
  const quests = Object.values(ctx.manager.getWorld().quests);

  for (const quest of quests) {
    if (quest.status === "completed" || quest.status === "failed" || quest.status === "expired") continue;

    let advancedAny = false;
    for (const objective of quest.objectives) {
      if (objective.complete) continue;
      if (!COMBAT_OBJECTIVE_TYPES.has(objective.type)) continue;
      // A targeted objective only advances when its target was involved;
      // an untargeted combat objective advances on any relevant victory.
      if (objective.targetId !== null && !affected.has(objective.targetId)) continue;
      QuestSystem.advanceObjective(ctx.manager, quest.id, objective.id, 1);
      advancedAny = true;
    }

    if (advancedAny) {
      await QuestSystem.checkAndCompleteQuest(ctx.manager, quest.id, ctx.dispatch);
    }
  }
}
