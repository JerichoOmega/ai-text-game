import { test } from "node:test";
import assert from "node:assert/strict";

import { WorldStateManager } from "@/systems/WorldStateManager";
import { buildGmContext } from "@/systems/ai/context/ContextBuilder";
import { GM_OUTPUT_SCHEMA_VERSION } from "@/systems/ai/contract/GmOutput";
import { GATEWAY_PROTOCOL_VERSION, HEADER_CLIENT_ID, HEADER_SESSION_ID } from "@/systems/ai/gateway/GatewayContract";
import { serializePrompt, PROMPT_VERSION } from "../server/prompt/serialize";
import { loadGatewayConfig, type GatewayConfig } from "../server/config";
import { RateLimiter } from "../server/rateLimit";
import { NullGatewayProvider, type GatewayProvider } from "../server/provider/GatewayProvider";
import { handleGatewayRequest, type GatewayDeps } from "../server/gateway";
import type { ProviderMessages } from "../server/prompt/serialize";
import { makeTestNpc, makeTestSettlement, makeTestWorld } from "./testHelpers";

/**
 * Phase 3C-1: AI Gateway & Security Foundation. Everything here is offline —
 * the provider is always mocked; no real external AI service is ever called.
 */

function worldManager(): WorldStateManager {
  const settlement = makeTestSettlement("settlement_1", { name: "Eastbridge" });
  const npc = makeTestNpc("npc_0", { name: "Elara", settlementId: "settlement_1" });
  return new WorldStateManager(makeTestWorld({ settlements: { settlement_1: settlement }, npcs: { npc_0: npc } }));
}

function ctx() {
  return buildGmContext(worldManager(), { kind: "scene" });
}

function baseRequest(overrides: Record<string, unknown> = {}) {
  return { protocolVersion: GATEWAY_PROTOCOL_VERSION, operation: "narrate", context: ctx(), ...overrides };
}

const AUTH_HEADERS = { [HEADER_CLIENT_ID]: "chronicle-prototype", [HEADER_SESSION_ID]: "sess_abc123" };

/** Configurable mock provider — the only "AI" the gateway ever talks to here. */
class MockProvider implements GatewayProvider {
  readonly id = "mock";
  constructor(
    private readonly behavior: "text" | "throw" | "hang",
    private readonly text = ""
  ) {}
  isConfigured(): boolean {
    return true;
  }
  complete(_messages: ProviderMessages, opts: { signal: AbortSignal }): Promise<string> {
    if (this.behavior === "throw") return Promise.reject(new Error("provider boom"));
    if (this.behavior === "hang") {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener("abort", () => reject(new Error("aborted")));
      });
    }
    return Promise.resolve(this.text);
  }
}

function deps(provider: GatewayProvider, configOverride: Partial<GatewayConfig> = {}): GatewayDeps {
  const config = { ...loadGatewayConfig({}), ...configOverride };
  return { config, provider, rateLimiter: new RateLimiter(config.rateLimit) };
}

function narration(text: string) {
  return JSON.stringify({ schemaVersion: GM_OUTPUT_SCHEMA_VERSION, narrative: text, tone: "neutral" });
}

// --- 1. auth -----------------------------------------------------------------
test("gateway rejects unauthenticated requests", async () => {
  const d = deps(new MockProvider("text", narration("hi")));
  const res = await handleGatewayRequest(JSON.stringify(baseRequest()), {}, d);
  assert.equal(res.status, 401);
  assert.equal(res.body.ok, false);
  if (!res.body.ok) assert.equal(res.body.reason, "unauthenticated");
});

// --- 2. oversized context ----------------------------------------------------
test("gateway rejects an oversized context", async () => {
  const d = deps(new MockProvider("text", narration("hi")), { maxContextBytes: 200 });
  const res = await handleGatewayRequest(JSON.stringify(baseRequest()), AUTH_HEADERS, d);
  assert.equal(res.status, 400);
  if (!res.body.ok) assert.equal(res.body.reason, "invalid_request");
});

// --- 3. invalid schema version ----------------------------------------------
test("gateway rejects an invalid context schema version", async () => {
  const bad = ctx();
  (bad as unknown as Record<string, unknown>).schemaVersion = 999;
  const d = deps(new MockProvider("text", narration("hi")));
  const res = await handleGatewayRequest(JSON.stringify(baseRequest({ context: bad })), AUTH_HEADERS, d);
  assert.equal(res.status, 400);
  if (!res.body.ok) assert.equal(res.body.reason, "invalid_request");
});

// --- raw WorldState rejection ------------------------------------------------
test("gateway rejects a raw WorldState in place of the context", async () => {
  const rawWorld = makeTestWorld({ settlements: { s: makeTestSettlement("s") } });
  const d = deps(new MockProvider("text", narration("hi")));
  const res = await handleGatewayRequest(JSON.stringify(baseRequest({ context: rawWorld })), AUTH_HEADERS, d);
  assert.equal(res.status, 400);
  if (!res.body.ok) assert.match(res.body.detail ?? "", /raw WorldState/);
});

// --- prompt serialization ----------------------------------------------------
test("prompt serializer separates system from context, is versioned, and never leaks raw state", () => {
  const messages = serializePrompt("narrate", ctx());
  assert.equal(messages.promptVersion, PROMPT_VERSION);
  assert.match(messages.system, /Game Master/);
  assert.match(messages.system, /allowedEntityIds/);
  assert.match(messages.system, /NO authority/);
  assert.match(messages.user, /Eastbridge/);
  for (const leak of ["rngCursor", "saveVersion", "inventoryItemIds"]) {
    assert.ok(!messages.user.includes(leak), `prompt leaked "${leak}"`);
  }
});

