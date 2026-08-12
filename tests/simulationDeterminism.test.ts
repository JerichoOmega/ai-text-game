import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { resetDb as resetWebDb, getDb as getWebDb } from "@/data/db.web";
import { WorldStateManager } from "@/systems/WorldStateManager";
import { SimulationEngine } from "@/systems/SimulationEngine";
import { WeatherManager } from "@/systems/managers/WeatherManager";
import { SeededRng } from "@/utils/rng";
import { simulationEventId } from "@/utils/id";
import { worldRepository } from "@/data/repositories/worldRepository";
import { eventBus } from "@/systems/EventBus";
import { registerHistorySubscriber } from "@/systems/eventSubscribers/historySubscriber";
import type { WeatherType, WorldState } from "@/domain/types";
import { makeTestSettlement, makeTestWorld } from "./testHelpers";

/**
 * P1-2 regression suite: the world simulation must be reproducible —
 * same persisted world + same RNG state + same inputs -> same results —
 * and its RNG stream must survive a save/reload. Runs the real
 * SimulationEngine / WeatherManager over the web SQLite engine in Node via
 * the expo-sqlite test stub. The real history subscriber is wired so events
 * AND history are produced deterministically.
 */

function baseWorld(rngCursor = 777): WorldState {
  const settlements = ["settlement_a", "settlement_b", "settlement_c"].map((id, i) =>
    makeTestSettlement(id, { name: `Town ${i}`, roadSafety: 60, prosperity: 50, population: 300 })
  );
  return makeTestWorld({
    seed: 424242,
    rngCursor,
    currentDate: { year: 212, season: "spring", day: 1 },
    settlements: Object.fromEntries(settlements.map((s) => [s.id, s])),
  });
}

function cloneManager(world: WorldState): WorldStateManager {
  return new WorldStateManager(JSON.parse(JSON.stringify(world)) as WorldState);
}

/** Quests use random createId (out of Phase 2B scope), so strip them from
 *  full-world equality checks; their content is compared separately by title. */
function withoutQuests(world: WorldState): Omit<WorldState, "quests"> {
  const { quests: _quests, ...rest } = world;
  return rest;
}

function settlementRoadSafety(world: WorldState): Record<string, number> {
  return Object.fromEntries(Object.values(world.settlements).map((s) => [s.id, s.roadSafety]));
}

beforeEach(async () => {
  await resetWebDb();
  eventBus.reset();
  registerHistorySubscriber();
});

test("two simulations from an identical world + RNG state produce identical results", async () => {
  const world = baseWorld();
  const a = cloneManager(world);
  const b = cloneManager(world);

  await SimulationEngine.advance(a, 60);
  await SimulationEngine.advance(b, 60);

  // Everything except quests (whose ids are random by design) is byte-identical:
  // weather, currentDate, rngCursor, settlements, player, events, and history.
  assert.deepEqual(withoutQuests(a.getWorld()), withoutQuests(b.getWorld()));
  // Quest generation content is reproducible too (only the ids differ).
  assert.deepEqual(
    Object.values(a.getWorld().quests).map((q) => q.title).sort(),
    Object.values(b.getWorld().quests).map((q) => q.title).sort()
  );
});

test("save -> reload -> simulate matches continuing without a reload", async () => {
  const world = baseWorld();

  // Continuous: advance 6 days straight.
  const continuous = cloneManager(world);
  await SimulationEngine.advance(continuous, 6);

  // Reload path: advance 3, persist, reload from DB, advance 3 more.
  const first = cloneManager(world);
  await SimulationEngine.advance(first, 3);
  await worldRepository.saveAll(first.getWorld());
  const loaded = await worldRepository.loadAll();
  assert.ok(loaded);
  const second = new WorldStateManager(loaded);
  await SimulationEngine.advance(second, 3);

  // Compare the persisted, determinism-relevant state (saveAll does not
  // persist the append-only event/history logs, and quest ids are random).
  const summarize = (w: WorldState) => ({
    currentDate: w.currentDate,
    weather: w.weather,
    rngCursor: w.rngCursor,
    roadSafety: settlementRoadSafety(w),
    playerGold: w.player.gold,
  });
  assert.deepEqual(summarize(second.getWorld()), summarize(continuous.getWorld()));
  assert.equal(second.getWorld().rngCursor, continuous.getWorld().rngCursor);
});

