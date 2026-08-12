import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { getDb as getWebDb, resetDb as resetWebDb } from "@/data/db.web";
import { npcRepository } from "@/data/repositories/npcRepository";
import { kingdomRepository } from "@/data/repositories/kingdomRepository";
import { factionRepository } from "@/data/repositories/factionRepository";
import { questRepository } from "@/data/repositories/questRepository";
import { eventRepository } from "@/data/repositories/eventRepository";
import { historyRepository } from "@/data/repositories/historyRepository";
import type { Faction, HistoryEntry, Quest, WorldEvent } from "@/domain/types";
import { makeTestNpc, makeTestSettlement } from "./testHelpers";

/**
 * Tests the web SQLite adapter (src/data/db.web.ts) — the localStorage /
 * in-memory persistence path Metro picks on Expo Web in place of the native
 * expo-sqlite module. This is the branch's whole reason for existing and had
 * ZERO automated coverage before now.
 *
 * Two layers:
 *   Part A — drives db.web directly with the EXACT SQL statement shapes the
 *            repositories issue, so a change to the interpreter (or to a repo
 *            query) that breaks web-only persistence fails here.
 *   Part B — round-trips real domain objects through the actual repositories.
 *            In Node those repositories reach db.ts, whose `expo-sqlite`
 *            import is redirected to db.web's engine via the test stub
 *            (tests/stubs/expo-sqlite.ts) — so this exercises the real
 *            repository code on top of the web adapter.
 *
 * Under Node there is no `localStorage`, so db.web transparently runs fully
 * in-memory (see its `storage()` guard). `resetDb()` clears that store
 * between tests.
 */

// Exact upsert/select statements copied verbatim from worldRepository.setMeta /
// getMeta so the test breaks if the adapter stops understanding them.
const META_UPSERT =
  "INSERT INTO meta (key, value) VALUES (?, ?)\n     ON CONFLICT(key) DO UPDATE SET value = excluded.value";
const META_SELECT = "SELECT value FROM meta WHERE key = ?";

beforeEach(async () => {
  await resetWebDb();
});

// --- Part A: raw SQL statement shapes the repositories rely on --------------

test("db.web: meta upsert then select returns the latest value (INSERT ... ON CONFLICT DO UPDATE)", async () => {
  const db = await getWebDb();
  await db.runAsync(META_UPSERT, ["saveVersion", "1"]);
  await db.runAsync(META_UPSERT, ["saveVersion", "4"]); // conflict -> update, not a second row

  const row = await db.getFirstAsync<{ value: string }>(META_SELECT, ["saveVersion"]);
  assert.equal(row?.value, "4");
});

test("db.web: getFirst on a missing meta key returns null", async () => {
  const db = await getWebDb();
  const row = await db.getFirstAsync<{ value: string }>(META_SELECT, ["does-not-exist"]);
  assert.equal(row, null);
});

test("db.web: table upsert inserts once then updates in place on id conflict", async () => {
  const db = await getWebDb();
  const upsert = `INSERT INTO kingdoms (id, data) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data`;

  await db.runAsync(upsert, ["k1", JSON.stringify({ v: 1 })]);
  await db.runAsync(upsert, ["k1", JSON.stringify({ v: 2 })]);

  const rows = await db.getAllAsync<{ id: string; data: string }>("SELECT id, data FROM kingdoms");
  assert.equal(rows.length, 1);
  const first = rows[0];
  assert.ok(first);
  assert.deepEqual(JSON.parse(first.data), { v: 2 });
});

test("db.web: WHERE id = ? selects the matching row only", async () => {
  const db = await getWebDb();
  const upsert = `INSERT INTO factions (id, data) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data`;
  await db.runAsync(upsert, ["f1", JSON.stringify({ name: "One" })]);
  await db.runAsync(upsert, ["f2", JSON.stringify({ name: "Two" })]);

  const row = await db.getFirstAsync<{ id: string; data: string }>(
    "SELECT id, data FROM factions WHERE id = ?",
    ["f2"]
  );
  assert.ok(row);
  assert.deepEqual(JSON.parse(row.data), { name: "Two" });
});

