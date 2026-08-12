import { test } from "node:test";
import assert from "node:assert/strict";

import { WorldStateManager } from "@/systems/WorldStateManager";
import { buildGmContext } from "@/systems/ai/context/ContextBuilder";
import { GameMaster } from "@/systems/ai/GameMaster";
import { RemoteProvider } from "@/systems/ai/providers/RemoteProvider";
import { applyGmProposals } from "@/systems/ai/apply/applyProposals";
import { NarrativeDialogue } from "@/systems/ai/narrative/NarrativeDialogue";
import { DEFAULT_AI_CONFIG } from "@/systems/ai/aiConfig";
import type { GmContext } from "@/systems/ai/context/GmContext";
import type { GmResult } from "@/systems/ai/contract/GmOutput";

import { handleGatewayRequest, type GatewayDeps } from "../server/gateway";
import { loadGatewayConfig } from "../server/config";
import { RateLimiter } from "../server/rateLimit";
import { MockGatewayProvider, mockMemoryBatch } from "../server/provider/MockGatewayProvider";
import type { GatewayProvider } from "../server/provider/GatewayProvider";
import type { ProviderMessages } from "../server/prompt/serialize";
import { makeTestNpc, makeTestSettlement, makeTestWorld } from "./testHelpers";
import type { GameDate } from "@/domain/types";

/**
 * Phase 3C-2: mock end-to-end loop. The entire pipeline runs IN PROCESS — the
 * client fetch is bridged straight into the real gateway handler, whose
 * provider is a deterministic mock. No network, no secret, no real AI. AI stays
 * OFF by default; applyProposals remains the only authoritative mutation path.
 */

const NOW: GameDate = { year: 1, season: "spring", day: 1 };

/** Counts calls so tests can assert the provider was (or was not) reached. */
class SpyMock implements GatewayProvider {
  readonly id = "spy-mock";
  calls = 0;
  constructor(private readonly inner: MockGatewayProvider) {}
  isConfigured(): boolean {
    return true;
  }
  complete(messages: ProviderMessages, opts: { signal: AbortSignal }): Promise<string> {
    this.calls += 1;
    return this.inner.complete(messages, opts);
  }
}

function makeDeps(provider: GatewayProvider): GatewayDeps {
  const config = loadGatewayConfig({});
  return { config, provider, rateLimiter: new RateLimiter(config.rateLimit) };
}

/** Bridges the client's fetch call directly into the gateway handler. */
function makeGatewayFetch(deps: GatewayDeps): typeof fetch {
  return (async (_url: string, init: { headers?: Record<string, string>; body?: string }) => {
    const result = await handleGatewayRequest(init.body ?? "", init.headers ?? {}, deps);
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      json: async () => result.body,
    } as unknown as Response;
  }) as unknown as typeof fetch;
}

function remoteVia(deps: GatewayDeps, clientId = "chronicle-prototype"): RemoteProvider {
  return new RemoteProvider({ gatewayUrl: "https://gw.local/gm", clientId, sessionId: "sess_e2e", fetchImpl: makeGatewayFetch(deps) });
}

function setup() {
  const settlement = makeTestSettlement("settlement_1", { name: "Eastbridge" });
  const npc = makeTestNpc("npc_0", { name: "Elara", settlementId: "settlement_1", playerRelationship: 0, memories: [] });
  const manager = new WorldStateManager(makeTestWorld({ settlements: { settlement_1: settlement }, npcs: { npc_0: npc } }));
  const context = buildGmContext(manager, { kind: "scene" });
  return { manager, context };
}

function val<T>(r: GmResult<T>): T {
  return r.ok ? r.value : r.fallback;
}

const okPersist = async () => {};
const failPersist = async () => {
  throw new Error("disk full");
};

// --- Test A: full successful loop -------------------------------------------
test("A: a deterministic mock response travels the whole pipeline and mutates state via applyProposals", async () => {
  const { manager, context } = setup();
  const provider = new SpyMock(new MockGatewayProvider("text", mockMemoryBatch("npc_0", 60, "Helped me in the market.")));
  const gm = new GameMaster(remoteVia(makeDeps(provider)));

  const result = await gm.reactToPlayerAction({ context, actionText: "I help Elara at her stall." });

  assert.equal(provider.calls, 1, "mock provider was invoked once");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.source, "ai");
    assert.equal(result.value.proposals.length, 1);
    assert.equal(result.value.proposals[0]!.kind, "record_memory");
  }

  const batch = val(result);
  const report = await applyGmProposals(manager, context, batch, NOW, okPersist);
  assert.equal(report.committed, true);
  assert.equal(report.applied.length, 1);
  const npc = manager.getWorld().npcs.npc_0!;
  assert.equal(npc.memories.length, 1);
  assert.equal(npc.memories[0]!.sentiment, 60);
  assert.equal(npc.memories[0]!.summary, "Helped me in the market.");
  assert.ok(npc.playerRelationship > 0);
});

// --- Test B: invalid AI output cannot mutate state --------------------------
test("B: an invalid/forbidden proposal is rejected at the gateway and never mutates state", async () => {
  const { manager, context } = setup();
  const forbidden = JSON.stringify({ schemaVersion: 1, proposals: [{ kind: "set_hp", value: 1 }] });
  const provider = new SpyMock(new MockGatewayProvider("text", forbidden));
  const gm = new GameMaster(remoteVia(makeDeps(provider)));
  const before = JSON.stringify(manager.getWorld());

  const result = await gm.reactToPlayerAction({ context, actionText: "cheat my HP" });
  assert.equal(provider.calls, 1);
  assert.equal(result.ok, false); // gateway output validation rejected it

  // Even the fallback batch changes nothing when applied.
  const report = await applyGmProposals(manager, context, val(result), NOW, okPersist);
  assert.equal(report.committed, false);
  assert.equal(JSON.stringify(manager.getWorld()), before);
});

