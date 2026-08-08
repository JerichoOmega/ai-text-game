import type { WorldState } from "@/domain/types";
import type { WorldStateManager } from "./WorldStateManager";

export type TransactionOutcome<T> =
  | { committed: true; result: T }
  | { committed: false; stage: "simulate" | "persist"; error: unknown };

/**
 * Chronicle's world-state transaction boundary. See DESIGN_SYSTEM.md's
 * "World-state transaction boundary" section for the full invariant this
 * exists to guarantee; the short version:
 *
 *   Simulation produces a candidate state. Persistence succeeds before
 *   that candidate becomes authoritative application state.
 *
 * This is deliberately NOT a generic transaction framework — it has
 * exactly one shape (clone -> simulate -> persist -> commit-by-reference-
 * swap), because that's the one shape Chronicle's mutation flow actually
 * needs. `manager` is only ever mutated at the very end, by
 * `replaceWorld`, and only if both callbacks succeeded — up to that point
 * every mutation happens on `candidate`, a fully independent clone, so a
 * failure at either stage leaves `manager` byte-for-byte exactly as it was
 * when this function was called.
 *
 * Known, accepted scope boundary (documented, not fixed here — see
 * DESIGN_SYSTEM.md): `simulate` may internally cause direct SQLite writes
 * that do NOT go through `persist` and are therefore NOT rolled back by a
 * later failure — specifically, EventEngine.dispatch and
 * HistoryLog.recordIfWorthy append directly to their own repositories as
 * events occur, independent of whichever WorldStateManager instance
 * (real or candidate) triggered them. This function guarantees
 * consistency for the core WorldState fields
 * (player/clock/weather/kingdoms/settlements/factions/npcs/quests) that
 * `persist` actually writes; it does not and cannot retroactively un-write
 * an event/history row that was already appended before `persist` failed.
 */
export async function runTransactionalWorldUpdate<T>(
  manager: WorldStateManager,
  simulate: (candidate: WorldStateManager) => Promise<T>,
  persist: (world: WorldState) => Promise<void>
): Promise<TransactionOutcome<T>> {
  const candidate = manager.clone();

  let result: T;
  try {
    result = await simulate(candidate);
  } catch (error) {
    // Candidate discarded here — nothing about `manager` was ever touched.
    return { committed: false, stage: "simulate", error };
  }

  try {
    await persist(candidate.getWorld());
  } catch (error) {
    // Simulation succeeded but persistence didn't — candidate is STILL
    // discarded. This is the exact bug being fixed: without this function,
    // `manager` would already have been mutated by `simulate` regardless
    // of whether `persist` went on to fail.
    return { committed: false, stage: "persist", error };
  }

  // Both stages succeeded. Commit is a single synchronous assignment with
  // no `await` between it and the successful persist above — there is no
  // window where `manager` and the just-persisted disk state can diverge.
  manager.replaceWorld(candidate.getWorld());
  return { committed: true, result };
}
