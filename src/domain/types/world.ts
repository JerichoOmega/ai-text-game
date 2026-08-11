import type { GameDate } from "./time";
import type { EntityId, Kingdom, Settlement } from "./kingdom";
import type { Faction } from "./faction";
import type { NPC } from "./npc";
import type { WorldEvent, HistoryEntry } from "./event";
import type { Quest } from "./quest";
import type { RegionalReputation } from "./reputation";
import type { WeatherState } from "./weather";

export interface PlayerStats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface PlayerCharacter {
  id: EntityId;
  name: string;
  classId: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  stats: PlayerStats;
  gold: number;
  currentSettlementId: EntityId;
  inventoryItemIds: EntityId[];
  reputations: RegionalReputation[];
}

/**
 * The full serializable world. This is the single source of truth every
 * system reads from and writes to; SaveManager persists exactly this shape.
 * Nothing important should live outside of it.
 */
export interface WorldState {
  saveVersion: number;
  /**
   * The run's world seed. Set once at creation and persisted; deterministic
   * world choices (currently: recurring shopkeeper selection) derive from it,
   * so the same seed reproduces the same roster and a save reloads identically.
   */
  seed: number;
  currentDate: GameDate;
  weather: WeatherState;
  player: PlayerCharacter;
  kingdoms: Record<EntityId, Kingdom>;
  settlements: Record<EntityId, Settlement>;
  factions: Record<EntityId, Faction>;
  npcs: Record<EntityId, NPC>;
  quests: Record<EntityId, Quest>;
  /** Full causal event stream, append-only. */
  events: WorldEvent[];
  /** Curated player-facing timeline, append-only. */
  history: HistoryEntry[];
}
