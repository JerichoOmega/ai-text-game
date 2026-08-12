import type { EntityId } from "@/domain/types";

/** What the caller wants the GM to focus on when a context is built. */
export type GmFocus =
  | { kind: "scene" }
  | { kind: "npc"; npcId: EntityId }
  | { kind: "quest"; questId: EntityId }
  | { kind: "player_action"; text: string };

/** Coarse, non-authoritative summaries — never exact numbers the model
 *  could quote back as if it decided them (see Phase 3 spec §2/§4). */
export type Band = "none" | "low" | "moderate" | "high" | "critical";

export interface LocationSummary {
  settlementId: EntityId;
  name: string;
  prosperity: Band;
  roadSafety: Band;
  destroyed: boolean;
}

export interface TimeSummary {
  year: number;
  season: string;
  day: number;
  weather: string;
}

export interface PlayerSummary {
  name: string;
  level: number;
  health: Band; // hp/maxHp bucketed
  wealth: Band; // gold bucketed
  currentSettlementId: EntityId;
}

export interface NpcSummary {
  npcId: EntityId;
  name: string;
  role: string;
  relationship: Band; // playerRelationship bucketed
  prominentMemories: string[]; // short summaries only
  here: boolean;
}

export interface QuestSummary {
  questId: EntityId;
  title: string;
  status: string;
  giverNpcId: EntityId;
  objectives: { label: string; complete: boolean }[];
}

export interface EventSummary {
  type: string;
  description: string;
}

export interface HistorySummary {
  year: number;
  category: string;
  headline: string;
}

/**
 * Provider-agnostic, plain-data snapshot handed to the Game Master. It holds
 * NO reference to WorldState and no live objects — only compact, bounded
 * summaries across the four tiers from the Phase 3 spec. The `allowedEntityIds`
 * set is the id allow-list: any AI proposal referencing an id outside it is
 * rejected downstream (see ProposalValidator).
 */
export interface GmContext {
  schemaVersion: number;
  focus: GmFocus;
  shortTerm: { location: LocationSummary; time: TimeSummary; player: PlayerSummary; recentLog: string[] };
  session: { npcsPresent: NpcSummary[]; activeQuests: QuestSummary[]; rumors: string[]; recentEvents: EventSummary[] };
  persistent: { focusNpc: NpcSummary | null; relevantReputations: { scope: string; standing: Band }[] };
  history: HistorySummary[];
  allowedEntityIds: EntityId[];
}

export const GM_CONTEXT_SCHEMA_VERSION = 1;

/** True if `id` is present in the context's allow-list. */
export function isAllowedEntity(context: GmContext, id: EntityId): boolean {
  return context.allowedEntityIds.includes(id);
}
