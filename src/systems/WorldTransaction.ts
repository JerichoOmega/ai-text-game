import type { HistoryEntry, WorldEvent, WorldState } from "@/domain/types";
import type { WorldStateManager } from "./WorldStateManager";
import { eventRepository } from "@/data/repositories/eventRepository";
import { historyRepository } from "@/data/repositories/historyRepository";

export type TransactionOutcome<T> =
  | { committed: true; result: T }
  | { committed: false; stage: "simulate" | "persist"; error: unknown };

/**
 * Appends the append-only log rows (world events + chronicle history)
 * produced during a transaction. Runs INSIDE the persist stage — only after
 * the core world save has already succeeded, and only for records that did
 * not exist before the transaction began (see runTransactionalWorldUpdate).
 * Kept as a private helper so there is exactly one place that turns buffered
 * simulation output into durable log rows.
 */
async function flushAppendOnlyLogs(newEvents: WorldEvent[], newHistory: HistoryEntry[]): Promise<void> {
  for (const event of newEvents) {
    await eventRepository.append(event);
  }
  for (const entry of newHistory) {
    await historyRepository.append(entry);
  }
}

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
 * `replaceWorld`, and only if both stages succeeded — up to that point
 * every mutation happens on `candidate`, a fully independent clone, so a
 * failure at either stage leaves `manager` byte-for-byte exactly as it was
 * when this function was called.
 *
 * Append-only logs (events/history) are transactional too. During
 * simulation, EventEngine.dispatch and HistoryLog.recordIfWorthy add their
 * records ONLY to the candidate's in-memory WorldState — they no longer
 * write to SQLite as they occur. This function computes the records the
 * simulation newly produced (candidate minus the pre-transaction state, by
 * id) and appends them to their repositories inside the persist stage,
 * AFTER the core world save has succeeded. Consequences:
 *   - simulate fails  -> nothing was ever written; candidate discarded.
 *   - persist fails   -> the core save threw before the log flush ran, so
 *                        no event/history rows were written either, and
 *                        `manager` is not committed. World state AND its
 *                        event/history records are all unchanged.
 *   - both succeed    -> world + new events + new history are all durable,
 *                        then `manager` commits.
 * A retry after a failed attempt re-simulates from the unchanged `manager`,
 * producing fresh records, so no duplicate log rows can accumulate.
 *
 * Residual (unchanged from the prior non-atomic save model): the core world
 * save itself writes multiple SQLite statements sequentially and the log
 * flush follows it; a hard crash BETWEEN those writes is still not atomic at
 * the storage layer. What is now guaranteed is that no log row is ever
 * written during simulation or ahead of a successful world save.
 */
export async function runTransactionalWorldUpdate<T>(
  manager: WorldStateManager,
  simulate: (candidate: WorldStateManager) => Promise<T>,
  persist: (world: WorldState) => Promise<void>
): Promise<TransactionOutcome<T>> {
  const candidate = manager.clone();

  // Snapshot the append-only log ids that already exist. Anything the
  // simulation adds beyond these is a NEW record to be flushed on persist.
  const existingEventIds = new Set(manager.getWorld().events.map((e) => e.id));
  const existingHistoryIds = new Set(manager.getWorld().history.map((h) => h.id));

  let result: T;
  try {
    result = await simulate(candidate);
  } catch (error) {
    // Candidate discarded here — nothing about `manager` was ever touched,
    // and no log rows were written (they only live on the candidate).
    return { committed: false, stage: "simulate", error };
  }

  const nextWorld = candidate.getWorld();
  const newEvents = nextWorld.events.filter((e) => !existingEventIds.has(e.id));
  const newHistory = nextWorld.history.filter((h) => !existingHistoryIds.has(h.id));

  try {
    await persist(nextWorld);
    // Only reached once the core world save has succeeded. If this throws,
    // we report a persist-stage failure and discard the candidate below, so
    // `manager` — and the event/history repositories — stay unchanged.
    await flushAppendOnlyLogs(newEvents, newHistory);
  } catch (error) {
    return { committed: false, stage: "persist", error };
  }

  // Both stages succeeded. Commit is a single synchronous assignment.
  manager.replaceWorld(nextWorld);
  return { committed: true, result };
}
