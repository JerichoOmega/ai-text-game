import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  NPC_CHARACTERS,
  getNpcCharacter,
  resolveExpressionKey,
  emotionForRelationship,
  selectRecurringRoster,
  assignRecurringNpcs,
} from "../src/data/npcRegistry";
import { SHOPKEEPERS } from "../src/data/shopkeepers";
import { makeTestNpc } from "./testHelpers";
import type { NPC } from "../src/domain/types";

/**
 * Node-safe tests for the 12 canonical recurring-NPC registry, the emotion
 * fallback logic, deterministic per-seed selection/assignment, and on-disk
 * asset coverage. The RN static require() map (npcAssets.ts / portraitForNpc)
 * cannot be imported here (it require()s .png binaries) — its correctness is
 * verified by source inspection + Metro bundling, NOT by these tests, and
 * on-device rendering is not verifiable in this environment.
 */

const ASSET_ROOT = resolve(process.cwd(), "assets/characters/npc");

// ---- 1. Registry integrity ------------------------------------------------

test("registry: exactly 12 canonical characters, unique ids, required metadata", () => {
  assert.equal(NPC_CHARACTERS.length, 12);
  const ids = NPC_CHARACTERS.map((c) => c.id);
  assert.equal(new Set(ids).size, 12, "no duplicate canonical ids");
  for (const c of NPC_CHARACTERS) {
    assert.ok(c.id && c.name && c.gender && c.race, `${c.id} missing metadata`);
    assert.equal(getNpcCharacter(c.id)?.id, c.id);
  }
  assert.equal(getNpcCharacter(undefined), undefined);
  assert.equal(getNpcCharacter("not-a-real-id"), undefined);
});

test("registry: every character ships exactly 6 expression keys (72 total)", () => {
  let total = 0;
  for (const c of NPC_CHARACTERS) {
    assert.equal(c.expressionKeys.length, 6, `${c.id} should have 6 expressions`);
    assert.equal(new Set(c.expressionKeys).size, 6, `${c.id} has duplicate expression keys`);
    total += c.expressionKeys.length;
  }
  assert.equal(total, 72, "12 characters x 6 expressions = 72");
});

// ---- 2. Portrait / expression asset coverage (on disk) --------------------

test("assets: all 12 base portraits exist on disk", () => {
  for (const c of NPC_CHARACTERS) {
    const p = resolve(ASSET_ROOT, "portraits", `${c.id}.png`);
    assert.ok(existsSync(p), `missing base portrait ${c.id}.png`);
  }
});

test("assets: all 72 expression files exist on disk (character_expression.png)", () => {
  let checked = 0;
  for (const c of NPC_CHARACTERS) {
    for (const key of c.expressionKeys) {
      const p = resolve(ASSET_ROOT, "expressions", `${c.id}_${key}.png`);
      assert.ok(existsSync(p), `missing expression ${c.id}_${key}.png`);
      checked++;
    }
  }
  assert.equal(checked, 72);
});

// ---- 3. Emotion fallback ---------------------------------------------------

test("emotion: a supported emotion resolves to its own expression key", () => {
  // Alden owns "friendly"; asking for it returns exactly that.
  assert.equal(resolveExpressionKey("alden", "friendly"), "friendly");
  // Case-insensitive.
  assert.equal(resolveExpressionKey("alden", "FRIENDLY"), "friendly");
});

test("emotion: an unavailable emotion falls back through aliases, else neutral", () => {
  // Caelan has no "friendly" but does have "smirking"/"neutral"; "happy" has
  // no exact match and no owned alias except via the alias table -> a key it owns.
  const key = resolveExpressionKey("caelan", "happy");
  assert.ok(getNpcCharacter("caelan")!.expressionKeys.includes(key), "resolved to an owned key");
  // A totally unknown emotion falls to neutral (every character owns neutral).
  assert.equal(resolveExpressionKey("elara", "zzzz-not-real"), "neutral");
});

