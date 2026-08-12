import type { GameDate, Season, WeatherState, WeatherType } from "@/domain/types";
import type { WorldStateManager } from "../WorldStateManager";
import type { SeededRng } from "@/utils/rng";
import { simulationEventId } from "@/utils/id";
import { EventEngine } from "../EventEngine";

/** Seasonally-weighted odds a given weather type is picked when the state changes. */
const SEASON_WEATHER_WEIGHTS: Record<Season, Partial<Record<WeatherType, number>>> = {
  spring: { clear: 40, rain: 40, fog: 15, storm: 5 },
  summer: { clear: 55, heatwave: 15, storm: 20, fog: 5, rain: 5 },
  autumn: { clear: 35, rain: 30, fog: 25, storm: 10 },
  winter: { clear: 30, snow: 45, fog: 15, storm: 10 },
};

/** Weather tends to persist — the longer it's held, the more likely it changes today.
 *  Draws from the seeded simulation RNG so the sequence is reproducible. */
function shouldTransition(state: WeatherState, rng: SeededRng): boolean {
  const baseChance = 0.15;
  const persistenceBonus = Math.min(0.5, state.daysInCurrentState * 0.05);
  return rng.next() < baseChance + persistenceBonus;
}

function pickWeighted(weights: Partial<Record<WeatherType, number>>, rng: SeededRng): WeatherType {
  const entries = Object.entries(weights) as [WeatherType, number][];
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = rng.next() * total;
  for (const [type, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return type;
  }
  return entries[0]![0];
}

export const WeatherManager = {
  /** One day's worth of weather simulation. May emit `weather_changed`.
   *  All randomness comes from the passed seeded RNG (persisted via
   *  WorldState.rngCursor), never Math.random, so weather is reproducible. */
  async tick(manager: WorldStateManager, now: GameDate, rng: SeededRng): Promise<void> {
    const world = manager.getWorld();
    const state = world.weather;

    if (!shouldTransition(state, rng)) {
      manager.replaceWorld({
        ...manager.getWorld(),
        weather: { ...state, daysInCurrentState: state.daysInCurrentState + 1 },
      });
      return;
    }

    const next = pickWeighted(SEASON_WEATHER_WEIGHTS[now.season], rng);
    manager.replaceWorld({
      ...manager.getWorld(),
      weather: { current: next, daysInCurrentState: 0 },
    });

    if (next !== state.current) {
      const w = manager.getWorld();
      await EventEngine.dispatch(manager, {
        id: simulationEventId(w.seed, w.events.length),
        type: "weather_changed",
        timestamp: now,
        description: `The weather has turned to ${next}.`,
        affectedEntityIds: [],
        originatedFromPlayer: false,
      });
    }
  },
};
