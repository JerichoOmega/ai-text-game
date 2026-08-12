import { test } from "node:test";
import assert from "node:assert/strict";

import { OpenAIGatewayProvider, ProviderRequestError } from "../server/provider/OpenAIGatewayProvider";
import { createProvider } from "../server/provider/providerFactory";
import { loadGatewayConfig } from "../server/config";
import type { ProviderMessages } from "../server/prompt/serialize";

/**
 * Phase 3C-3: real provider adapter. NO real API key and NO real external
 * request are ever used — fetch is always mocked, and the only key values are
 * fake, test-process-local strings.
 */

const MESSAGES: ProviderMessages = { promptVersion: 1, operation: "narrate", system: "sys", user: "usr" };
const FAKE_KEY = "sk-FAKE-TESTKEY-do-not-use-1234567890";

function freshSignal(): AbortSignal {
  return new AbortController().signal;
}

function mockRes(status: number, body: unknown, jsonThrows = false): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (jsonThrows) throw new Error("bad json");
      return body;
    },
  } as unknown as Response;
}

function okBody(content: string) {
  return { choices: [{ message: { role: "assistant", content } }] };
}

// --- A: missing key ----------------------------------------------------------
test("A: with no API key the adapter refuses and makes no network request", async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    return mockRes(200, okBody("{}"));
  }) as unknown as typeof fetch;
  const provider = new OpenAIGatewayProvider({ apiKey: "", model: "m", baseUrl: "https://x/v1", fetchImpl });
  assert.equal(provider.isConfigured(), false);
  await assert.rejects(provider.complete(MESSAGES, { signal: freshSignal() }), /missing its API key/);
  assert.equal(calls, 0, "no network request may be attempted without a key");
});

// --- B: successful mocked response ------------------------------------------
test("B: a successful provider response is normalized to the model's text", async () => {
  let capturedUrl = "";
  let capturedInit: { headers?: Record<string, string>; body?: string } = {};
  const content = '{"schemaVersion":1,"narrative":"A hush falls over the hall."}';
  const fetchImpl = (async (url: string, init: { headers?: Record<string, string>; body?: string }) => {
    capturedUrl = url;
    capturedInit = init;
    return mockRes(200, okBody(content));
  }) as unknown as typeof fetch;

  const provider = new OpenAIGatewayProvider({ apiKey: FAKE_KEY, model: "gpt-4o-mini", baseUrl: "https://api.openai.com/v1", fetchImpl });
  const text = await provider.complete(MESSAGES, { signal: freshSignal() });

  assert.equal(text, content);
  assert.match(capturedUrl, /\/chat\/completions$/);
  assert.equal(capturedInit.headers?.Authorization, `Bearer ${FAKE_KEY}`);
  assert.match(capturedInit.body ?? "", /gpt-4o-mini/);
});

// --- C: auth failure ---------------------------------------------------------
test("C: a 401 maps to a clean auth failure", async () => {
  const fetchImpl = (async () => mockRes(401, { error: "unauthorized" })) as unknown as typeof fetch;
  const provider = new OpenAIGatewayProvider({ apiKey: FAKE_KEY, model: "m", baseUrl: "https://x/v1", fetchImpl });
  await assert.rejects(provider.complete(MESSAGES, { signal: freshSignal() }), (e: unknown) => e instanceof ProviderRequestError && e.category === "auth");
});

// --- D: rate limiting --------------------------------------------------------
test("D: a 429 maps to a clean rate_limited failure", async () => {
  const fetchImpl = (async () => mockRes(429, { error: "slow down" })) as unknown as typeof fetch;
  const provider = new OpenAIGatewayProvider({ apiKey: FAKE_KEY, model: "m", baseUrl: "https://x/v1", fetchImpl });
  await assert.rejects(provider.complete(MESSAGES, { signal: freshSignal() }), (e: unknown) => e instanceof ProviderRequestError && e.category === "rate_limited");
});

