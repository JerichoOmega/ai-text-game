import type { WorldEvent } from "@/domain/types";

export interface Rumor {
  text: string;
  heardOnAbsoluteDay: number;
}

const MAX_RUMORS = 25;

/**
 * Intentionally in-memory only, not persisted to SQLite. Rumors are meant to
 * fade and be superseded — unlike HistoryLog, which is the permanent record,
 * this is closer to "what people are currently talking about." If rumors
 * need to survive an app restart later, persist this as its own small table
 * rather than folding it into WorldState; it doesn't belong in save-critical
 * data the way NPC memory and history do.
 */
class RumorFeed {
  private rumors: Rumor[] = [];

  add(text: string, absoluteDay: number): void {
    this.rumors.unshift({ text, heardOnAbsoluteDay: absoluteDay });
    if (this.rumors.length > MAX_RUMORS) this.rumors.length = MAX_RUMORS;
  }

  getRecent(count = 10): Rumor[] {
    return this.rumors.slice(0, count);
  }

  clear(): void {
    this.rumors = [];
  }
}

export const rumorFeed = new RumorFeed();

const RUMOR_TEMPLATES: Partial<Record<WorldEvent["type"], (event: WorldEvent) => string>> = {
  bandit_leader_slain: (e) => `Word is the bandits near here lost their leader. ${e.description}`,
  settlement_destroyed: (e) => `Grim news travels fast: ${e.description}`,
  ruler_died: () => `They say the throne sits empty now.`,
  dungeon_cleared: (e) => `Adventurers cleared out that old dungeon. ${e.description}`,
  monster_migration: (e) => e.description,
  merchant_bankrupt: (e) => `A merchant's gone bust — ${e.description}`,
};

export function generateRumorFromEvent(event: WorldEvent, absoluteDay: number): void {
  const template = RUMOR_TEMPLATES[event.type];
  if (!template) return;
  rumorFeed.add(template(event), absoluteDay);
}
