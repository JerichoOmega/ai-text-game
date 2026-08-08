import { getDb } from "../db";
import type { WorldEvent } from "@/domain/types";
import { toAbsoluteDay } from "@/domain/types";

interface EventRow {
  id: string;
  data: string;
}

export const eventRepository = {
  async append(event: WorldEvent): Promise<void> {
    const db = await getDb();
    await db.runAsync("INSERT INTO events (id, absolute_day, type, data) VALUES (?, ?, ?, ?)", [
      event.id,
      toAbsoluteDay(event.timestamp),
      event.type,
      JSON.stringify(event),
    ]);
  },

  async getAll(): Promise<WorldEvent[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<EventRow>("SELECT id, data FROM events ORDER BY absolute_day ASC");
    return rows.map((row) => JSON.parse(row.data) as WorldEvent);
  },

  async getRecent(limit: number): Promise<WorldEvent[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<EventRow>(
      "SELECT id, data FROM events ORDER BY absolute_day DESC LIMIT ?",
      [limit]
    );
    return rows.map((row) => JSON.parse(row.data) as WorldEvent);
  },
};