// --- E: server failure -------------------------------------------------------
test("E: a 5xx maps to a clean server failure", async () => {
  const fetchImpl = (async () => mockRes(503, { error: "down" })) as unknown as typeof fetch;
  const provider = new OpenAIGatewayProvider({ apiKey: FAKE_KEY, model: "m", baseUrl: "https://x/v1", fetchImpl });
  await assert.rejects(provider.complete(MESSAGES, { signal: freshSignal() }), (e: unknown) => e instanceof ProviderRequestError && e.category === "server");
});

// --- F: malformed / empty ----------------------------------------------------
test("F: malformed and empty provider responses are rejected safely", async () => {
  const noContent = new OpenAIGatewayProvider({
    apiKey: FAKE_KEY,
    model: "m",
    baseUrl: "https://x/v1",
    fetchImpl: (async () => mockRes(200, { choices: [] })) as unknown as typeof fetch,
  });
  await assert.rejects(noContent.complete(MESSAGES, { signal: freshSignal() }), (e: unknown) => e instanceof ProviderRequestError && e.category === "malformed");

  const badJson = new OpenAIGatewayProvider({
    apiKey: FAKE_KEY,
    model: "m",
    baseUrl: "https://x/v1",
    fetchImpl: (async () => mockRes(200, null, true)) as unknown as typeof fetch,
  });
  await assert.rejects(badJson.complete(MESSAGES, { signal: freshSignal() }), (e: unknown) => e instanceof ProviderRequestError && e.category === "malformed");

  const empty = new OpenAIGatewayProvider({
    apiKey: FAKE_KEY,
    model: "m",
    baseUrl: "https://x/v1",
    fetchImpl: (async () => mockRes(200, okBody(""))) as unknown as typeof fetch,
  });
  await assert.rejects(empty.complete(MESSAGES, { signal: freshSignal() }), (e: unknown) => e instanceof ProviderRequestError && e.category === "empty");
});

// --- G: timeout / abort ------------------------------------------------------
test("G: an aborted request maps through the failure model", async () => {
  const controller = new AbortController();
  const fetchImpl = ((_url: string, init: { signal?: AbortSignal }) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    })) as unknown as typeof fetch;
  const provider = new OpenAIGatewayProvider({ apiKey: FAKE_KEY, model: "m", baseUrl: "https://x/v1", fetchImpl });
  const p = provider.complete(MESSAGES, { signal: controller.signal });
  controller.abort();
  await assert.rejects(p, (e: unknown) => e instanceof ProviderRequestError && e.category === "network");
});

// --- H: no secret leakage ----------------------------------------------------
test("H: the API key never leaks into thrown errors", async () => {
  const fetchImpl = (async () => mockRes(401, { error: "unauthorized" })) as unknown as typeof fetch;
  const provider = new OpenAIGatewayProvider({ apiKey: FAKE_KEY, model: "m", baseUrl: "https://x/v1", fetchImpl });
  try {
    await provider.complete(MESSAGES, { signal: freshSignal() });
    assert.fail("should have thrown");
  } catch (err) {
    const serialized = `${String(err)} ${err instanceof Error ? err.message : ""} ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`;
    assert.ok(!serialized.includes(FAKE_KEY), "error must not contain the API key");
    assert.ok(!serialized.toLowerCase().includes("authorization"), "error must not contain the auth header");
  }
});

// --- I: AI OFF by default ----------------------------------------------------
test("I: the default configuration selects the null provider (AI off, no key)", () => {
  const config = loadGatewayConfig({});
  assert.equal(config.providerMode, "null");
  assert.equal(config.providerConfigured, false);
  const provider = createProvider(config, {});
  assert.equal(provider.id, "null");
  assert.equal(provider.isConfigured(), false);
});

test("I: 'real' mode without a key safely falls back to the null provider", () => {
  const config = { ...loadGatewayConfig({}), providerMode: "real" as const };
  const provider = createProvider(config, {}); // no AI_PROVIDER_API_KEY in env
  assert.equal(provider.id, "null");
});
