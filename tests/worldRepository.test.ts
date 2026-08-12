import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { getDb as getWebDb, resetDb as resetWebDb } from "@/data/db.web";
import { worldRepository } from "@/data/repositories/worldRepository";
import { eventRepository } from "@/data/repositories/eventRepository";
import { historyRepository } from "@/data/repositories/historyRepository";
import { SaveManager } from "@/systems/SaveManager";
import type { HistoryEntry, WorldEvent, WorldState } from "@/domain/types";
import { makeTestNpc, makeTestSettlement, makeTestWorld } from "./testHelpers";

/**
 * Migration + round-trip coverage for worldRepository — the save/load layer.
 * Runs over the web adapter engine in Node via the expo-sqlite test stub
 * (see tests/stubs/expo-sqlite.ts). Exercises: no-save load, full-world
 * round trip, append-only event/history load, save-version migration of an
 * old player shape, and default-fill for pre-existing saves that predate
 * newer fields (seed / weather). Also covers SaveManager's first-run seed
 * vs. subsequent-load behaviour.
 */

const CURRENT_SAVE_VERSION = 4;
const META_UPSERT =
  "INSERT INTO meta (key, value) VALUES (?, ?)\n     ON CONFLICT(key) DO UPDATE SET value = excluded.value";

/** Writes a raw meta row exactly as worldRepository.setMeta would, so we can
 *  stage a legacy save the public API has no method to write directly. */
async function seedMeta(key: string, value: string): Promise<void> {
  const db = await getWebDb();
  await db.runAsync(META_UPSERT, [key, value]);
}

beforeEach(async () => {
  await resetWebDb();
});

test("worldRepository: loadAll returns null when there is no save", async () => {
  assert.equal(await worldRepository.hasSave(), false);
  assert.equal(await worldRepository.loadAll(), null);
});

test("worldRepository: saveAll then loadAll round-trips the full world", async () => {
  const npc = makeTestNpc("n1", { settlementId: "s1" });
  const settlement = makeTestSettlement("s1", { kingdomId: "k1" });
  const world: WorldState = makeTestWorld({
    seed: 987654,
    currentDate: { year: 212, season: "summer", day: 7 },
    weather: { current: "rain", daysInCurrentState: 3 },
    kingdoms: {
      k1: {
        id: "k1",
        name: "Testonia",
        rulerId: null,
        treasury: 500,
        stability: 70,
        atWarWithKingdomIds: [],
        foundedOn: { year: 1, season: "spring", day: 1 },
      },
    },
    settlements: { s1: settlement },
    factions: {
      f1: {
        id: "f1",
        name: "Guild",
        power: 55,
        homeSettlementId: "s1",
        goals: [{ type: "accumulate_wealth", targetId: null, priority: 70 }],
        relationships: {},
        playerStanding: 0,
      },
    },
    npcs: { n1: npc },
    quests: {
      q1: {
        id: "q1",
        templateId: "clear_roads",
        title: "Clear the roads",
        contextSummary: "Bandits.",
        giverNpcId: "n1",
        originEventId: null,
        status: "available",
        objectives: [
          { id: "o1", type: "clear_location", label: "Clear it", targetId: "s1", quantity: 1, progress: 0, complete: false },
        ],
        reward: { gold: 40, reputationDelta: 5, factionId: null, itemIds: [] },
        issuedOn: { year: 212, season: "summer", day: 7 },
        expiresOn: null,
      },
    },
  });

  await worldRepository.saveAll(world);
  assert.equal(await worldRepository.hasSave(), true);

  const loaded = await worldRepository.loadAll();
  assert.ok(loaded);
  assert.equal(loaded.saveVersion, CURRENT_SAVE_VERSION);
  assert.equal(loaded.seed, 987654);
  assert.deepEqual(loaded.currentDate, world.currentDate);
  assert.deepEqual(loaded.weather, world.weather);
  assert.deepEqual(loaded.player, world.player);
  assert.deepEqual(loaded.kingdoms, world.kingdoms);
  assert.deepEqual(loaded.settlements, world.settlements);
  assert.deepEqual(loaded.factions, world.factions);
  assert.deepEqual(loaded.npcs, world.npcs);
  assert.deepEqual(loaded.quests, world.quests);
  // saveAll does not persist the append-only logs (repos append incrementally).
  assert.deepEqual(loaded.events, []);
  assert.deepEqual(loaded.history, []);
});