test("weather rolls are reproducible for a given RNG state", async () => {
  const world = baseWorld();

  const runWeather = async (): Promise<WeatherType[]> => {
    const m = cloneManager(world);
    const rng = new SeededRng(world.rngCursor);
    const sequence: WeatherType[] = [];
    for (let day = 0; day < 40; day++) {
      await WeatherManager.tick(m, m.getWorld().currentDate, rng);
      sequence.push(m.getWorld().weather.current);
    }
    return sequence;
  };

  assert.deepEqual(await runWeather(), await runWeather());
});

test("background-event rolls are reproducible (and the spawn path is exercised)", async () => {
  const world = baseWorld();
  const run = async () => {
    const m = cloneManager(world);
    await SimulationEngine.advance(m, 400);
    return m.getWorld().events.filter((e) => e.type === "monster_migration");
  };

  const first = await run();
  const second = await run();

  assert.ok(first.length >= 1, "expected at least one background event across 400 days");
  assert.deepEqual(first, second); // identical events, including deterministic ids
});

test("simulation-generated event ids are deterministic and reproducible", async () => {
  assert.equal(simulationEventId(42, 5), "evt_42_5");
  assert.equal(simulationEventId(424242, 0), "evt_424242_0");

  const world = baseWorld();
  const a = cloneManager(world);
  const b = cloneManager(world);
  await SimulationEngine.advance(a, 80);
  await SimulationEngine.advance(b, 80);

  const idsA = a.getWorld().events.map((e) => e.id);
  const idsB = b.getWorld().events.map((e) => e.id);
  assert.deepEqual(idsA, idsB);
  // Ids follow the deterministic evt_<seed>_<index> scheme.
  assert.ok(idsA.every((id) => id.startsWith("evt_424242_")));
  // History ids are derived 1:1 from their source event id.
  const hist = a.getWorld().history;
  if (hist.length > 0) assert.equal(hist[0]?.id, `hist_${hist[0]?.sourceEventId}`);
});

test("SeededRng exposes and advances its state", () => {
  const rng = new SeededRng(777);
  assert.equal(rng.getState(), 777); // untouched before first draw
  const v1 = rng.next();
  assert.ok(v1 >= 0 && v1 < 1);
  assert.notEqual(rng.getState(), 777); // advanced after a draw

  // Same starting state -> same sequence.
  const other = new SeededRng(777);
  assert.equal(other.next(), v1);
});

test("RNG cursor advances during simulation and is persisted across save/reload", async () => {
  const world = baseWorld(12321);
  const m = cloneManager(world);
  await SimulationEngine.advance(m, 10);

  const advancedCursor = m.getWorld().rngCursor;
  assert.notEqual(advancedCursor, 12321); // the stream moved forward

  await worldRepository.saveAll(m.getWorld());
  const loaded = await worldRepository.loadAll();
  assert.ok(loaded);
  assert.equal(loaded.rngCursor, advancedCursor); // persisted exactly
});

test("a save that predates rngCursor defaults its RNG stream to the seed", async () => {
  // Stage a legacy save (player + clock + seed, but no rngCursor row) using the
  // exact meta upsert the repository uses — no reliance on DELETE support.
  const world = baseWorld();
  const db = await getWebDb();
  const META_UPSERT =
    "INSERT INTO meta (key, value) VALUES (?, ?)\n     ON CONFLICT(key) DO UPDATE SET value = excluded.value";
  await db.runAsync(META_UPSERT, ["saveVersion", "1"]);
  await db.runAsync(META_UPSERT, ["player", JSON.stringify(world.player)]);
  await db.runAsync(META_UPSERT, ["currentDate", JSON.stringify(world.currentDate)]);
  await db.runAsync(META_UPSERT, ["seed", String(world.seed)]);

  const loaded = await worldRepository.loadAll();
  assert.ok(loaded);
  assert.equal(loaded.seed, world.seed);
  assert.equal(loaded.rngCursor, loaded.seed); // fresh stream derived from the seed
});
