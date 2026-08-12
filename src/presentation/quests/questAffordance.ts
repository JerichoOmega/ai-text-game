import type { Quest, WorldState } from "@/domain/types";
import { COMBAT_OBJECTIVE_TYPES } from "@/systems/QuestSystem";

/**
 * Pure decision of which player-facing action a quest card should offer,
 * derived from the quest's first actionable incomplete objective and current
 * world state. Kept RN-free so it can be unit-tested without a renderer; the
 * quests screen only renders what this returns. It does NOT touch quest/event
 * logic — completion still happens through the existing store actions
 * (navigate to dialogue -> talkTo, or travelTo) and QuestSystem.
 *
 * Combat takes precedence (preserving the existing combat card exactly),
 * then talk_to_npc, then deliver_item.
 */
export type QuestAffordance =
  | { kind: "combat"; objectiveId: string }
  | {
      kind: "talk";
      objectiveId: string;
      npcId: string;
      npcName: string;
      npcHere: boolean;
      npcSettlementId: string;
      npcSettlementName: string | null;
    }
  | { kind: "deliver"; objectiveId: string; settlementId: string; settlementName: string; atDestination: boolean }
  | { kind: "none" };

export function resolveQuestAffordance(quest: Quest, world: WorldState): QuestAffordance {
  const combat = quest.objectives.find((o) => !o.complete && COMBAT_OBJECTIVE_TYPES.has(o.type));
  if (combat) return { kind: "combat", objectiveId: combat.id };

  const talk = quest.objectives.find((o) => !o.complete && o.type === "talk_to_npc");
  if (talk) {
    const npc = talk.targetId ? world.npcs[talk.targetId] : undefined;
    if (!npc || !npc.alive) return { kind: "none" };
    const settlement = world.settlements[npc.settlementId];
    return {
      kind: "talk",
      objectiveId: talk.id,
      npcId: npc.id,
      npcName: npc.name,
      npcHere: npc.settlementId === world.player.currentSettlementId,
      npcSettlementId: npc.settlementId,
      npcSettlementName: settlement?.name ?? null,
    };
  }

  const deliver = quest.objectives.find((o) => !o.complete && o.type === "deliver_item");
  if (deliver) {
    const dest = deliver.targetId ? world.settlements[deliver.targetId] : undefined;
    if (!dest || dest.destroyed) return { kind: "none" };
    return {
      kind: "deliver",
      objectiveId: deliver.id,
      settlementId: dest.id,
      settlementName: dest.name,
      atDestination: world.player.currentSettlementId === dest.id,
    };
  }

  return { kind: "none" };
}