// --- Test C: persistence failure rolls back ---------------------------------
test("C: a persistence failure during apply leaves authoritative state byte-for-byte unchanged", async () => {
  const { manager, context } = setup();
  const provider = new SpyMock(new MockGatewayProvider("text", mockMemoryBatch("npc_0", 60)));
  const gm = new GameMaster(remoteVia(makeDeps(provider)));
  const before = JSON.stringify(manager.getWorld());

  const result = await gm.reactToPlayerAction({ context, actionText: "help out" });
  assert.equal(result.ok, true);

  const report = await applyGmProposals(manager, context, val(result), NOW, failPersist);
  assert.equal(report.committed, false);
  assert.equal(report.stage, "persist");
  assert.equal(JSON.stringify(manager.getWorld()), before);
  assert.equal(manager.getWorld().npcs.npc_0!.memories.length, 0);
});

// --- Test D: AI remains OFF by default --------------------------------------
test("D: with AI disabled the normal path never contacts the gateway (zero calls)", async () => {
  const { manager } = setup();
  let fetchCalls = 0;
  const spyFetch = (async () => {
    fetchCalls += 1;
    return { ok: true, status: 200, json: async () => ({}) } as unknown as Response;
  }) as unknown as typeof fetch;

  const gm = new GameMaster(new RemoteProvider({ gatewayUrl: "https://gw.local/gm", fetchImpl: spyFetch }));
  const dialogue = new NarrativeDialogue(DEFAULT_AI_CONFIG, gm); // AI off (default)
  const npc = manager.getWorld().npcs.npc_0!;
  const res = await dialogue.getGreeting(npc, manager);

  assert.equal(res.source, "deterministic");
  assert.equal(fetchCalls, 0, "gateway must not be contacted while AI is off");
});

// --- Test E: gateway/provider failure ---------------------------------------
test("E: a failing provider maps through the failure model into a clean fallback (no mutation)", async () => {
  const { manager, context } = setup();
  const provider = new SpyMock(new MockGatewayProvider("throw"));
  const gm = new GameMaster(remoteVia(makeDeps(provider)));
  const before = JSON.stringify(manager.getWorld());

  const result = await gm.reactToPlayerAction({ context, actionText: "do something" });
  assert.equal(provider.calls, 1);
  assert.equal(result.ok, false);
  assert.equal(result.source, "fallback");
  assert.equal(JSON.stringify(manager.getWorld()), before); // GameMaster is effect-free
});

// --- Test F: no direct mutation bypass --------------------------------------
test("F: obtaining a valid AI batch changes nothing until applyProposals runs", async () => {
  const { manager, context } = setup();
  const provider = new SpyMock(new MockGatewayProvider("text", mockMemoryBatch("npc_0", 60)));
  const gm = new GameMaster(remoteVia(makeDeps(provider)));
  const before = JSON.stringify(manager.getWorld());

  const result = await gm.reactToPlayerAction({ context, actionText: "help" });
  assert.equal(result.ok, true);
  // The provider/GameMaster path is effect-free: world is still unchanged here.
  assert.equal(JSON.stringify(manager.getWorld()), before);

  // Only the authoritative choke point mutates.
  await applyGmProposals(manager, context, val(result), NOW, okPersist);
  assert.notEqual(JSON.stringify(manager.getWorld()), before);
});

// --- Security boundary preserved end-to-end ---------------------------------
test("security: a bad client id is rejected by gateway auth even through the mock loop", async () => {
  const { manager, context } = setup();
  const provider = new SpyMock(new MockGatewayProvider("text", mockMemoryBatch("npc_0", 60)));
  const gm = new GameMaster(remoteVia(makeDeps(provider), "not-the-right-client"));
  const before = JSON.stringify(manager.getWorld());

  const result = await gm.reactToPlayerAction({ context, actionText: "help" });
  assert.equal(provider.calls, 0, "auth must reject before the provider is ever called");
  assert.equal(result.ok, false);
  assert.equal(JSON.stringify(manager.getWorld()), before);
});

// --- Determinism ------------------------------------------------------------
test("determinism: the successful loop yields identical gameplay state and proposals every run", async () => {
  const snapshots: string[] = [];
  for (let i = 0; i < 3; i++) {
    const { manager, context } = setup();
    const provider = new SpyMock(new MockGatewayProvider("text", mockMemoryBatch("npc_0", 60, "A steady kindness.")));
    const gm = new GameMaster(remoteVia(makeDeps(provider)));
    const result = await gm.reactToPlayerAction({ context, actionText: "help" });
    const batch = val(result);
    await applyGmProposals(manager, context, batch, NOW, okPersist);
    const npc = manager.getWorld().npcs.npc_0!;
    snapshots.push(
      JSON.stringify({
        proposals: batch,
        relationship: npc.playerRelationship,
        memoryCount: npc.memories.length,
        sentiment: npc.memories[0]?.sentiment,
        summary: npc.memories[0]?.summary,
      })
    );
  }
  assert.equal(snapshots[0], snapshots[1]);
  assert.equal(snapshots[1], snapshots[2]);
});
