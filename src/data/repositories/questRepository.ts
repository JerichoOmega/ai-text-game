import { getDb } from "../db";
import type { Quest, QuestStatus, EntityId } from "@/domain/types";

interface QuestRow {
  id: string;
  data: string;
}

export const questRepository = {
  async upsert(quest: Quest): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO quests (id, status, data) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status = excluded.status, data = excluded.data`,
      [quest.id, quest.status, JSON.stringify(quest)]
    );
  },

  async getById(id: EntityId): Promise<Quest | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<QuestRow>("SELECT id, data FROM quests WHERE id = ?", [id]);
    return row ? (JSON.parse(row.data) as Quest) : null;
  },

  async getByStatus(status: QuestStatus): Promise<Quest[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<QuestRow>("SELECT id, data FROM quests WHERE status = ?", [status]);
    return rows.map((row) => JSON.parse(row.data) as Quest);
  },

  async getAll(): Promise<Quest[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<QuestRow>("SELECT id, data FROM quests");
    return rows.map((row) => JSON.parse(row.data) as Quest);
  },
};
