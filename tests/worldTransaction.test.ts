import { test } from "node:test";
import assert from "node:assert/strict";
import { WorldStateManager } from "../src/systems/WorldStateManager";
import { runTransactionalWorldUpdate } from "../src/systems/WorldTransaction";
import { makeTestNpc, makeTestWorld } from "./testHelpers";

function makeManager() {
  const npc = makeTestNpc("npc_1", { playerRelationship: 0 });
  return new WorldStateManager(makeTestWorld({ npcs: { [npc.id]: npc } }));
}

/** A "simulate" that mutates the candidate in an observable, cheap way — a
 * relationship bump — standing in for whatever TimeSystem.advance would
 * really do. Kept independent of TimeSystem/SimulationEngine deliberately:
 * those pull in EventEngine -> eventRepository -> expo-sqlite, which
 * cannot run under plain node (see tests/README-equivalent notes in
 * DESIGN_SYSTEM.md's testing section). This tests the transaction
 * mechanism itself, not the specific simulation it happens to wrap. */
function bumpRelationship(candidate: WorldStateManager): void {
  const npc = candidate.getNpc("npc_1")!;
  candidate.setNpc({ ...npc, playerRelationship: npc.playerRelationship + 10 });
}

test("simulation failure: manager is left byte-for-byte unchanged", async () => {
  const manager = makeManager();
  const before = manager.getWorld();

  const outcome = await runTransactionalWorldUpdate(
    manager,
    async () => {
      throw new Error("simulated failure mid-simulation");
    },
    async () => {
      assert.fail("persist should never be called if simulate throws");
    }
  );

  assert.equal(outcome.committed, false);
  if (!outcome.committed) assert.equal(outcome.stage, "simulate");
  assert.deepEqual(manager.getWorld(), before);
  assert.equal(manager.getNpc("npc_1")!.playerRelationship, 0);
});

test("save failure after successful simulation: candidate is discarded, manager unchanged", async () => {
  const manager = makeManager();
  const before = manager.getWorld();

  const outcome = await runTransactionalWorldUpdate(
    manager,
    async (candidate) => {
      bumpRelationship(candidate); // simulation succeeds and DOES mutate the candidate
      return "sim-result";
    },
    async () => {
      throw new Error("simulated disk write failure");
    }
  );

  assert.equal(outcome.committed, false);
  if (!outcome.committed) assert.equal(outcome.stage, "persist");
  // The critical assertion: even though simulate() successfully mutated
  // its candidate, `manager` (the authoritative instance) must be
  // completely untouched — this is the exact bug being fixed.
  assert.deepEqual(manager.getWorld(), before);
  assert.equal(manager.getNpc("npc_1")!.playerRelationship, 0);
});

test("successful simulation + successful save: commits atomically", async () => {
  const manager = makeManager();

  const outcome = await runTransactionalWorldUpdate(
    manager,
    async (candidate) => {
      bumpRelationship(candidate);
      return "sim-result";
    },
    async () => {
      /* persistence succeeds */
    }
  );

  assert.equal(outcome.committed, true);
  if (outcome.committed) assert.equal(outcome.result, "sim-result");
  assert.equal(manager.getNpc("npc_1")!.playerRelationship, 10);
});

test("subsequent action after a failed save succeeds cleanly from the pre-failure state", async () => {
  const manager = makeManager();

  const failed = await runTransactionalWorldUpdate(
    manager,
    async (candidate) => bumpRelationship(candidate),
    async () => {
      throw new Error("disk full");
    }
  );
  assert.equal(failed.committed, false);
  assert.equal(manager.getNpc("npc_1")!.playerRelationship, 0);

  // Retry, this time persistence succeeds.
  const retried = await runTransactionalWorldUpdate(
    manager,
    async (candidate) => bumpRelationship(candidate),
    async () => {
      /* succeeds */
    }
  );

  assert.equal(retried.committed, true);
  // Exactly one bump landed (from the retry), not two — confirms the
  // failed attempt's mutation never leaked into `manager` for the retry
  // to build on top of.
  assert.equal(manager.getNpc("npc_1")!.playerRelationship, 10);
});

test("reload after a failed save confirms the persisted world was not advanced", async () => {
  const manager = makeManager();
  // Stand-in "disk" — a variable `persist` writes to only when it
  // succeeds, mirroring worldRepository.saveAll actually writing to SQLite.
  let disk: unknown = null;

  const outcome = await runTransactionalWorldUpdate(
    manager,
    async (candidate) => bumpRelationship(candidate),
    async () => {
      throw new Error("disk write failed before `disk` was assigned");
    }
  );

  assert.equal(outcome.committed, false);
  // "Reload" == read `disk`. It was never written to, so a reload would
  // see nothing — never the failed candidate's advanced state. In the
  // real app this maps to worldRepository.loadAll() still returning
  // whatever the last SUCCESSFUL save wrote, not the failed attempt.
  assert.equal(disk, null);
});

test("clone() produces a fully independent manager — mutating the clone never touches the original", () => {
  const manager = makeManager();
  const clone = manager.clone();

  bumpRelationship(clone);

  assert.equal(clone.getNpc("npc_1")!.playerRelationship, 10);
  assert.equal(manager.getNpc("npc_1")!.playerRelationship, 0);
  // Also confirms the clone isn't sharing nested object references with
  // the original (a shallow clone would fail this — mutating the NPC
  // record in one would show up in the other via the shared reference).
  assert.notEqual(clone.getWorld().npcs, manager.getWorld().npcs);
});
