import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { resetDb as resetWebDb } from "@/data/db.web";
import { WorldStateManager } from "@/systems/WorldStateManager";
import { runTransactionalWorldUpdate } from "@/systems/WorldTransaction";
import { EventEngine } from "@/systems/EventEngine";
import { eventBus } from "@/systems/EventBus";
import { registerHistorySubscriber } from "@/systems/eventSubscribers/historySubscriber";
import { eventRepository } from "@/data/repositories/eventRepository";
import { historyRepository } from "@/data/repositories/historyRepository";
import { worldRepository } from "@/data/repositories/worldRepository";
import type { WorldState } from "@/domain/types";
import { makeTestWorld } from "./testHelpers";

/**
 * P1-1 regression suite: event/history writes must live INSIDE the
 * transactional persist boundary, not be written directly to the shared
 * database during simulation.
 *
 * Runs the real EventEngine / HistoryLog / repository / WorldTransaction
 * code over the web SQLite engine in Node via the expo-sqlite test stub
 * (tests/stubs/expo-sqlite.ts). Only the real history subscriber is wired
 * (no cascade/rumor noise), so a single chronicle-worthy event yields
 * exactly one event row and one history row — making the counts assertions
 * unambiguous. `monster_migration` is chronicle-worthy (natural) and has no
 * consequence subscriber, so it produces no follow-up events.
 */

const WORTHY_EVENT = {
  type: "monster_migration" as const,
  timestamp: { year: 212, season: "spring" as const, day: 1 },
  description: "Monsters have been sighted near the border, unsettling the roads.",
  affectedEntityIds: [] as string[],
  originatedFromPlayer: false,
};

function snapshot(world: WorldState): WorldState {
  return JSON.parse(JSON.stringify(world)) as WorldState;
}

/** A simulate step that mutates world state (gold) AND dispatches one
 *  chronicle-worthy event, so a transaction touches all three durable
 *  concerns at once: world fields, events, and history. */
async function simulateGoldAndEvent(candidate: WorldStateManager): Promise<void> {
  const w = candidate.getWorld();
  candidate.replaceWorld({ ...w, player: { ...w.player, gold: w.player.gold + 100 } });
  await EventEngine.dispatch(candidate, WORTHY_EVENT);
}

const failingPersist = async (): Promise<void> => {
  throw new Error("simulated disk write failure");
};

beforeEach(async () => {
  await resetWebDb();
  eventBus.reset();
  registerHistorySubscriber();
});

test("success: a committed transaction persists world state AND its events/history", async () => {
  const manager = new WorldStateManager(makeTestWorld({ player: { ...makeTestWorld().player, gold: 10 } }));

  const outcome = await runTransactionalWorldUpdate(
    manager,
    simulateGoldAndEvent,
    (world) => worldRepository.saveAll(world)
  );

  assert.equal(outcome.committed, true);

  // In-memory authoritative state committed.
  assert.equal(manager.getWorld().player.gold, 110);
  assert.equal(manager.getWorld().events.length, 1);
  assert.equal(manager.getWorld().history.length, 1);

  // Durable: reloading from the repositories sees world + event + history.
  const loaded = await worldRepository.loadAll();
  assert.ok(loaded);
  assert.equal(loaded.player.gold, 110);
  assert.equal(loaded.events.length, 1);
  assert.equal(loaded.events[0]?.type, "monster_migration");
  assert.equal(loaded.history.length, 1);
  assert.equal(loaded.history[0]?.category, "natural");
});

test("failed persistence: authoritative world state is left unchanged", async () => {
  const manager = new WorldStateManager(makeTestWorld({ player: { ...makeTestWorld().player, gold: 10 } }));
  const before = snapshot(manager.getWorld());

  const outcome = await runTransactionalWorldUpdate(manager, simulateGoldAndEvent, failingPersist);

  assert.equal(outcome.committed, false);
  if (!outcome.committed) assert.equal(outcome.stage, "persist");
  // World is byte-for-byte unchanged: gold not advanced, no event/history added.
  assert.deepEqual(manager.getWorld(), before);
  assert.equal(manager.getWorld().player.gold, 10);
  assert.equal(manager.getWorld().events.length, 0);
  assert.equal(manager.getWorld().history.length, 0);
});

test("failed persistence: no event or history rows are written to the database", async () => {
  const manager = new WorldStateManager(makeTestWorld());

  assert.equal((await eventRepository.getAll()).length, 0);
  assert.equal((await historyRepository.getAll()).length, 0);

  const outcome = await runTransactionalWorldUpdate(manager, simulateGoldAndEvent, failingPersist);
  assert.equal(outcome.committed, false);

  // The core save threw before the log flush ran — nothing was appended.
  assert.equal((await eventRepository.getAll()).length, 0);
  assert.equal((await historyRepository.getAll()).length, 0);
});

test("retry after a failed persistence produces no duplicate event/history rows", async () => {
  const manager = new WorldStateManager(makeTestWorld({ player: { ...makeTestWorld().player, gold: 0 } }));

  // Attempt 1: persistence fails. Nothing must reach the log tables.
  const failed = await runTransactionalWorldUpdate(manager, simulateGoldAndEvent, failingPersist);
  assert.equal(failed.committed, false);
  assert.equal((await eventRepository.getAll()).length, 0);
  assert.equal((await historyRepository.getAll()).length, 0);
  // Manager untouched, so the retry re-simulates from the original state.
  assert.equal(manager.getWorld().player.gold, 0);
  assert.equal(manager.getWorld().events.length, 0);

  // Attempt 2: same action, persistence succeeds.
  const retried = await runTransactionalWorldUpdate(
    manager,
    simulateGoldAndEvent,
    (world) => worldRepository.saveAll(world)
  );
  assert.equal(retried.committed, true);

  // Exactly one event and one history row — the failed attempt contributed none.
  assert.equal((await eventRepository.getAll()).length, 1);
  assert.equal((await historyRepository.getAll()).length, 1);
  assert.equal(manager.getWorld().events.length, 1);
  assert.equal(manager.getWorld().history.length, 1);
  assert.equal(manager.getWorld().player.gold, 100);
});
