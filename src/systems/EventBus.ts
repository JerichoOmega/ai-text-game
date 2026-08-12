import type { EntityId, GameDate, WorldEvent, WorldEventType } from "@/domain/types";
import type { WorldStateManager } from "./WorldStateManager";
import { Logger } from "@/utils/logger";

/**
 * Passed to every handler so subscribers can cascade follow-up events
 * (e.g. "bandits scatter" -> "roads safer" -> "trade opens") without
 * importing EventEngine directly, which would recreate the tight coupling
 * this bus exists to remove. `dispatch` is bound by EventEngine at call
 * time and carries the recursion-depth guard with it.
 */
export interface EventContext {
  manager: WorldStateManager;
  dispatch: (input: DispatchInput) => Promise<WorldEvent>;
}

export interface DispatchInput {
  type: WorldEventType;
  /**
   * Optional pre-assigned event id. The world simulation supplies a
   * deterministic id here (see simulationEventId) so a reproduced simulation
   * mints identical event ids; all other callers omit it and EventEngine
   * falls back to a random createId.
   */
  id?: EntityId;
  timestamp: GameDate;
  description: string;
  affectedEntityIds: EntityId[];
  causedByEventId?: EntityId | null;
  originatedFromPlayer?: boolean;
}

export type EventHandler = (event: WorldEvent, ctx: EventContext) => Promise<void> | void;

const WILDCARD = "*" as const;

/**
 * Deliberately simple in-process pub/sub — no external message queue, since
 * everything runs on-device and synchronously with the simulation clock.
 * Handlers run in registration order (deterministic per Phase 3/12), and one
 * handler throwing does not prevent the others from running, since a bug in
 * e.g. the rumor system shouldn't be able to stop history from being recorded.
 */
class EventBus {
  private handlers = new Map<WorldEventType | typeof WILDCARD, EventHandler[]>();

  /** Subscribe to a specific event type. */
  on(type: WorldEventType, handler: EventHandler): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  /** Subscribe to every event type — used by HistoryLog, which decides worthiness itself. */
  onAny(handler: EventHandler): void {
    const list = this.handlers.get(WILDCARD) ?? [];
    list.push(handler);
    this.handlers.set(WILDCARD, list);
  }

  /** Removes all handlers. Exposed for tests that need a clean bus between cases. */
  reset(): void {
    this.handlers.clear();
  }

  async emit(event: WorldEvent, ctx: EventContext): Promise<void> {
    const specific = this.handlers.get(event.type) ?? [];
    const wildcard = this.handlers.get(WILDCARD) ?? [];
    for (const handler of [...wildcard, ...specific]) {
      try {
        await handler(event, ctx);
      } catch (err) {
        // A single bad subscriber must not break the simulation tick or
        // silently swallow the event for everyone else. Surface and continue.
        Logger.error("EventBus", `handler failed for ${event.type}`, err);
      }
    }
  }
}

export const eventBus = new EventBus();
