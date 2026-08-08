import { test } from "node:test";
import assert from "node:assert/strict";
import { eventBus } from "../src/systems/EventBus";
import type { WorldEvent } from "../src/domain/types";

function makeEvent(overrides: Partial<WorldEvent> = {}): WorldEvent {
  return {
    id: "evt_test",
    type: "monster_migration",
    timestamp: { year: 1, season: "spring", day: 1 },
    description: "test event",
    affectedEntityIds: [],
    causedByEventId: null,
    originatedFromPlayer: false,
    ...overrides,
  };
}

test("handlers run in registration order: wildcard before type-specific", async () => {
  eventBus.reset();
  const calls: string[] = [];
  eventBus.onAny(() => {
    calls.push("wildcard");
  });
  eventBus.on("monster_migration", () => {
    calls.push("specific");
  });

  await eventBus.emit(makeEvent(), { manager: {} as any, dispatch: async () => makeEvent() });

  assert.deepEqual(calls, ["wildcard", "specific"]);
});

test("multiple specific handlers for the same type run in the order they were registered", async () => {
  eventBus.reset();
  const calls: string[] = [];
  eventBus.on("weather_changed", () => {
    calls.push("first");
  });
  eventBus.on("weather_changed", () => {
    calls.push("second");
  });

  await eventBus.emit(makeEvent({ type: "weather_changed" }), {
    manager: {} as any,
    dispatch: async () => makeEvent(),
  });

  assert.deepEqual(calls, ["first", "second"]);
});

test("a throwing handler does not prevent other handlers from running", async () => {
  eventBus.reset();
  const calls: string[] = [];
  eventBus.on("season_changed", () => {
    throw new Error("boom");
  });
  eventBus.on("season_changed", () => {
    calls.push("survived");
  });

  await eventBus.emit(makeEvent({ type: "season_changed" }), {
    manager: {} as any,
    dispatch: async () => makeEvent(),
  });

  assert.deepEqual(calls, ["survived"]);
});

test("handlers only fire for their subscribed type, plus wildcard", async () => {
  eventBus.reset();
  const calls: string[] = [];
  eventBus.on("ruler_died", () => calls.push("ruler_died"));

  await eventBus.emit(makeEvent({ type: "monster_migration" }), {
    manager: {} as any,
    dispatch: async () => makeEvent(),
  });

  assert.deepEqual(calls, []);
});
