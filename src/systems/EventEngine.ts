import type { WorldEvent } from "@/domain/types";
import { createId } from "@/utils/id";
import type { WorldStateManager } from "./WorldStateManager";
import { eventBus, type DispatchInput } from "./EventBus";
import { Logger } from "@/utils/logger";

export type { DispatchInput } from "./EventBus";

const MAX_CASCADE_DEPTH = 8;

/**
 * The only class that creates WorldEvents. It does not know
 * what a "bandit leader" or a "settlement" is — all of that reactive logic
 * lives in eventSubscribers/, which this reaches only through EventBus.emit.
 * This is what Phase 2 means by "no gameplay system should directly call
 * another gameplay system when reacting to world events": EventEngine used
 * to own a CONSEQUENCE_RULES table that called NPCMemorySystem and mutated
 * settlements directly; that table has moved to eventSubscribers/*.ts.
 *
 * Persistence note: the new event is added to the in-memory WorldState only.
 * It is NOT written to SQLite here — the append-only log flush is owned by
 * WorldTransaction, which writes new events/history during the persist
 * stage, after the core world save succeeds. This keeps event rows from
 * being written mid-simulation (and orphaned if persistence later fails).
 */
export const EventEngine = {
  async dispatch(manager: WorldStateManager, input: DispatchInput, depth = 0): Promise<WorldEvent> {
    const event: WorldEvent = {
      id: createId("evt"),
      type: input.type,
      timestamp: input.timestamp,
      description: input.description,
      affectedEntityIds: input.affectedEntityIds,
      causedByEventId: input.causedByEventId ?? null,
      originatedFromPlayer: input.originatedFromPlayer ?? false,
    };

    const world = manager.getWorld();
    manager.replaceWorld({ ...world, events: [...world.events, event] });

    if (depth < MAX_CASCADE_DEPTH) {
      await eventBus.emit(event, {
        manager,
        dispatch: (followUp) => this.dispatch(manager, followUp, depth + 1),
      });
    } else {
      // A misconfigured subscriber is trying to cascade forever — stop
      // silently rather than crash the simulation tick.
      Logger.warn("EventEngine", `max cascade depth reached at event type "${event.type}"`);
    }

    return event;
  },
};
