import { GATEWAY_PROTOCOL_VERSION } from "@/systems/ai/gateway/GatewayContract";
import { PROMPT_VERSION } from "./prompt/serialize";

/**
 * Server-side configuration. Everything is read from the environment with safe
 * prototype defaults; nothing here is a secret. A real provider key would be
 * supplied via PROVIDER_API_KEY at runtime and is NEVER committed — this phase
 * ships no key, so `providerConfigured` stays false and the gateway uses the
 * NullGatewayProvider.
 */
export interface GatewayConfig {
  protocolVersion: number;
  promptVersion: number;
  requireAuth: boolean;
  clientId: string; // PUBLIC app identifier, not a secret
  maxRequestBytes: number;
  maxContextBytes: number;
  maxStringLength: number;
  providerDeadlineMs: number;
  maxOutputBytes: number;
  maxProposals: number;
  maxNarrativeLength: number;
  maxDialogueLineLength: number;
  rateLimit: { windowMs: number; maxRequestsPerWindow: number };
  /** True only if a provider key is present in the env. Never stores the key. */
  providerConfigured: boolean;
}

type Env = Record<string, string | undefined>;

function num(env: Env, key: string, def: number): number {
  const raw = env[key];
  const n = raw !== undefined ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : def;
}

function bool(env: Env, key: string, def: boolean): boolean {
  const raw = env[key];
  if (raw === undefined) return def;
  return raw === "1" || raw.toLowerCase() === "true";
}

export function loadGatewayConfig(env: Env = process.env): GatewayConfig {
  return {
    protocolVersion: GATEWAY_PROTOCOL_VERSION,
    promptVersion: PROMPT_VERSION,
    requireAuth: bool(env, "GATEWAY_REQUIRE_AUTH", true),
    clientId: env.GATEWAY_CLIENT_ID ?? "chronicle-prototype",
    maxRequestBytes: num(env, "GATEWAY_MAX_REQUEST_BYTES", 16000),
    maxContextBytes: num(env, "GATEWAY_MAX_CONTEXT_BYTES", 8000),
    maxStringLength: num(env, "GATEWAY_MAX_STRING_LENGTH", 2000),
    providerDeadlineMs: num(env, "GATEWAY_PROVIDER_DEADLINE_MS", 8000),
    maxOutputBytes: num(env, "GATEWAY_MAX_OUTPUT_BYTES", 16000),
    maxProposals: num(env, "GATEWAY_MAX_PROPOSALS", 8),
    maxNarrativeLength: num(env, "GATEWAY_MAX_NARRATIVE_LENGTH", 2000),
    maxDialogueLineLength: num(env, "GATEWAY_MAX_DIALOGUE_LINE_LENGTH", 800),
    rateLimit: {
      windowMs: num(env, "GATEWAY_RATE_WINDOW_MS", 60000),
      maxRequestsPerWindow: num(env, "GATEWAY_RATE_MAX", 30),
    },
    // Presence check only. The key value is never read into config or logged.
    providerConfigured: !!(env.PROVIDER_API_KEY && env.PROVIDER_API_KEY.length > 0),
  };
}
