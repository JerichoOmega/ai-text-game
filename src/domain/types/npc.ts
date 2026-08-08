import type { GameDate } from "./time";
import type { EntityId } from "./kingdom";

export type MemoryType =
  | "conversation"
  | "favor_given"
  | "favor_received"
  | "insult"
  | "crime_witnessed"
  | "promise_made"
  | "promise_kept"
  | "promise_broken"
  | "debt_incurred"
  | "debt_repaid"
  | "quest_outcome"
  | "world_event_witnessed"
  | "gift_received"
  | "combat_encounter"
  // Phase 7 (NPC Memory expansion)
  | "lie_told"
  | "marriage_witnessed"
  | "title_bestowed";

export interface MemoryEntry {
  id: EntityId;
  type: MemoryType;
  /** Short first-person-flavored summary, e.g. "Rescued my daughter from bandits." */
  summary: string;
  timestamp: GameDate;
  /** Other NPCs, quests, or events this memory references, for cross-linking. */
  relatedEntityIds: EntityId[];
  /** -100 (deeply negative) to 100 (deeply positive) impact on how the NPC feels. */
  sentiment: number;
  /** Memories fade in *narrative prominence* over time but are never deleted. */
  decayed: boolean;
}

export interface FamilyTie {
  npcId: EntityId;
  relation: "parent" | "child" | "sibling" | "spouse";
}

export type NpcRole =
  | "ruler"
  | "noble"
  | "merchant"
  | "guard"
  | "farmer"
  | "innkeeper"
  | "priest"
  | "bandit"
  | "mercenary"
  | "commoner";

export interface NPC {
  id: EntityId;
  name: string;
  role: NpcRole;
  settlementId: EntityId;
  factionId: EntityId | null;
  alive: boolean;
  diedOn: GameDate | null;
  familyTies: FamilyTie[];
  memories: MemoryEntry[];
  /** -100 (hates player) to 100 (devoted to player). Derived-and-cached from memory sentiment. */
  playerRelationship: number;
  /** Positive = player owes NPC; negative = NPC owes player. Gold units. */
  debtToPlayer: number;
  schedule: NpcScheduleSlot[];
}

export interface NpcScheduleSlot {
  /** Hour of day, 0-23, this slot begins. */
  startHour: number;
  location: "home" | "workplace" | "tavern" | "temple" | "market";
}