test("emotion: resolver never throws and always returns an owned key", () => {
  for (const c of NPC_CHARACTERS) {
    for (const emo of ["happy", "sad", "angry", "confused", "", "NEUTRAL", "suspicious"]) {
      const key = resolveExpressionKey(c.id, emo);
      assert.ok(c.expressionKeys.includes(key), `${c.id}/${emo} -> ${key} not owned`);
    }
  }
  // Unknown character id degrades to "neutral" rather than crashing.
  assert.equal(resolveExpressionKey("ghost", "angry"), "neutral");
});

test("emotion: relationship maps to a base portrait emotion", () => {
  assert.equal(emotionForRelationship(50), "friendly");
  assert.equal(emotionForRelationship(0), "neutral");
  assert.equal(emotionForRelationship(-20), "suspicious");
  assert.equal(emotionForRelationship(-50), "angry");
});

// ---- 4. Separate content pools (resolver precedence guarantee) ------------

test("pools: canonical NPC ids never collide with shopkeeper ids", () => {
  const shopIds = new Set(SHOPKEEPERS.map((s) => s.id));
  for (const c of NPC_CHARACTERS) {
    assert.ok(!shopIds.has(c.id), `${c.id} appears in both pools`);
  }
});

// ---- 5. Deterministic recurring roster ------------------------------------

test("roster: same seed -> identical roster; some seeds differ", () => {
  assert.deepEqual(selectRecurringRoster(42), selectRecurringRoster(42));
  const base = JSON.stringify(selectRecurringRoster(1));
  let differs = false;
  for (let s = 2; s < 80 && !differs; s++) {
    if (JSON.stringify(selectRecurringRoster(s)) !== base) differs = true;
  }
  assert.ok(differs, "expected some seed to differ from seed 1");
});

function ordinaryWorld(): Record<string, NPC> {
  return {
    n1: makeTestNpc("n1", { role: "commoner" }),
    n2: makeTestNpc("n2", { role: "farmer" }),
    n3: makeTestNpc("n3", { role: "guard" }),
    n4: makeTestNpc("n4", { role: "noble" }),
    n5: makeTestNpc("n5", { role: "priest" }),
    m1: makeTestNpc("m1", { role: "merchant", shopkeeperId: "marabelle" }),
    i1: makeTestNpc("i1", { role: "innkeeper", shopkeeperId: "tobias" }),
  };
}

test("assign: canonical identities land only on ordinary NPCs, never shops, no dupes", () => {
  const seed = 7;
  const out = assignRecurringNpcs(ordinaryWorld(), seed);

  // Merchant/innkeeper (shopkeeper) slots are never given a characterId.
  assert.equal(out.m1!.characterId, undefined, "shopkeeper stays a shopkeeper");
  assert.equal(out.i1!.characterId, undefined, "innkeeper stays an innkeeper");

  const assigned = Object.values(out).map((n) => n.characterId).filter(Boolean) as string[];
  assert.equal(new Set(assigned).size, assigned.length, "no canonical identity placed twice");
  for (const id of assigned) {
    assert.ok(getNpcCharacter(id), `${id} is a real canonical character`);
  }
});

test("assign: deterministic across calls (reload stability)", () => {
  const a = assignRecurringNpcs(ordinaryWorld(), 99);
  const b = assignRecurringNpcs(ordinaryWorld(), 99);
  const mapOf = (w: Record<string, NPC>) =>
    Object.fromEntries(Object.values(w).map((n) => [n.id, n.characterId ?? null]));
  assert.deepEqual(mapOf(a), mapOf(b));
});

// ---- 6. No mutation --------------------------------------------------------

test("assign: does not mutate its input map or the source NPCs", () => {
  const input = ordinaryWorld();
  assignRecurringNpcs(input, 3);
  assert.equal(input.n1!.characterId, undefined, "input NPC left untouched");
});

// ---- 7. Persistence shape --------------------------------------------------

test("persistence: characterId survives a JSON round-trip", () => {
  const out = assignRecurringNpcs(ordinaryWorld(), 5);
  const withId = Object.values(out).find((n) => n.characterId);
  assert.ok(withId, "at least one canonical NPC was placed at seed 5");
  const restored = JSON.parse(JSON.stringify(withId)) as NPC;
  assert.equal(restored.characterId, withId!.characterId);
  assert.equal(restored.name, withId!.name);
});
