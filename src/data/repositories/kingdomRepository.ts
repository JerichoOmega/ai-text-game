import { getDb } from "../db";
import type { Kingdom, Settlement, EntityId } from "@/domain/types";

interface Row {
  id: string;
  data: string;
}

export const kingdomRepository = {
  async upsertKingdom(kingdom: Kingdom): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO kingdoms (id, data) VALUES (?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
      [kingdom.id, JSON.stringify(kingdom)]
    );
  },

  async getAllKingdoms(): Promise<Kingdom[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<Row>("SELECT id, data FROM kingdoms");
    return rows.map((row) => JSON.parse(row.data) as Kingdom);
  },

  async upsertSettlement(settlement: Settlement): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO settlements (id, kingdom_id, destroyed, data) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET kingdom_id = excluded.kingdom_id,
         destroyed = excluded.destroyed, data = excluded.data`,
      [settlement.id, settlement.kingdomId, settlement.destroyed ? 1 : 0, JSON.stringify(settlement)]
    );
  },

  async getSettlementById(id: EntityId): Promise<Settlement | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<Row>("SELECT id, data FROM settlements WHERE id = ?", [id]);
    return row ? (JSON.parse(row.data) as Settlement) : null;
  },

  async getAllSettlements(): Promise<Settlement[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<Row>("SELECT id, data FROM settlements");
    return rows.map((row) => JSON.parse(row.data) as Settlement);
  },
};
