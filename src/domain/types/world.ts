import type { GameDate } from "./time";
import type { EntityId, Kingdom, Settlement } from "./kingdom";
import type { Faction } from "./faction";
import type { NPC } from "./npc";
import type { WorldEvent, HistoryEntry } from "./event";
import type { Quest } from "./quest";
import type { RegionalReputation } from "./reputation";
import type { WeatherState } from "./weather";

/**
 * The six MVP combat statistics (Part 8 of the combat/progression design).
 * HP is tracked separately on PlayerCharacter/Combatant (current + max);
 * these five drive all damage/turn-order math. No other combat attributes.
 */
export interface CombatStats {
  attack: number;
  defense: number;
  magicPower: number;
  magicDefense: number;
  speed: number;
}

export interface PlayerCharacter {
  id: EntityId;
  name: string;
  /** Identity, not a class — see src/data/origins.ts. */
  raceId: string;
  backgroundId: string;
  /** Short narrative motivation chosen at creation (flavor only). */
  motivation: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  hp: number;
  maxHp: number;
  /** Base combat stats before equipment. Effective stats = base + equipment. */
  stats: CombatStats;
  gold: number;
  currentSettlementId: EntityId;
  inventoryItemIds: EntityId[];
  /** Equipped items that modify combat stats (see src/data/equipment.ts). */
  equipmentItemIds: EntityId[];
  /** Unlocked non-combat (world/dialogue) ability ids — see src/data/abilities.ts. */
  characterAbilityIds: string[];
  /** Unlocked combat ability ids. */
  combatAbilityIds: string[];
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
  /**
   * Live state of the simulation's seeded RNG (mulberry32 accumulator). Set
   * from the seed at creation and advanced as the day-loop consumes random
   * draws (weather, background events); persisted so a save/reload resumes
   * the exact same random sequence rather than restarting it. See
   * src/utils/rng.ts (SeededRng) and SimulationEngine.advance.
   */
  rngCursor: number;
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
