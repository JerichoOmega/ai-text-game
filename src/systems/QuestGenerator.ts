import type { GameDate, NPC, Quest, QuestReward, Settlement } from "@/domain/types";
import { createId } from "@/utils/id";
import type { WorldStateManager } from "./WorldStateManager";

interface GenerationContext {
  manager: WorldStateManager;
  now: GameDate;
}

interface TemplateMatch {
  templateId: string;
  title: string;
  contextSummary: string;
  giverNpcId: string;
  category: "combat" | "delivery" | "social" | "exploration";
  reward: QuestReward;
  targetSettlementId: string;
  /** Imperative-form text for the single objective this template produces. */
  objectiveLabel: string;
}

/**
 * Each generator function inspects world state and either returns a match
 * (the quest is warranted right now) or null (conditions aren't met). This
 * is what makes quests contextual instead of "collect 10 wolf pelts" —
 * the *reason* the quest exists is read directly off the settlement/kingdom
 * that's suffering, not invented after the fact.
 */
const TEMPLATE_MATCHERS: Array<(ctx: GenerationContext, settlement: Settlement, giver: NPC) => TemplateMatch | null> = [
  // Low road safety -> bandit/monster clearing quest.
  (ctx, settlement, giver) => {
    if (settlement.roadSafety >= 50) return null;
    return {
      templateId: "clear_roads",
      title: `Clear the roads near ${settlement.name}`,
      contextSummary: `Raiders have made the roads around ${settlement.name} too dangerous for merchants to travel. ${giver.name} is offering a reward to whoever clears them out.`,
      giverNpcId: giver.id,
      category: "combat",
      reward: { gold: 40 + Math.round((50 - settlement.roadSafety) * 2), reputationDelta: 5, factionId: null, itemIds: [] },
      targetSettlementId: settlement.id,
      objectiveLabel: `Clear the raiders from the roads near ${settlement.name}`,
    };
  },
  // Low prosperity -> delivery/trade quest.
  (ctx, settlement, giver) => {
    if (settlement.prosperity >= 40) return null;
    return {
      templateId: "relief_supplies",
      title: `Bring relief supplies to ${settlement.name}`,
      contextSummary: `${settlement.name} has fallen on hard times. ${giver.name} needs someone to fetch supplies from a wealthier town before things get worse.`,
      giverNpcId: giver.id,
      category: "delivery",
      reward: { gold: 30, reputationDelta: 8, factionId: null, itemIds: [] },
      targetSettlementId: settlement.id,
      objectiveLabel: `Deliver relief supplies to ${settlement.name}`,
    };
  },
  // High population + high prosperity -> a social/investigation quest (things are going well, so the flavor shifts).
  (ctx, settlement, giver) => {
    if (settlement.prosperity < 70 || settlement.population < 500) return null;
    return {
      templateId: "prosperity_intrigue",
      title: `Investigate rumors in ${settlement.name}`,
      contextSummary: `${settlement.name} is thriving, but ${giver.name} suspects someone is skimming from the town's newfound wealth.`,
      giverNpcId: giver.id,
      category: "social",
      reward: { gold: 25, reputationDelta: 3, factionId: null, itemIds: [] },
      targetSettlementId: settlement.id,
      objectiveLabel: `Speak with ${giver.name} about the missing wealth`,
    };
  },
];

export const QuestGenerator = {
  /** Scans all non-destroyed settlements and returns newly-warranted quests (does not mutate world state). */
  generateAvailableQuests(manager: WorldStateManager, now: GameDate, maxNew = 5): Quest[] {
    const world = manager.getWorld();
    const existingTemplatesInFlight = new Set(
      Object.values(world.quests)
        .filter((q) => q.status === "available" || q.status === "active")
        .map((q) => `${q.templateId}:${q.giverNpcId}`)
    );

    const results: Quest[] = [];
    for (const settlement of Object.values(world.settlements)) {
      if (settlement.destroyed || results.length >= maxNew) continue;
      const npcsHere = manager.getNpcsInSettlement(settlement.id).filter((n) => n.alive);
      const giver = npcsHere.find((n) => n.role === "noble" || n.role === "innkeeper" || n.role === "merchant") ?? npcsHere[0];
      if (!giver) continue;

      for (const matcher of TEMPLATE_MATCHERS) {
        if (results.length >= maxNew) break;
        const match = matcher({ manager, now }, settlement, giver);
        if (!match) continue;
        const dedupeKey = `${match.templateId}:${match.giverNpcId}`;
        if (existingTemplatesInFlight.has(dedupeKey)) continue;

        results.push({
          id: createId("quest"),
          templateId: match.templateId,
          title: match.title,
          contextSummary: match.contextSummary,
          giverNpcId: match.giverNpcId,
          originEventId: null,
          status: "available",
          objectives: [
            {
              id: createId("obj"),
              type: match.category === "combat" ? "clear_location" : match.category === "delivery" ? "deliver_item" : "talk_to_npc",
              label: match.objectiveLabel,
              targetId: match.targetSettlementId,
              quantity: 1,
              progress: 0,
              complete: false,
            },
          ],
          reward: match.reward,
          issuedOn: now,
          expiresOn: null,
        });
        existingTemplatesInFlight.add(dedupeKey);
      }
    }
    return results;
  },
};
