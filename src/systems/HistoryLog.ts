import type { HistoryCategory, HistoryEntry, WorldEvent, WorldEventType } from "@/domain/types";
import { createId } from "@/utils/id";
import { historyRepository } from "@/data/repositories/historyRepository";
import type { WorldStateManager } from "./WorldStateManager";

/** Which event types are chronicle-worthy, and under what category. Not every
 * WorldEvent becomes history — e.g. routine background trade doesn't, but a
 * war does. This table is the single place that decision lives. */
const HISTORY_WORTHY: Partial<Record<WorldEventType, HistoryCategory>> = {
  ruler_died: "political",
  ruler_crowned: "political",
  settlement_destroyed: "military",
  settlement_founded: "political",
  war_declared: "military",
  war_ended: "military",
  faction_power_shift: "political",
  faction_war_started: "military",
  trade_route_opened: "economic",
  trade_route_closed: "economic",
  monster_migration: "natural",
  forest_fire: "natural",
  famine: "economic",
  disease_outbreak: "natural",
  dungeon_appeared: "natural",
  dungeon_collapsed: "natural",
  dungeon_cleared: "military",
  bandit_leader_slain: "military",
  merchant_bankrupt: "economic",
  player_promoted: "personal",
  player_arrested: "personal",
  companion_joined: "personal",
  companion_left: "personal",
  quest_completed: "personal",
};

export const HistoryLog = {
  isChronicleWorthy(eventType: WorldEventType): boolean {
    return eventType in HISTORY_WORTHY;
  },

  /** Records an event to the permanent, append-only chronicle if it qualifies. */
  async recordIfWorthy(manager: WorldStateManager, event: WorldEvent): Promise<HistoryEntry | null> {
    const category = HISTORY_WORTHY[event.type];
    if (!category) return null;

    const entry: HistoryEntry = {
      id: createId("hist"),
      sourceEventId: event.id,
      year: event.timestamp.year,
      category,
      headline: event.description,
      relatedEntityIds: event.affectedEntityIds,
    };

    const world = manager.getWorld();
    manager.replaceWorld({ ...world, history: [...world.history, entry] });
    await historyRepository.append(entry);
    return entry;
  },

  getTimeline(manager: WorldStateManager): HistoryEntry[] {
    return manager.getWorld().history;
  },

  getTimelineForYear(manager: WorldStateManager, year: number): HistoryEntry[] {
    return manager.getWorld().history.filter((entry) => entry.year === year);
  },

  /**
   * Phase 6 (Chronicle System): renders a year's history entries as a
   * readable "living newspaper" paragraph rather than a bare list — this is
   * what NPC dialogue and a future chronicle screen quote from directly.
   * Grouped by category so related happenings read together.
   */
  generateYearNarrative(manager: WorldStateManager, year: number): string {
    const entries = this.getTimelineForYear(manager, year);
    if (entries.length === 0) return `Year ${year} passed with nothing worth recording.`;

    const order: HistoryCategory[] = ["political", "military", "economic", "natural", "personal"];
    const lines: string[] = [`Year ${year}`];
    for (const category of order) {
      const inCategory = entries.filter((e) => e.category === category);
      for (const entry of inCategory) {
        lines.push(`• ${entry.headline}`);
      }
    }
    return lines.join("\n");
  },
};
