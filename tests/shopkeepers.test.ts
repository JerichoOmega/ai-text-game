import { test } from "node:test";
import assert from "node:assert/strict";
import { SHOPKEEPERS, selectRoster, assignShopkeepers, getShopkeeper } from "../src/data/shopkeepers";
import { makeTestNpc, makeTestSettlement } from "./testHelpers";
import type { NPC, Settlement } from "../src/domain/types";

/** Tests the recurring-shopkeeper roster: authored catalog, deterministic
 * per-seed selection, and stable assignment onto existing NPC slots. All
 * node-safe (the portrait `require`s live in a separate RN-only module). */

test("catalog: all 10 authored shopkeepers resolve with role + specialty", () => {
  assert.equal(SHOPKEEPERS.length, 10);
  for (const s of SHOPKEEPERS) {
    assert.ok(s.name && s.shopTitle && s.greeting, `${s.id} missing fields`);
    assert.ok(s.role === "merchant" || s.role === "innkeeper");
    assert.equal(getShopkeeper(s.id)?.id, s.id);
  }
  assert.equal(SHOPKEEPERS.filter((s) => s.role === "innkeeper").length, 1, "exactly one innkeeper (Tobias)");
});

test("selection is deterministic per seed and always includes Tobias + a merchant", () => {
  assert.deepEqual(selectRoster(42), selectRoster(42));
  const roster = selectRoster(42);
  assert.ok(roster.includes("tobias"), "Tobias always present");
  assert.ok(roster.some((id) => getShopkeeper(id)!.role === "merchant"), "at least one merchant present");
});

test("different seeds can produce different rosters", () => {
  const base = JSON.stringify(selectRoster(1));
  let differs = false;
  for (let s = 2; s < 60 && !differs; s++) {
    if (JSON.stringify(selectRoster(s)) !== base) differs = true;
  }
  assert.ok(differs, "expected some seed to yield a different roster than seed 1");
});

function fixtureWorld() {
  const settlements: Record<string, Settlement> = {
    s1: makeTestSettlement("s1", { type: "city", population: 1000 }),
    s2: makeTestSettlement("s2", { type: "village", population: 200 }),
  };
  const npcs: Record<string, NPC> = {
    n1: makeTestNpc("n1", { role: "merchant", settlementId: "s1" }),
    n2: makeTestNpc("n2", { role: "merchant", settlementId: "s2" }),
    n3: makeTestNpc("n3", { role: "innkeeper", settlementId: "s1" }),
    n4: makeTestNpc("n4", { role: "guard", settlementId: "s1" }),
  };
  return { settlements, npcs };
}

test("only selected shopkeepers are assigned; non-shop NPCs are never touched", () => {
  const seed = 7;
  const present = new Set(selectRoster(seed));
  const { settlements, npcs } = fixtureWorld();
  const out = assignShopkeepers(npcs, settlements, seed);

  for (const n of Object.values(out)) {
    if (n.shopkeeperId) assert.ok(present.has(n.shopkeeperId), `${n.shopkeeperId} not in roster`);
  }
  assert.equal(out.n4!.shopkeeperId, undefined, "a guard never becomes a shopkeeper");
  assert.equal(out.n3!.shopkeeperId, "tobias", "innkeeper slot takes Tobias");
  assert.equal(out.n3!.name, "Tobias");
});

test("assignment is stable across calls (reload determinism) and never duplicates a shopkeeper", () => {
  const seed = 99;
  const { settlements, npcs } = fixtureWorld();
  const a = assignShopkeepers(npcs, settlements, seed);
  const b = assignShopkeepers(npcs, settlements, seed);

  const mapOf = (w: Record<string, NPC>) =>
    Object.fromEntries(Object.values(w).map((n) => [n.id, n.shopkeeperId ?? null]));
  assert.deepEqual(mapOf(a), mapOf(b), "same seed -> identical assignment");

  const assigned = Object.values(a).map((n) => n.shopkeeperId).filter(Boolean);
  assert.equal(new Set(assigned).size, assigned.length, "no shopkeeper placed twice");
});

test("assigned shopkeeperId survives a JSON round-trip (persistence shape)", () => {
  const { settlements, npcs } = fixtureWorld();
  const out = assignShopkeepers(npcs, settlements, 5);
  const restored = JSON.parse(JSON.stringify(out.n3)) as NPC;
  assert.equal(restored.shopkeeperId, "tobias");
});

test("assignShopkeepers does not mutate its input", () => {
  const { settlements, npcs } = fixtureWorld();
  assignShopkeepers(npcs, settlements, 3);
  assert.equal(npcs.n1!.shopkeeperId, undefined, "original npc map left unchanged");
});
