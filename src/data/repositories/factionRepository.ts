import { getDb } from "../db";
import type { Faction, EntityId } from "@/domain/types";

interface FactionRow {
  id: string;
  data: string;
}

export const factionRepository = {
  async upsert(faction: Faction): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO factions (id, data) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
      [faction.id, JSON.stringify(faction)]
    );
  },

  async getById(id: EntityId): Promise<Faction | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<FactionRow>("SELECT id, data FROM factions WHERE id = ?", [id]);
    return row ? (JSON.parse(row.data) as Faction) : null;
  },

  async getAll(): Promise<Faction[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<FactionRow>("SELECT id, data FROM factions");
    return rows.map((row) => JSON.parse(row.data) as Faction);
  },
};
