import { addDays } from "@/domain/types";
import type { WorldStateManager } from "./WorldStateManager";
import { WeatherManager } from "./managers/WeatherManager";
import { EconomySystem } from "./EconomySystem";
import { QuestGenerator } from "./QuestGenerator";
import { EventEngine } from "./EventEngine";
import { capitalize } from "@/utils/format";

export interface SimulationTickResult {
  logLines: string[];
}

/**
 * The only class that advances world time. Order is fixed and documented
 * here rather than left implicit, because determinism is a stated
 * requirement (Phase 12: "the simulation must remain deterministic") and a
 * silently-reordered pipeline is the easiest way to break that later.
 *
 * Pipeline per day:
 *   Weather -> Season change detection -> Economy -> Politics (stub) ->
 *   Faction AI (stub) -> Kingdom AI (stub) -> NPC schedules (stub) ->
 *   Monster AI -> (end of loop)
 * Then once per `advance()` call, not per day:
 *   Quest generation -> Autosave
 *
 * Quest generation and autosave are intentionally batched once per call
 * instead of once per simulated day — running them daily would mean
 * scanning every settlement and writing to SQLite N times for an N-day
 * advance, which doesn't hold up once players start advancing a week or a
 * month at once (Phase 11: "avoid scanning entire collections every tick").
 * The stubs (politics/faction AI/kingdom AI/NPC schedules) are real pipeline
 * stages with no behavior yet, kept as explicit no-ops rather than omitted,
 * so adding kingdom succession or faction warfare later is "fill in this
 * stage" rather than "figure out where this belongs in the loop."
 */
export const SimulationEngine = {
  async advance(manager: WorldStateManager, days: number, onAutosave?: () => Promise<void>): Promise<SimulationTickResult> {
    const logLines: string[] = [];

    for (let i = 0; i < days; i++) {
      await this.tickOneDay(manager);
    }

    const finalWorld = manager.getWorld();
    const newQuests = QuestGenerator.generateAvailableQuests(manager, finalWorld.currentDate, 3);
    for (const quest of newQuests) {
      manager.setQuest(quest);
      logLines.push(`New quest available: "${quest.title}"`);
    }

    if (onAutosave) await onAutosave();

    return { logLines };
  },

  async tickOneDay(manager: WorldStateManager): Promise<void> {
    const world = manager.getWorld();
    const previousSeason = world.currentDate.season;
    const nextDate = addDays(world.currentDate, 1);
    manager.replaceWorld({ ...manager.getWorld(), currentDate: nextDate });

    // 1. Weather
    await WeatherManager.tick(manager, nextDate);

    // 2. Season change detection
    if (nextDate.season !== previousSeason) {
      await EventEngine.dispatch(manager, {
        type: "season_changed",
        timestamp: nextDate,
        description: `${capitalize(previousSeason)} has given way to ${nextDate.season}.`,
        affectedEntityIds: [],
        originatedFromPlayer: false,
      });
    }

    // 3. Economy (agriculture/trade folded in — see EconomySystem's own doc comment)
    EconomySystem.tick(manager);

    // 4. Politics — stub. Succession pressure from low-stability kingdoms,
    //    council decisions, etc. belong here once designed.
    // 5. Faction AI — stub. Faction goal pursuit (expand/accumulate/destroy_rival) belongs here.
    // 6. Kingdom AI — stub. War declarations between kingdoms belong here.
    // 7. NPC daily schedules — stub. NPC.schedule already models time-of-day
    //    locations; wiring position updates into a per-NPC-per-hour loop is
    //    deferred until a screen actually needs to show "where is NPC X right now."

    // 8. Monster AI / background world events
    await maybeSpawnBackgroundEvent(manager);
  },
};

async function maybeSpawnBackgroundEvent(manager: WorldStateManager): Promise<void> {
  const world = manager.getWorld();
  const roll = Math.random();

  // Roughly 1-in-40 days something road-safety-related happens somewhere,
  // giving the QuestGenerator fresh material without the player's involvement.
  if (roll < 0.025) {
    const settlements = Object.values(world.settlements).filter((s) => !s.destroyed);
    const target = settlements[Math.floor(Math.random() * settlements.length)];
    if (!target) return;
    await EventEngine.dispatch(manager, {
      type: "monster_migration",
      timestamp: world.currentDate,
      description: `Monsters have been sighted migrating near ${target.name}, unsettling the roads.`,
      affectedEntityIds: [target.id],
      originatedFromPlayer: false,
    });
    manager.setSettlement({ ...target, roadSafety: Math.max(0, target.roadSafety - 15) });
  }
}
