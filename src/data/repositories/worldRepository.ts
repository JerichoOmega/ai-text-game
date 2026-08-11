import { getDb } from "../db";
import type { GameDate, PlayerCharacter, WeatherState, WorldState } from "@/domain/types";
import { npcRepository } from "./npcRepository";
import { historyRepository } from "./historyRepository";
import { questRepository } from "./questRepository";
import { factionRepository } from "./factionRepository";
import { kingdomRepository } from "./kingdomRepository";
import { eventRepository } from "./eventRepository";

const CURRENT_SAVE_VERSION = 4; // bumped for combat/progression: combat stats, abilities, equipment

const DEFAULT_WEATHER: WeatherState = { current: "clear", daysInCurrentState: 0 };

const DEFAULT_COMBAT_STATS = { attack: 6, defense: 5, magicPower: 5, magicDefense: 5, speed: 5 };

/**
 * Forward-migrates a persisted player onto the current combat/progression
 * shape. Old saves (save v3 and earlier) had 6 D&D attributes, classId,
 * and stamina and NO combat stats/abilities/equipment — those are reset to
 * sensible defaults rather than crashing (accepted, documented migration:
 * an old hero keeps level/xp/gold/hp but starts the new combat model fresh).
 */
function migratePlayer(raw: any): PlayerCharacter {
  const hasCombatStats = raw?.stats && typeof raw.stats.attack === "number";
  const maxHp = typeof raw?.maxHp === "number" ? raw.maxHp : 30;
  return {
    id: raw.id,
    name: raw.name,
    raceId: raw.raceId ?? "human",
    backgroundId: raw.backgroundId ?? "wanderer",
    motivation: raw.motivation ?? "",
    level: Math.min(12, Math.max(1, raw.level ?? 1)),
    xp: raw.xp ?? 0,
    xpToNextLevel: raw.xpToNextLevel ?? 100,
    hp: typeof raw?.hp === "number" ? raw.hp : maxHp,
    maxHp,
    stats: hasCombatStats
      ? { attack: raw.stats.attack, defense: raw.stats.defense, magicPower: raw.stats.magicPower, magicDefense: raw.stats.magicDefense, speed: raw.stats.speed }
      : { ...DEFAULT_COMBAT_STATS },
    gold: raw.gold ?? 0,
    currentSettlementId: raw.currentSettlementId,
    inventoryItemIds: raw.inventoryItemIds ?? [],
    equipmentItemIds: raw.equipmentItemIds ?? [],
    characterAbilityIds: raw.characterAbilityIds ?? [],
    combatAbilityIds: raw.combatAbilityIds ?? [],
    reputations: raw.reputations ?? [],
  };
}

async function getMeta(key: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = ?", [key]);
  return row?.value ?? null;
}

async function setMeta(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export const worldRepository = {
  /** True if a save already exists (used to decide first-run seeding vs. load). */
  async hasSave(): Promise<boolean> {
    const version = await getMeta("saveVersion");
    return version !== null;
  },

  async savePlayerAndClock(player: PlayerCharacter, currentDate: GameDate, weather: WeatherState): Promise<void> {
    await setMeta("saveVersion", String(CURRENT_SAVE_VERSION));
    await setMeta("player", JSON.stringify(player));
    await setMeta("currentDate", JSON.stringify(currentDate));
    await setMeta("weather", JSON.stringify(weather));
  },

  /** Persists the entire WorldState. Collections are upserted independently so a
   *  crash mid-save can't corrupt unrelated tables (each row write is its own statement). */
  async saveAll(world: WorldState): Promise<void> {
    await this.savePlayerAndClock(world.player, world.currentDate, world.weather);
    await setMeta("seed", String(world.seed));
    for (const kingdom of Object.values(world.kingdoms)) {
      await kingdomRepository.upsertKingdom(kingdom);
    }
    for (const settlement of Object.values(world.settlements)) {
      await kingdomRepository.upsertSettlement(settlement);
    }
    for (const faction of Object.values(world.factions)) {
      await factionRepository.upsert(faction);
    }
    await npcRepository.upsertMany(Object.values(world.npcs));
    for (const quest of Object.values(world.quests)) {
      await questRepository.upsert(quest);
    }
    // events/history are append-only logs; callers append incrementally via
    // eventRepository/historyRepository as they occur rather than through saveAll.
  },

  async loadAll(): Promise<WorldState | null> {
    const hasSave = await this.hasSave();
    if (!hasSave) return null;

    const playerJson = await getMeta("player");
    const dateJson = await getMeta("currentDate");
    if (!playerJson || !dateJson) return null;
    // Forward-compatible with pre-weather saves (saveVersion 1): default rather than fail.
    const weatherJson = await getMeta("weather");
    const seedJson = await getMeta("seed");

    const [kingdoms, settlements, factions, npcs, quests, events, history] = await Promise.all([
      kingdomRepository.getAllKingdoms(),
      kingdomRepository.getAllSettlements(),
      factionRepository.getAll(),
      npcRepository.getAll(),
      questRepository.getAll(),
      eventRepository.getAll(),
      historyRepository.getAll(),
    ]);

    return {
      saveVersion: CURRENT_SAVE_VERSION,
      // Older saves predate the world seed; default to a stable value so the
      // save still loads. Shopkeeper assignments were already persisted on
      // the NPC rows, so a missing seed doesn't lose the established roster.
      seed: seedJson ? Number(seedJson) : 1,
      currentDate: JSON.parse(dateJson) as GameDate,
      weather: weatherJson ? (JSON.parse(weatherJson) as WeatherState) : DEFAULT_WEATHER,
      // Migrate the persisted player onto the current combat/progression
      // shape (see migratePlayer) so pre-combat-milestone saves still load.
      player: migratePlayer(JSON.parse(playerJson)),
      kingdoms: Object.fromEntries(kingdoms.map((k) => [k.id, k])),
      settlements: Object.fromEntries(settlements.map((s) => [s.id, s])),
      factions: Object.fromEntries(factions.map((f) => [f.id, f])),
      npcs: Object.fromEntries(npcs.map((n) => [n.id, n])),
      quests: Object.fromEntries(quests.map((q) => [q.id, q])),
      events,
      history,
    };
  },
};
