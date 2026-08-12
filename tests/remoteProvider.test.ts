import { test } from "node:test";
import assert from "node:assert/strict";

import { RemoteProvider } from "@/systems/ai/providers/RemoteProvider";
import { GM_OUTPUT_SCHEMA_VERSION } from "@/systems/ai/contract/GmOutput";
import { WorldStateManager } from "@/systems/WorldStateManager";
import { buildGmContext } from "@/systems/ai/context/ContextBuilder";
import type { GmContext } from "@/systems/ai/context/GmContext";
import type { ProviderRequest } from "@/systems/ai/providers/AIProvider";
import { makeTestNpc, makeTestSettlement, makeTestWorld } from "./testHelpers";

/**
 * Phase 3C-1: client RemoteProvider. It never contacts a real service (fetch
 * is injected/mocked) and must fail cleanly into a not-ok ProviderResponse so
 * the GameMaster falls back to deterministic gameplay.
 */

function context(): GmContext {
  const settlement = makeTestSettlement("settlement_1", { name: "Eastbridge" });
  const npc = makeTestNpc("npc_0", { settlementId: "settlement_1" });
  const m = new WorldStateManager(makeTestWorld({ settlements: { settlement_1: settlement }, npcs: { npc_0: npc } }));
  return buildGmContext(m, { kind: "scene" });
}

function req(): ProviderRequest {
  return { operation: "narrate", system: "", user: "", expectJson: true, context: context() };
}

function mockResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

test("RemoteProvider is unconfigured by default and reports so (no network)", async () => {
  const provider = new RemoteProvider();
  assert.equal(provider.isConfigured(), false);
  const res = await provider.complete(req());
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.reason, "unconfigured");
});

test("RemoteProvider returns provider text on a gateway success (mock fetch)", async () => {
  const output = { schemaVersion: GM_OUTPUT_SCHEMA_VERSION, narrative: "A quiet dawn." };
  const fetchImpl = (async () => mockResponse(200, { ok: true, correlationId: "gw_x", output })) as unknown as typeof fetch;
  const provider = new RemoteProvider({ gatewayUrl: "https://gw.local/gm", fetchImpl });
  const res = await provider.complete(req());
  assert.equal(res.ok, true);
  if (res.ok) assert.equal(res.text, JSON.stringify(output));
});

test("RemoteProvider maps a gateway failure reason into a ProviderResponse reason", async () => {
  const fetchImpl = (async () =>
    mockResponse(429, { ok: false, correlationId: "gw_x", reason: "rate_limited" })) as unknown as typeof fetch;
  const provider = new RemoteProvider({ gatewayUrl: "https://gw.local/gm", fetchImpl });
  const res = await provider.complete(req());
  assert.equal(res.ok, false);
  if (!res.ok) assert.equal(res.reason, "rate_limited");
});

test("RemoteProvider fails cleanly when fetch throws (network) — never rejects", async () => {
  const fetchImpl = (async () => {
    throw new Error("connection refused");
  }) as unknown as typeof fetch;
  const provider = new RemoteProvider({ gatewayUrl: "https://gw.local/gm", fetchImpl });
  const res = await provider.complete(req());
  assert.equal(res.ok, false);
  if (!res.ok) assert.ok(res.reason === "network" || res.reason === "timeout");
});

test("RemoteProvider fails cleanly when no context is supplied", async () => {
  const provider = new RemoteProvider({ gatewayUrl: "https://gw.local/gm", fetchImpl: (async () => mockResponse(200, {})) as unknown as typeof fetch });
  const res = await provider.complete({ operation: "narrate", system: "", user: "", expectJson: true });
  assert.equal(res.ok, false);
});
