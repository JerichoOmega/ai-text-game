import { getDb } from "../db";
import type { NPC, EntityId } from "@/domain/types";

interface NpcRow {
  id: string;
  data: string;
}

export const npcRepository = {
  async upsert(npc: NPC): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO npcs (id, settlement_id, alive, data) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET settlement_id = excluded.settlement_id,
         alive = excluded.alive, data = excluded.data`,
      [npc.id, npc.settlementId, npc.alive ? 1 : 0, JSON.stringify(npc)]
    );
  },

  async upsertMany(npcs: NPC[]): Promise<void> {
    for (const npc of npcs) {
      await this.upsert(npc);
    }
  },

  async getById(id: EntityId): Promise<NPC | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<NpcRow>("SELECT id, data FROM npcs WHERE id = ?", [id]);
    return row ? (JSON.parse(row.data) as NPC) : null;
  },

  async getBySettlement(settlementId: EntityId): Promise<NPC[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<NpcRow>("SELECT id, data FROM npcs WHERE settlement_id = ?", [
      settlementId,
    ]);
    return rows.map((row) => JSON.parse(row.data) as NPC);
  },

  async getAll(): Promise<NPC[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<NpcRow>("SELECT id, data FROM npcs");
    return rows.map((row) => JSON.parse(row.data) as NPC);
  },

  async getAllAlive(): Promise<NPC[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<NpcRow>("SELECT id, data FROM npcs WHERE alive = 1");
    return rows.map((row) => JSON.parse(row.data) as NPC);
  },
};