test("worldRepository: loadAll surfaces append-only events/history written by their repositories", async () => {
  await worldRepository.saveAll(makeTestWorld());

  const event: WorldEvent = {
    id: "e1",
    type: "quest_completed",
    timestamp: { year: 1, season: "spring", day: 2 },
    description: "did a thing",
    affectedEntityIds: [],
    causedByEventId: null,
    originatedFromPlayer: true,
  };
  const entry: HistoryEntry = {
    id: "h1",
    sourceEventId: "e1",
    year: 1,
    category: "personal",
    headline: "A deed was done.",
    relatedEntityIds: [],
  };
  await eventRepository.append(event);
  await historyRepository.append(entry);

  const loaded = await worldRepository.loadAll();
  assert.ok(loaded);
  assert.deepEqual(loaded.events, [event]);
  assert.deepEqual(loaded.history, [entry]);
});

test("worldRepository: migrates a legacy (pre-combat, save v3) player onto the current shape", async () => {
  // Old player: 6 D&D attributes + classId + stamina, NO combat stats,
  // level above the new cap of 12.
  const legacyPlayer = {
    id: "player_old",
    name: "Old Hero",
    classId: "warrior",
    strength: 14,
    dexterity: 12,
    constitution: 13,
    intelligence: 8,
    wisdom: 10,
    charisma: 11,
    stamina: 5,
    maxStamina: 10,
    level: 15,
    xp: 50,
    hp: 20,
    maxHp: 40,
    gold: 120,
    currentSettlementId: "s1",
    inventoryItemIds: ["item_iron_sword"],
  };
  await seedMeta("saveVersion", "3");
  await seedMeta("player", JSON.stringify(legacyPlayer));
  await seedMeta("currentDate", JSON.stringify({ year: 212, season: "spring", day: 1 }));

  const loaded = await worldRepository.loadAll();
  assert.ok(loaded);
  const p = loaded.player;

  // Bumped to the current save version regardless of the stored one.
  assert.equal(loaded.saveVersion, CURRENT_SAVE_VERSION);
  // Combat stats introduced fresh at sensible defaults.
  assert.deepEqual(p.stats, { attack: 6, defense: 5, magicPower: 5, magicDefense: 5, speed: 5 });
  // Level clamped into the new [1, 12] range; other numeric fields preserved.
  assert.equal(p.level, 12);
  assert.equal(p.xp, 50);
  assert.equal(p.hp, 20);
  assert.equal(p.maxHp, 40);
  assert.equal(p.gold, 120);
  assert.deepEqual(p.inventoryItemIds, ["item_iron_sword"]);
  // New identity fields default rather than crash.
  assert.equal(p.raceId, "human");
  assert.equal(p.backgroundId, "wanderer");
  assert.deepEqual(p.equipmentItemIds, []);
  assert.deepEqual(p.characterAbilityIds, []);
  assert.deepEqual(p.combatAbilityIds, []);
  assert.deepEqual(p.reputations, []);
  // Legacy-only fields do not leak through onto the current shape.
  assert.equal("classId" in p, false);
  assert.equal("strength" in p, false);
  assert.equal("stamina" in p, false);
});

test("worldRepository: a save missing the newer seed/weather meta defaults them instead of failing", async () => {
  // Simulate a very old save: player + clock present, but no seed and no weather rows.
  const player = makeTestWorld().player;
  await seedMeta("saveVersion", "1");
  await seedMeta("player", JSON.stringify(player));
  await seedMeta("currentDate", JSON.stringify({ year: 212, season: "spring", day: 1 }));

  const loaded = await worldRepository.loadAll();
  assert.ok(loaded);
  assert.equal(loaded.seed, 1); // documented default
  assert.deepEqual(loaded.weather, { current: "clear", daysInCurrentState: 0 });
});

test("worldRepository: a modern (v4) player round-trips its combat stats unchanged", async () => {
  const world = makeTestWorld();
  world.player.stats = { attack: 9, defense: 7, magicPower: 3, magicDefense: 4, speed: 8 };
  await worldRepository.saveAll(world);

  const loaded = await worldRepository.loadAll();
  assert.ok(loaded);
  assert.deepEqual(loaded.player.stats, { attack: 9, defense: 7, magicPower: 3, magicDefense: 4, speed: 8 });
});

test("SaveManager: first launch seeds & persists a world; a second launch loads the existing save", async () => {
  const created = await SaveManager.loadOrCreate("Wanderer");
  const world = created.getWorld();
  assert.equal(world.player.name, "Wanderer");
  assert.ok(Object.keys(world.npcs).length > 0, "seed world should contain NPCs");
  assert.equal(await SaveManager.hasExistingSave(), true);

  // A subsequent launch must LOAD the existing save, not re-seed — so the
  // name passed here is ignored because a save already exists.
  const reloaded = await SaveManager.loadOrCreate("SomeoneElse");
  assert.equal(reloaded.getWorld().player.name, "Wanderer");
});
