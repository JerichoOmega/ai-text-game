import { eventBus } from "../EventBus";

export function registerWorldConsequenceSubscriber(): void {
  eventBus.on("bandit_leader_slain", async (event, ctx) => {
    for (const settlementId of event.affectedEntityIds) {
      const settlement = ctx.manager.getSettlement(settlementId);
      if (!settlement || settlement.destroyed) continue;
      ctx.manager.setSettlement({ ...settlement, roadSafety: Math.min(100, settlement.roadSafety + 25) });
      await ctx.dispatch({
        type: "trade_route_opened",
        timestamp: event.timestamp,
        description: `The roads near ${settlement.name} are safe again now that the bandits have scattered.`,
        affectedEntityIds: [settlement.id],
        causedByEventId: event.id,
      });
    }
  });

  eventBus.on("trade_route_opened", (event, ctx) => {
    for (const settlementId of event.affectedEntityIds) {
      const settlement = ctx.manager.getSettlement(settlementId);
      if (!settlement || settlement.destroyed) continue;
      ctx.manager.setSettlement({ ...settlement, prosperity: Math.min(100, settlement.prosperity + 10) });
    }
  });

  eventBus.on("settlement_destroyed", (event, ctx) => {
    for (const settlementId of event.affectedEntityIds) {
      const settlement = ctx.manager.getSettlement(settlementId);
      if (!settlement) continue;
      ctx.manager.setSettlement({ ...settlement, destroyed: true, destroyedOn: event.timestamp });
    }
  });

  eventBus.on("ruler_died", (event, ctx) => {
    const [kingdomId] = event.affectedEntityIds;
    if (!kingdomId) return;
    const kingdom = ctx.manager.getKingdom(kingdomId);
    if (!kingdom) return;
    ctx.manager.setKingdom({ ...kingdom, rulerId: null, stability: Math.max(0, kingdom.stability - 20) });
  });

  eventBus.on("merchant_bankrupt", (event, ctx) => {
    const [settlementId] = event.affectedEntityIds;
    if (!settlementId) return;
    const settlement = ctx.manager.getSettlement(settlementId);
    if (!settlement || settlement.destroyed) return;
    ctx.manager.setSettlement({ ...settlement, prosperity: Math.max(0, settlement.prosperity - 15) });
  });
}
