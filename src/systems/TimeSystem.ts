import type { WorldStateManager } from "./WorldStateManager";
import { SimulationEngine } from "./SimulationEngine";

export interface AdvanceResult {
  logLines: string[];
}

/**
 * Kept as a thin wrapper around SimulationEngine so existing callers
 * (useWorldStore, and anything else already calling TimeSystem.advance)
 * don't need to change — per Phase 1, working functionality is preserved
 * rather than replaced. All the actual pipeline logic now lives in
 * SimulationEngine, which is the class Phase 3 asks for as "the only class
 * responsible for advancing world time." New code should call
 * SimulationEngine directly; this wrapper exists for compatibility only.
 */
export const TimeSystem = {
  async advance(manager: WorldStateManager, days: number): Promise<AdvanceResult> {
    return SimulationEngine.advance(manager, days);
  },
};
