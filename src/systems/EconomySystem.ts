import type { WorldStateManager } from "./WorldStateManager";

/**
 * Deliberately simple linear model for the vertical slice: prosperity drifts
 * toward an equilibrium set by road safety and population, kingdoms collect
 * modest tax income from their settlements. Replace the formulas, not the
 * shape of this system, as the simulation grows more sophisticated.
 */
export const EconomySystem = {
  tick(manager: WorldStateManager): void {
    const world = manager.getWorld();

    for (const settlement of Object.values(world.settlements)) {
      if (settlement.destroyed) continue;
      const equilibrium = Math.round(settlement.roadSafety * 0.6 + Math.min(settlement.population / 50, 40));
      const drift = Math.sign(equilibrium - settlement.prosperity) * Math.min(3, Math.abs(equilibrium - settlement.prosperity));
      const nextProsperity = Math.max(0, Math.min(100, settlement.prosperity + drift));
      const populationGrowth = settlement.prosperity > 60 ? Math.round(settlement.population * 0.01) : 0;

      manager.setSettlement({
        ...settlement,
        prosperity: nextProsperity,
        population: settlement.population + populationGrowth,
      });
    }

    for (const kingdom of Object.values(world.kingdoms)) {
      const settlements = manager.getSettlementsInKingdom(kingdom.id).filter((s) => !s.destroyed);
      const taxIncome = settlements.reduce((sum, s) => sum + Math.round(s.prosperity * 0.5), 0);
      manager.setKingdom({ ...kingdom, treasury: kingdom.treasury + taxIncome });
    }
  },
};