test("db.web: WHERE status = ? filters (parameterised, string column)", async () => {
  const db = await getWebDb();
  const upsert = `INSERT INTO quests (id, status, data) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status = excluded.status, data = excluded.data`;
  await db.runAsync(upsert, ["q1", "available", JSON.stringify({ id: "q1" })]);
  await db.runAsync(upsert, ["q2", "completed", JSON.stringify({ id: "q2" })]);
  await db.runAsync(upsert, ["q3", "available", JSON.stringify({ id: "q3" })]);

  const rows = await db.getAllAsync<{ id: string; data: string }>(
    "SELECT id, data FROM quests WHERE status = ?",
    ["available"]
  );
  assert.deepEqual(rows.map((r) => r.id).sort(), ["q1", "q3"]);
});

test("db.web: WHERE settlement_id = ? and WHERE alive = 1 (numeric literal) both filter npcs", async () => {
  const db = await getWebDb();
  const upsert = `INSERT INTO npcs (id, settlement_id, alive, data) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET settlement_id = excluded.settlement_id, alive = excluded.alive, data = excluded.data`;
  await db.runAsync(upsert, ["n1", "s1", 1, JSON.stringify({ id: "n1" })]);
  await db.runAsync(upsert, ["n2", "s1", 0, JSON.stringify({ id: "n2" })]);
  await db.runAsync(upsert, ["n3", "s2", 1, JSON.stringify({ id: "n3" })]);

  const inS1 = await db.getAllAsync<{ id: string }>("SELECT id, data FROM npcs WHERE settlement_id = ?", ["s1"]);
  assert.deepEqual(inS1.map((r) => r.id).sort(), ["n1", "n2"]);

  const alive = await db.getAllAsync<{ id: string }>("SELECT id, data FROM npcs WHERE alive = 1");
  assert.deepEqual(alive.map((r) => r.id).sort(), ["n1", "n3"]);
});

test("db.web: ORDER BY ASC/DESC and LIMIT ? behave as the event repository expects", async () => {
  const db = await getWebDb();
  const insert = "INSERT INTO events (id, absolute_day, type, data) VALUES (?, ?, ?, ?)";
  await db.runAsync(insert, ["e1", 10, "t", JSON.stringify({ id: "e1" })]);
  await db.runAsync(insert, ["e2", 30, "t", JSON.stringify({ id: "e2" })]);
  await db.runAsync(insert, ["e3", 20, "t", JSON.stringify({ id: "e3" })]);

  const asc = await db.getAllAsync<{ id: string }>("SELECT id, data FROM events ORDER BY absolute_day ASC");
  assert.deepEqual(asc.map((r) => r.id), ["e1", "e3", "e2"]);

  const recent = await db.getAllAsync<{ id: string }>(
    "SELECT id, data FROM events ORDER BY absolute_day DESC LIMIT ?",
    [2]
  );
  assert.deepEqual(recent.map((r) => r.id), ["e2", "e3"]);
});

test("db.web: resetDb clears every table and meta", async () => {
  const db = await getWebDb();
  await db.runAsync(META_UPSERT, ["saveVersion", "4"]);
  await db.runAsync("INSERT INTO events (id, absolute_day, type, data) VALUES (?, ?, ?, ?)", [
    "e1",
    1,
    "t",
    "{}",
  ]);

  await resetWebDb();

  const meta = await db.getFirstAsync<{ value: string }>(META_SELECT, ["saveVersion"]);
  const events = await db.getAllAsync<{ id: string }>("SELECT id, data FROM events ORDER BY absolute_day ASC");
  assert.equal(meta, null);
  assert.equal(events.length, 0);
});

// --- Part B: repository round-trips over the web adapter ---------------------

