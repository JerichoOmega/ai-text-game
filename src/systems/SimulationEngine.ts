import { addDays } from "@/domain/types";
import type { WorldStateManager } from "./WorldStateManager";
import { WeatherManager } from "./managers/WeatherManager";
import { EconomySystem } from "./EconomySystem";
import { QuestGenerator } from "./QuestGenerator";
import { EventEngine } from "./EventEngine";
import { SeededRng } from "@/utils/rng";
import { simulationEventId } from "@/utils/id";
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
 * Determinism (Phase 2B): every random choice the day-loop makes — weather
 * transitions and background-event spawning — draws from a single seeded
 * SeededRng created from `world.rngCursor` at the start of `advance`. The
 * cursor is written back to the world at the end of the call, so a save (it
 * is persisted as its own meta row) and reload resume the exact same random
 * sequence instead of restarting it. No Math.random() is used anywhere in
 * the simulation path.
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

    // Resume the simulation's random sequence from where the last save left
    // off. All per-day randomness draws from this one stream.
    const rng = new SeededRng(manager.getWorld().rngCursor);

    for (let i = 0; i < days; i++) {
      await this.tickOneDay(manager, rng);
    }

    // Persist the advanced RNG state back onto the world so the next
    // save captures it (and a reload resumes the identical sequence).
    manager.replaceWorld({ ...manager.getWorld(), rngCursor: rng.getState() });

    const finalWorld = manager.getWorld();
    const newQuests = QuestGenerator.generateAvailableQuests(manager, finalWorld.currentDate, 3);
    for (const quest of newQuests) {
      manager.setQuest(quest);
      logLines.push(`New quest available: "${quest.title}"`);
    }

    if (onAutosave) await onAutosave();

    return { logLines };
  },

  async tickOneDay(manager: WorldStateManager, rng: SeededRng): Promise<void> {
    const world = manager.getWorld();
    const previousSeason = world.currentDate.season;
    const nextDate = addDays(world.currentDate, 1);
    manager.replaceWorld({ ...manager.getWorld(), currentDate: nextDate });

    // 1. Weather
    await WeatherManager.tick(manager, nextDate, rng);

    // 2. Season change detection
    if (nextDate.season !== previousSeason) {
      const w = manager.getWorld();
      await EventEngine.dispatch(manager, {
        id: simulationEventId(w.seed, w.events.length),
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
    await maybeSpawnBackgroundEvent(manager, rng);
  },
};

async function maybeSpawnBackgroundEvent(manager: WorldStateManager, rng: SeededRng): Promise<void> {
  const world = manager.getWorld();
  const roll = rng.next();

  // Roughly 1-in-40 days something road-safety-related happens somewhere,
  // giving the QuestGenerator fresh material without the player's involvement.
  if (roll < 0.025) {
    const settlements = Object.values(world.settlements).filter((s) => !s.destroyed);
    const target = settlements[rng.nextInt(settlements.length)];
    if (!target) return;
    const w = manager.getWorld();
    await EventEngine.dispatch(manager, {
      id: simulationEventId(w.seed, w.events.length),
      type: "monster_migration",
      timestamp: world.currentDate,
      description: `Monsters have been sighted migrating near ${target.name}, unsettling the roads.`,
      affectedEntityIds: [target.id],
      originatedFromPlayer: false,
    });
    manager.setSettlement({ ...target, roadSafety: Math.max(0, target.roadSafety - 15) });
  }
}
