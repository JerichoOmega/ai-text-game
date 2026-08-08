import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, compareDates, describeDaysAgo, toAbsoluteDay, type GameDate } from "../src/domain/types/time";

test("toAbsoluteDay is monotonic across season/year boundaries", () => {
  const spring1: GameDate = { year: 1, season: "spring", day: 1 };
  const winter30: GameDate = { year: 1, season: "winter", day: 30 };
  const nextYear: GameDate = { year: 2, season: "spring", day: 1 };
  assert.ok(toAbsoluteDay(spring1) < toAbsoluteDay(winter30));
  assert.ok(toAbsoluteDay(winter30) < toAbsoluteDay(nextYear));
});

test("addDays rolls over season and year boundaries correctly", () => {
  const start: GameDate = { year: 1, season: "spring", day: 30 };
  const next = addDays(start, 1);
  assert.deepEqual(next, { year: 1, season: "summer", day: 1 });

  const yearEnd: GameDate = { year: 1, season: "winter", day: 30 };
  const rollover = addDays(yearEnd, 1);
  assert.deepEqual(rollover, { year: 2, season: "spring", day: 1 });
});

test("addDays is reversible with compareDates (round trip)", () => {
  const start: GameDate = { year: 3, season: "autumn", day: 12 };
  const forward = addDays(start, 47);
  assert.equal(compareDates(forward, start) > 0, true);
  const back = addDays(forward, -47);
  assert.deepEqual(back, start);
});

test("describeDaysAgo produces stable, ordered phrasing", () => {
  const now: GameDate = { year: 5, season: "summer", day: 1 };
  assert.equal(describeDaysAgo(now, now), "just now");
  assert.equal(describeDaysAgo(addDays(now, -1), now), "yesterday");
  assert.match(describeDaysAgo(addDays(now, -10), now), /days ago/);
  assert.match(describeDaysAgo(addDays(now, -60), now), /season/);
  assert.match(describeDaysAgo(addDays(now, -400), now), /year/);
});
