import * as SQLite from "expo-sqlite";

/**
 * Data layer. Each domain collection is stored as (id, ...indexed columns, data JSON)
 * rather than a fully normalized relational schema. This keeps the mapping between
 * WorldState and storage trivial and safe to extend as new fields are added to domain
 * types, while indexed columns (settlement_id, status, timestamp) still give us fast
 * lookups at the scale the design doc targets (thousands of NPCs, years of history)
 * without full-table JSON scans. Revisit if a specific query pattern proves this
 * insufficient — normalize just that table, not the whole schema.
 */

const DB_NAME = "chronicle.db";

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  await dbInstance.execAsync("PRAGMA journal_mode = WAL;");
  await migrate(dbInstance);
  return dbInstance;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS kingdoms (
      id TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY NOT NULL,
      kingdom_id TEXT NOT NULL,
      destroyed INTEGER NOT NULL DEFAULT 0,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_settlements_kingdom ON settlements(kingdom_id);

    CREATE TABLE IF NOT EXISTS factions (
      id TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS npcs (
      id TEXT PRIMARY KEY NOT NULL,
      settlement_id TEXT NOT NULL,
      alive INTEGER NOT NULL DEFAULT 1,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_npcs_settlement ON npcs(settlement_id);
    CREATE INDEX IF NOT EXISTS idx_npcs_alive ON npcs(alive);

    CREATE TABLE IF NOT EXISTS quests (
      id TEXT PRIMARY KEY NOT NULL,
      status TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status);

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY NOT NULL,
      absolute_day INTEGER NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_day ON events(absolute_day);

    CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY NOT NULL,
      year INTEGER NOT NULL,
      category TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_history_year ON history(year);
  `);
}

/** Test/dev helper — not called from app code paths. */
export async function resetDb(): Promise<void> {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM meta; DELETE FROM kingdoms; DELETE FROM settlements;
    DELETE FROM factions; DELETE FROM npcs; DELETE FROM quests;
    DELETE FROM events; DELETE FROM history;
  `);
}
