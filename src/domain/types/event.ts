import type { GameDate } from "./time";
import type { EntityId } from "./kingdom";

export type WorldEventType =
  | "ruler_died"
  | "ruler_crowned"
  | "settlement_destroyed"
  | "settlement_founded"
  | "war_declared"
  | "war_ended"
  | "faction_power_shift"
  | "faction_war_started"
  | "trade_route_opened"
  | "trade_route_closed"
  | "monster_migration"
  | "forest_fire"
  | "famine"
  | "disease_outbreak"
  | "dungeon_appeared"
  | "dungeon_collapsed"
  | "dungeon_cleared"
  | "bandit_leader_slain"
  | "npc_died"
  | "player_action"
  // Player-originated gameplay events (Phase 2: Event Bus)
  | "player_killed_npc"
  | "player_helped_npc"
  | "quest_completed"
  // Player-driven quest triggers (Phase 2D: non-combat quest completion).
  // Consumed by questProgressSubscriber to advance talk_to_npc / deliver_item
  // objectives. Not chronicle-worthy on their own (see HistoryLog).
  | "player_talked_to_npc"
  | "player_arrived_at_settlement"
  | "merchant_bankrupt"
  | "weather_changed"
  | "season_changed"
  | "item_crafted"
  // Companions are DEFERRED post-MVP (see STATUS.md). These event types are
  // preserved as inert future extension points — never dispatched today —
  // so adding companions later needs no change to the event vocabulary.
  | "companion_joined"
  | "companion_left"
  | "crime_witnessed"
  | "player_arrested"
  | "player_promoted";

/**
 * A single simulated occurrence. WorldEvents are the atomic unit the
 * EventEngine produces; they cause downstream consequences (other events),
 * get written to the HistoryLog, and get pushed into affected NPCs' memory.
 */
export interface WorldEvent {
  id: EntityId;
  type: WorldEventType;
  timestamp: GameDate;
  description: string;
  affectedEntityIds: EntityId[];
  /** Event id that triggered this one, forming a causal chain. Null if root cause. */
  causedByEventId: EntityId | null;
  /** Whether this stemmed from a direct player action vs. background simulation. */
  originatedFromPlayer: boolean;
}

export type HistoryCategory = "political" | "military" | "economic" | "natural" | "personal";

/** A curated, human-facing entry in the world's permanent timeline (the "Year 212" chronicle). */
export interface HistoryEntry {
  id: EntityId;
  sourceEventId: EntityId;
  year: number;
  category: HistoryCategory;
  headline: string;
  relatedEntityIds: EntityId[];
}
