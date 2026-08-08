import type { EntityId } from "./kingdom";

/**
 * Phase 9 (layered reputation): which scope a RegionalReputation entry
 * applies to. Kingdom/settlement/faction all map onto existing entity ids;
 * "global" has no id (use "global" as the literal regionId). Guild,
 * religion, and family reputation are deliberately NOT modeled yet — there
 * is no Guild, Religion, or Family entity in the domain layer today, and
 * adding this enum value without the entity behind it would be a label with
 * nothing to attach to. Add those scopes when the entities exist.
 */
export type ReputationScope = "global" | "kingdom" | "settlement" | "faction";

export interface RegionalReputation {
  /** Kingdom, settlement, or faction id this standing applies to; "global" for the global scope. */
  regionId: EntityId | "global";
  scope: ReputationScope;
  /** -100 (wanted criminal) to 100 (living legend). */
  standing: number;
  titles: string[];
}
