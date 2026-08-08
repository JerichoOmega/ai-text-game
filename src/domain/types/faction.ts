import type { EntityId } from "./kingdom";

export type FactionGoalType =
  | "expand_territory"
  | "accumulate_wealth"
  | "destroy_rival"
  | "protect_settlement"
  | "seize_throne";

export interface FactionGoal {
  type: FactionGoalType;
  targetId: EntityId | null;
  /** 0-100, how actively the faction is pursuing this right now. */
  priority: number;
}

export interface Faction {
  id: EntityId;
  name: string;
  /** 0-100 aggregate strength: membership, wealth, military. */
  power: number;
  homeSettlementId: EntityId | null;
  goals: FactionGoal[];
  /** -100 (blood feud) to 100 (allied), keyed by other faction id. */
  relationships: Record<EntityId, number>;
  /** -100 (hostile) to 100 (beloved), the player's standing with this faction. */
  playerStanding: number;
}
