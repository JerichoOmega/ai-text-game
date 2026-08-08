import type { GameDate } from "./time";

export type EntityId = string;

export interface Kingdom {
  id: EntityId;
  name: string;
  rulerId: EntityId | null; // NPC id; null if throne is vacant
  treasury: number;
  /** 0-100. Low stability increases odds of revolt/succession events. */
  stability: number;
  atWarWithKingdomIds: EntityId[];
  foundedOn: GameDate;
}

export type SettlementType = "village" | "town" | "city";

export interface Settlement {
  id: EntityId;
  name: string;
  kingdomId: EntityId;
  type: SettlementType;
  population: number;
  /** 0-100. Drives shop availability and quest flavor. */
  prosperity: number;
  /** 0-100. Low values mean bandits/monsters threaten nearby roads. */
  roadSafety: number;
  destroyed: boolean;
  destroyedOn: GameDate | null;
  controllingFactionId: EntityId | null;
}
