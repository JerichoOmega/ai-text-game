import { getDb } from "../db";
import type { HistoryEntry } from "@/domain/types";

interface HistoryRow {
  id: string;
  data: string;
}

export const historyRepository = {
  /** History is append-only by design: real chronicles are never edited, only added to. */
  async append(entry: HistoryEntry): Promise<void> {
    const db = await getDb();
    await db.runAsync("INSERT INTO history (id, year, category, data) VALUES (?, ?, ?, ?)", [
      entry.id,
      entry.year,
      entry.category,
      JSON.stringify(entry),
    ]);
  },

  async getAll(): Promise<HistoryEntry[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<HistoryRow>("SELECT id, data FROM history ORDER BY year ASC");
    return rows.map((row) => JSON.parse(row.data) as HistoryEntry);
  },

  async getByYear(year: number): Promise<HistoryEntry[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<HistoryRow>(
      "SELECT id, data FROM history WHERE year = ? ORDER BY id ASC",
      [year]
    );
    return rows.map((row) => JSON.parse(row.data) as HistoryEntry);
  },
};
