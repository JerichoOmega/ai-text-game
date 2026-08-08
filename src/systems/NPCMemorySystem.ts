import type { EntityId, GameDate, MemoryEntry, MemoryType, NPC } from "@/domain/types";
import { toAbsoluteDay } from "@/domain/types";
import { createId } from "@/utils/id";
import type { WorldStateManager } from "./WorldStateManager";

const RELATIONSHIP_CLAMP = 100;

/** Routine memories fade in prominence within a season or two. */
const MINOR_HALF_LIFE_DAYS = 60;
/** Major memories barely fade at all across a normal playthrough — this is
 * what "kings can die and NPCs remember years later" requires numerically. */
const MAJOR_HALF_LIFE_DAYS = 100_000;

/** Memory types that are inherently significant regardless of sentiment magnitude. */
const ALWAYS_MAJOR_TYPES = new Set<MemoryType>([
  "world_event_witnessed",
  "marriage_witnessed",
  "title_bestowed",
  "quest_outcome",
]);

/** A memory is "major" (Phase 7: "major historical events should never
 * disappear") if its type is inherently significant, or its emotional
 * impact was strong enough that a person just wouldn't forget it —
 * getting insulted fades, watching your town burn does not. */
function isMajorMemory(memory: Pick<MemoryEntry, "type" | "sentiment">): boolean {
  return ALWAYS_MAJOR_TYPES.has(memory.type) || Math.abs(memory.sentiment) >= 70;
}

function halfLifeFor(memory: Pick<MemoryEntry, "type" | "sentiment">): number {
  return isMajorMemory(memory) ? MAJOR_HALF_LIFE_DAYS : MINOR_HALF_LIFE_DAYS;
}

/** Below this weight, a memory is flagged `decayed` — still present and
 * still influences relationship math, just no longer prominent enough for
 * dialogue to lead with (see DialogueSystem, which prefers non-decayed
 * memories when picking what an NPC brings up). */
const DECAY_WEIGHT_THRESHOLD = 0.15;

export const NPCMemorySystem = {
  /** Adds a memory to an NPC and recomputes their cached relationship toward the player. */
  remember(
    manager: WorldStateManager,
    npcId: EntityId,
    input: {
      type: MemoryType;
      summary: string;
      timestamp: GameDate;
      relatedEntityIds?: EntityId[];
      sentiment: number;
    }
  ): NPC | undefined {
    const npc = manager.getNpc(npcId);
    if (!npc) return undefined;

    const memory: MemoryEntry = {
      id: createId("mem"),
      type: input.type,
      summary: input.summary,
      timestamp: input.timestamp,
      relatedEntityIds: input.relatedEntityIds ?? [],
      sentiment: clamp(input.sentiment, -100, 100),
      decayed: false,
    };

    const refreshedMemories = refreshDecayFlags([...npc.memories, memory], input.timestamp);

    const updatedNpc: NPC = {
      ...npc,
      memories: refreshedMemories,
      playerRelationship: recomputeRelationship(refreshedMemories, input.timestamp),
    };

    manager.setNpc(updatedNpc);
    return updatedNpc;
  },

  /** Most recent memories first — used to pick what an NPC "brings up" in dialogue. */
  getRecentMemories(npc: NPC, count: number): MemoryEntry[] {
    return [...npc.memories]
      .sort((a, b) => toAbsoluteDay(b.timestamp) - toAbsoluteDay(a.timestamp))
      .slice(0, count);
  },

  /** Non-decayed memories first, then by recency — what dialogue should prefer to reference. */
  getProminentMemories(npc: NPC, count: number): MemoryEntry[] {
    return [...npc.memories]
      .sort((a, b) => {
        if (a.decayed !== b.decayed) return a.decayed ? 1 : -1;
        return toAbsoluteDay(b.timestamp) - toAbsoluteDay(a.timestamp);
      })
      .slice(0, count);
  },

  hasMemoryOfType(npc: NPC, type: MemoryType): boolean {
    return npc.memories.some((m) => m.type === type);
  },

  /** Finds the strongest memory involving a specific entity (an NPC, quest, or event id). */
  findMemoryAbout(npc: NPC, entityId: EntityId): MemoryEntry | undefined {
    const related = npc.memories.filter((m) => m.relatedEntityIds.includes(entityId));
    return related.sort((a, b) => Math.abs(b.sentiment) - Math.abs(a.sentiment))[0];
  },
};

function weightOf(memory: MemoryEntry, now: GameDate): number {
  const ageDays = Math.max(0, toAbsoluteDay(now) - toAbsoluteDay(memory.timestamp));
  return Math.pow(0.5, ageDays / halfLifeFor(memory));
}

function refreshDecayFlags(memories: MemoryEntry[], now: GameDate): MemoryEntry[] {
  return memories.map((m) => ({ ...m, decayed: weightOf(m, now) < DECAY_WEIGHT_THRESHOLD }));
}

function recomputeRelationship(memories: MemoryEntry[], now: GameDate): number {
  let weightedSum = 0;
  let weightTotal = 0;
  for (const memory of memories) {
    const weight = weightOf(memory, now);
    weightedSum += memory.sentiment * weight;
    weightTotal += weight;
  }
  const base = weightTotal > 0 ? weightedSum / weightTotal : 0;
  return clamp(Math.round(base), -RELATIONSHIP_CLAMP, RELATIONSHIP_CLAMP);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
