import type { PlayerCharacter, EntityId, ReputationScope } from "@/domain/types";

const TITLE_THRESHOLDS: Array<{ min: number; title: string }> = [
  { min: 80, title: "Living Legend" },
  { min: 50, title: "Hero of the Realm" },
  { min: 20, title: "Well-Regarded" },
  { min: -20, title: "" }, // neutral, no title
  { min: -50, title: "Troublemaker" },
  { min: -100, title: "Wanted Criminal" },
];

function titleFor(standing: number): string {
  const match = TITLE_THRESHOLDS.find((t) => standing >= t.min);
  return match?.title ?? "";
}

export const ReputationSystem = {
  /** Returns a new PlayerCharacter with the given scope's standing adjusted and titles refreshed. */
  adjust(player: PlayerCharacter, scope: ReputationScope, regionId: EntityId | "global", delta: number): PlayerCharacter {
    const existing = player.reputations.find((r) => r.scope === scope && r.regionId === regionId);
    const nextStanding = Math.max(-100, Math.min(100, (existing?.standing ?? 0) + delta));
    const title = titleFor(nextStanding);
    const nextEntry = { scope, regionId, standing: nextStanding, titles: title ? [title] : [] };

    const reputations = existing
      ? player.reputations.map((r) => (r.scope === scope && r.regionId === regionId ? nextEntry : r))
      : [...player.reputations, nextEntry];

    return { ...player, reputations };
  },

  getStanding(player: PlayerCharacter, scope: ReputationScope, regionId: EntityId | "global"): number {
    return player.reputations.find((r) => r.scope === scope && r.regionId === regionId)?.standing ?? 0;
  },

  /** Global reputation is a convenience read — the aggregate the player is best known by, independent of any one kingdom/settlement/faction. */
  getGlobalStanding(player: PlayerCharacter): number {
    return this.getStanding(player, "global", "global");
  },
};
