import type { DialogueCondition, DialogueLine, DialogueResponse, DialogueTopic, NPC, Quest, WorldState } from "@/domain/types";
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

const MERCHANT_ROLES = new Set(["merchant", "innkeeper"]);

function lowerFirst(text: string): string {
  return text.length > 0 ? text[0]!.toLowerCase() + text.slice(1) : text;
}

/** The active quest this NPC personally handed out, if any. */
function questFromGiver(npc: NPC, world: WorldState): Quest | undefined {
  return Object.values(world.quests).find(
    (q) => q.giverNpcId === npc.id && (q.status === "available" || q.status === "active")
  );
}

export const DialogueSystem = {
  /** Returns the single best-matching, fully-resolved line of dialogue for an NPC right now. */
  getGreeting(npc: NPC, world: WorldState): string {
    const eligible = LINE_BANK.filter((line) => line.conditions.every((c) => conditionHolds(c, npc, world)));
    const best = eligible.sort((a, b) => b.priority - a.priority)[0];
    if (!best) return "...";
    return fillTemplate(best.template, npc, world);
  },

  /**
   * The player's available responses right now, derived deterministically
   * from live world state (is this a merchant? did they give a quest?).
   * Always ends with a way to leave. Not a free-text chat — a fixed set of
   * branches the screen can render as buttons.
   */
  getResponses(npc: NPC, world: WorldState): DialogueResponse[] {
    const responses: DialogueResponse[] = [];
    if (MERCHANT_ROLES.has(npc.role)) {
      responses.push({ id: "resp_shop", topic: "shop", label: "Let me see what you have for sale." });
    }
    responses.push({ id: "resp_news", topic: "news", label: "What's new around here?" });
    responses.push({ id: "resp_rumors", topic: "rumors", label: "Any rumors or news?" });
    const quest = questFromGiver(npc, world);
    if (quest) {
      responses.push({ id: "resp_quest", topic: "quest", label: `About "${quest.title}"...` });
    }
    responses.push({ id: "resp_leave", topic: "leave", label: "I should get going." });
    return responses;
  },

  /**
   * The NPC's deterministic reply to a chosen topic, resolved from live
   * settlement/quest/memory state. Purely narrative — selecting a topic
   * never mutates the world here (the shop/leave topics are handled by the
   * screen as navigation).
   */
  getReply(npc: NPC, world: WorldState, topic: DialogueTopic): string {
    switch (topic) {
      case "news": {
        const settlement = world.settlements[npc.settlementId];
        if (!settlement) return "Hard to say. I don't get out much these days.";
        if (settlement.destroyed) return "There's nothing left here but ash and memory.";
        if (settlement.roadSafety < 40) return "The roads have been dangerous of late. Keep your blade close.";
        if (settlement.prosperity >= 70) return `${settlement.name} is thriving. Coin flows and spirits are high.`;
        return `${settlement.name} carries on, same as ever. Quiet enough, for now.`;
      }
      case "rumors": {
        const memory = NPCMemorySystem.getProminentMemories(npc, 1)[0];
        if (memory) return `Folk still speak of it — ${lowerFirst(memory.summary)}`;
        return "Nothing worth repeating just now. Ask me again another day.";
      }
      case "quest": {
        const quest = questFromGiver(npc, world);
        if (!quest) return "I've nothing to ask of you at the moment.";
        return `${quest.contextSummary || quest.title}. See it done and you'll be well repaid.`;
      }
      case "shop":
        return "Right this way. Everything's fairly priced, I promise you.";
      case "leave":
        return "Safe travels, then. Mind the roads.";
      default:
        return this.getGreeting(npc, world);
    }
  },
};