// --- malformed provider output ----------------------------------------------
test("gateway rejects malformed (non-JSON) provider output", async () => {
  const d = deps(new MockProvider("text", "not json at all"));
  const res = await handleGatewayRequest(JSON.stringify(baseRequest()), AUTH_HEADERS, d);
  assert.equal(res.status, 502);
  if (!res.body.ok) assert.equal(res.body.reason, "invalid_output");
});

// --- forbidden proposal kind -------------------------------------------------
test("gateway rejects output containing a forbidden proposal kind", async () => {
  const out = JSON.stringify({ schemaVersion: GM_OUTPUT_SCHEMA_VERSION, proposals: [{ kind: "set_hp", value: 1 }] });
  const d = deps(new MockProvider("text", out), {});
  const res = await handleGatewayRequest(JSON.stringify(baseRequest({ operation: "player_action" })), AUTH_HEADERS, d);
  assert.equal(res.status, 502);
  if (!res.body.ok) assert.equal(res.body.reason, "invalid_output");
});

// --- invalid entity id -------------------------------------------------------
test("gateway rejects output referencing a non-allow-listed entity", async () => {
  const out = JSON.stringify({
    schemaVersion: GM_OUTPUT_SCHEMA_VERSION,
    proposals: [{ kind: "record_memory", npcId: "unknown_npc", summary: "x", sentiment: 3 }],
  });
  const d = deps(new MockProvider("text", out));
  const res = await handleGatewayRequest(JSON.stringify(baseRequest({ operation: "player_action" })), AUTH_HEADERS, d);
  assert.equal(res.status, 502);
  if (!res.body.ok) assert.equal(res.body.reason, "invalid_output");
});

// --- proposal limit ----------------------------------------------------------
test("gateway rejects output that exceeds the proposal limit", async () => {
  const proposals = Array.from({ length: 3 }, () => ({ kind: "spawn_rumor", text: "a whisper" }));
  const out = JSON.stringify({ schemaVersion: GM_OUTPUT_SCHEMA_VERSION, proposals });
  const d = deps(new MockProvider("text", out), { maxProposals: 2 });
  const res = await handleGatewayRequest(JSON.stringify(baseRequest({ operation: "player_action" })), AUTH_HEADERS, d);
  assert.equal(res.status, 502);
  if (!res.body.ok) assert.equal(res.body.reason, "invalid_output");
});

// --- timeout -----------------------------------------------------------------
test("gateway maps a stalled provider into a timeout (never hangs)", async () => {
  const d = deps(new MockProvider("hang"), { providerDeadlineMs: 60 });
  const res = await handleGatewayRequest(JSON.stringify(baseRequest()), AUTH_HEADERS, d);
  assert.equal(res.status, 504);
  if (!res.body.ok) assert.equal(res.body.reason, "timeout");
});

// --- provider failure --------------------------------------------------------
test("gateway maps a throwing provider into provider_error", async () => {
  const d = deps(new MockProvider("throw"));
  const res = await handleGatewayRequest(JSON.stringify(baseRequest()), AUTH_HEADERS, d);
  assert.equal(res.status, 502);
  if (!res.body.ok) assert.equal(res.body.reason, "provider_error");
});

// --- rate limiting -----------------------------------------------------------
test("gateway enforces the per-session rate limit", async () => {
  const config = { ...loadGatewayConfig({}), rateLimit: { windowMs: 60000, maxRequestsPerWindow: 1 } };
  const d: GatewayDeps = { config, provider: new MockProvider("text", narration("hi")), rateLimiter: new RateLimiter(config.rateLimit) };
  const first = await handleGatewayRequest(JSON.stringify(baseRequest()), AUTH_HEADERS, d);
  assert.equal(first.status, 200);
  const second = await handleGatewayRequest(JSON.stringify(baseRequest()), AUTH_HEADERS, d);
  assert.equal(second.status, 429);
  if (!second.body.ok) assert.equal(second.body.reason, "rate_limited");
});

// --- correlation id ----------------------------------------------------------
test("every response carries a unique correlation id", async () => {
  const d = deps(new MockProvider("text", narration("hi")));
  const a = await handleGatewayRequest(JSON.stringify(baseRequest()), AUTH_HEADERS, d);
  const b = await handleGatewayRequest(JSON.stringify(baseRequest()), AUTH_HEADERS, d);
  assert.ok(a.body.correlationId.startsWith("gw_"));
  assert.ok(b.body.correlationId.startsWith("gw_"));
  assert.notEqual(a.body.correlationId, b.body.correlationId);
});

// --- no-secret / no-key behavior --------------------------------------------
test("no provider key is present and the NullGatewayProvider is unconfigured", async () => {
  const config = loadGatewayConfig({});
  assert.equal(config.providerConfigured, false);
  assert.equal(new NullGatewayProvider().isConfigured(), false);
  const d = deps(new NullGatewayProvider());
  const res = await handleGatewayRequest(JSON.stringify(baseRequest()), AUTH_HEADERS, d);
  assert.equal(res.status, 503);
  if (!res.body.ok) assert.equal(res.body.reason, "unconfigured");
});

// --- happy path (mocked) -----------------------------------------------------
test("gateway returns a validated narration on the happy path (mock provider)", async () => {
  const d = deps(new MockProvider("text", narration("The gate stands quiet.")));
  const res = await handleGatewayRequest(JSON.stringify(baseRequest()), AUTH_HEADERS, d);
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  if (res.body.ok) {
    const out = res.body.output as { narrative: string };
    assert.equal(out.narrative, "The gate stands quiet.");
  }
});
