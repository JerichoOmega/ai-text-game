import type { DialogueCondition, DialogueLine, NPC, WorldState } from "@/domain/types";
import { describeDaysAgo } from "@/domain/types";
import { NPCMemorySystem } from "./NPCMemorySystem";

/**
 * A small deterministic line bank. Real content growth happens by adding
 * entries here (or loading more from data files later) — never by calling
 * an LLM at dialogue time, so conversations are instant, offline, and free.
 */
const LINE_BANK: DialogueLine[] = [
  {
    id: "line_greeting_generic",
    template: "Hello, traveler.",
    conditions: [{ kind: "always" }],
    priority: 0,
  },
  {
    id: "line_greeting_friendly",
    template: "Good to see you again, friend.",
    conditions: [{ kind: "relationshipAtLeast", value: 30 }],
    priority: 10,
  },
  {
    id: "line_greeting_hostile",
    template: "You've got some nerve showing your face here.",
    conditions: [{ kind: "relationshipAtMost", value: -30 }],
    priority: 10,
  },
  {
    id: "line_debt_owed_by_player",
    template: "You still owe me, you know.",
    conditions: [{ kind: "debtOwedByPlayer" }],
    priority: 20,
  },
  {
    id: "line_settlement_destroyed",
    template: "I still can't believe what happened to this place.",
    conditions: [{ kind: "settlementDestroyed" }],
    priority: 15,
  },
  {
    id: "line_favor_memory",
    template: "I haven't forgotten what you did for me {timeAgo}.",
    conditions: [{ kind: "hasMemoryOfType", memoryType: "favor_received" }],
    priority: 25,
  },
];

function conditionHolds(condition: DialogueCondition, npc: NPC, world: WorldState): boolean {
  switch (condition.kind) {
    case "always":
      return true;
    case "hasMemoryOfType":
      return NPCMemorySystem.hasMemoryOfType(npc, condition.memoryType);
    case "relationshipAtLeast":
      return npc.playerRelationship >= condition.value;
    case "relationshipAtMost":
      return npc.playerRelationship <= condition.value;
    case "npcRoleIs":
      return npc.role === condition.role;
    case "debtOwedByPlayer":
      return npc.debtToPlayer < 0; // negative = NPC owed by player
    case "debtOwedToPlayer":
      return npc.debtToPlayer > 0;
    case "settlementDestroyed":
      return world.settlements[npc.settlementId]?.destroyed === true;
    default:
      return false;
  }
}

function fillTemplate(template: string, npc: NPC, world: WorldState): string {
  if (!template.includes("{timeAgo}")) return template;
  const mostRecentFavor = [...npc.memories]
    .filter((m) => m.type === "favor_received")
    .sort((a, b) => b.sentiment - a.sentiment)[0];
  const timeAgo = mostRecentFavor ? describeDaysAgo(mostRecentFavor.timestamp, world.currentDate) : "recently";
  return template.replace("{timeAgo}", timeAgo);
}

export const DialogueSystem = {
  /** Returns the single best-matching, fully-resolved line of dialogue for an NPC right now. */
  getGreeting(npc: NPC, world: WorldState): string {
    const eligible = LINE_BANK.filter((line) => line.conditions.every((c) => conditionHolds(c, npc, world)));
    const best = eligible.sort((a, b) => b.priority - a.priority)[0];
    if (!best) return "...";
    return fillTemplate(best.template, npc, world);
  },
};