test("repositories: npc upsert -> getById / getBySettlement / getAllAlive round-trip", async () => {
  const alive = makeTestNpc("n_alive", { settlementId: "s1", alive: true, name: "Alive" });
  const dead = makeTestNpc("n_dead", { settlementId: "s1", alive: false, name: "Dead" });
  const elsewhere = makeTestNpc("n_far", { settlementId: "s2", alive: true, name: "Far" });

  await npcRepository.upsertMany([alive, dead, elsewhere]);

  assert.deepEqual(await npcRepository.getById("n_alive"), alive);
  assert.equal((await npcRepository.getBySettlement("s1")).length, 2);
  assert.deepEqual((await npcRepository.getAllAlive()).map((n) => n.id).sort(), ["n_alive", "n_far"]);
  assert.equal((await npcRepository.getAll()).length, 3);
});

test("repositories: kingdom + settlement upsert/read-back preserves the full object", async () => {
  const settlement = makeTestSettlement("s1", { name: "Testburg", prosperity: 42 });
  await kingdomRepository.upsertKingdom({
    id: "k1",
    name: "Testonia",
    rulerId: null,
    treasury: 100,
    stability: 60,
    atWarWithKingdomIds: [],
    foundedOn: { year: 1, season: "spring", day: 1 },
  });
  await kingdomRepository.upsertSettlement(settlement);

  assert.equal((await kingdomRepository.getAllKingdoms())[0]?.name, "Testonia");
  assert.deepEqual(await kingdomRepository.getSettlementById("s1"), settlement);
});

test("repositories: faction upsert -> getById / getAll", async () => {
  const faction: Faction = {
    id: "f1",
    name: "Guild",
    power: 50,
    homeSettlementId: "s1",
    goals: [{ type: "accumulate_wealth", targetId: null, priority: 70 }],
    relationships: {},
    playerStanding: 0,
  };
  await factionRepository.upsert(faction);
  assert.deepEqual(await factionRepository.getById("f1"), faction);
  assert.equal((await factionRepository.getAll()).length, 1);
});

test("repositories: quest upsert -> getByStatus reflects the latest status after re-upsert", async () => {
  const quest: Quest = {
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
    issuedOn: { year: 1, season: "spring", day: 1 },
    expiresOn: null,
  };
  await questRepository.upsert(quest);
  assert.equal((await questRepository.getByStatus("available")).length, 1);

  await questRepository.upsert({ ...quest, status: "completed" });
  assert.equal((await questRepository.getByStatus("available")).length, 0);
  assert.equal((await questRepository.getByStatus("completed")).length, 1);
  assert.equal((await questRepository.getById("q1"))?.status, "completed");
});

test("repositories: event append preserves insertion/day order (ASC) and getRecent (DESC LIMIT)", async () => {
  const mk = (id: string, day: number): WorldEvent => ({
    id,
    type: "monster_migration",
    timestamp: { year: 1, season: "spring", day },
    description: `event ${id}`,
    affectedEntityIds: [],
    causedByEventId: null,
    originatedFromPlayer: false,
  });
  await eventRepository.append(mk("e1", 1));
  await eventRepository.append(mk("e2", 3));
  await eventRepository.append(mk("e3", 2));

  assert.deepEqual((await eventRepository.getAll()).map((e) => e.id), ["e1", "e3", "e2"]);
  assert.deepEqual((await eventRepository.getRecent(2)).map((e) => e.id), ["e2", "e3"]);
});

test("repositories: history append -> getAll (ASC by year) and getByYear filter", async () => {
  const mk = (id: string, year: number): HistoryEntry => ({
    id,
    sourceEventId: "seed",
    year,
    category: "military",
    headline: `headline ${id}`,
    relatedEntityIds: [],
  });
  await historyRepository.append(mk("h1", 211));
  await historyRepository.append(mk("h2", 210));
  await historyRepository.append(mk("h3", 211));

  assert.deepEqual((await historyRepository.getAll()).map((h) => h.id), ["h2", "h1", "h3"]);
  assert.deepEqual((await historyRepository.getByYear(211)).map((h) => h.id).sort(), ["h1", "h3"]);
});
