import type { GatewayResponse, GatewayFailureReason } from "@/systems/ai/gateway/GatewayContract";
import type { GatewayConfig } from "./config";
import type { GatewayProvider } from "./provider/GatewayProvider";
import { RateLimiter } from "./rateLimit";
import { authenticate } from "./auth";
import { validateGatewayRequest } from "./validation/requestValidation";
import { validateOutput } from "./validation/outputValidation";
import { serializePrompt } from "./prompt/serialize";
import { newCorrelationId } from "./correlation";
import { silentLogger, type GatewayLogger } from "./log";

/**
 * The AI Gateway request handler — the ONLY place a privileged provider could
 * ever be called. It is a pure async function (framework-agnostic, so it is
 * unit-testable without a socket) that walks a fixed security pipeline:
 *
 *   auth -> rate limit -> request validation -> prompt serialize
 *        -> provider (with a hard deadline) -> output validation -> response
 *
 * Every branch returns a correlation id; secrets and payloads are never logged.
 */
export interface GatewayDeps {
  config: GatewayConfig;
  provider: GatewayProvider;
  rateLimiter: RateLimiter;
  now?: () => number;
  log?: GatewayLogger;
}

export interface GatewayHttpResult {
  status: number;
  body: GatewayResponse;
}

const STATUS: Record<GatewayFailureReason, number> = {
  unauthenticated: 401,
  invalid_request: 400,
  rate_limited: 429,
  unconfigured: 503,
  timeout: 504,
  provider_error: 502,
  invalid_output: 502,
};

function fail(correlationId: string, reason: GatewayFailureReason, detail?: string): GatewayHttpResult {
  return { status: STATUS[reason], body: { ok: false, correlationId, reason, ...(detail ? { detail } : {}) } };
}

export async function handleGatewayRequest(
  rawBody: string,
  rawHeaders: Record<string, string | undefined>,
  deps: GatewayDeps
): Promise<GatewayHttpResult> {
  const { config, provider, rateLimiter } = deps;
  const now = deps.now ?? (() => Date.now());
  const log = deps.log ?? silentLogger;
  const correlationId = newCorrelationId();

  const headers: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(rawHeaders)) headers[k.toLowerCase()] = v;

  if (rawBody.length > config.maxRequestBytes) {
    log.info(correlationId, "reject", { reason: "invalid_request", detail: "oversized body" });
    return fail(correlationId, "invalid_request", "request body exceeds maximum size");
  }

  const auth = authenticate(headers, config);
  if (!auth.ok) {
    log.info(correlationId, "reject", { reason: "unauthenticated" });
    return fail(correlationId, "unauthenticated", auth.reason);
  }

  const rl = rateLimiter.check(auth.sessionId, now());
  if (!rl.allowed) {
    log.info(correlationId, "reject", { reason: "rate_limited" });
    return fail(correlationId, "rate_limited", rl.reason);
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return fail(correlationId, "invalid_request", "body is not valid JSON");
  }

  const reqCheck = validateGatewayRequest(parsedBody, config);
  if (!reqCheck.ok) {
    log.info(correlationId, "reject", { reason: "invalid_request", detail: reqCheck.reason });
    return fail(correlationId, "invalid_request", reqCheck.reason);
  }
  const request = reqCheck.request;

  if (!provider.isConfigured()) {
    log.info(correlationId, "unconfigured", { operation: request.operation });
    return fail(correlationId, "unconfigured", "no AI provider configured");
  }

  const messages = serializePrompt(request.operation, request.context, {
    npcId: request.npcId,
    playerLine: request.playerLine,
    actionText: request.actionText,
  });

  const controller = new AbortController();
  const timer: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), config.providerDeadlineMs);
  let text: string;
  try {
    text = await provider.complete(messages, { signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    if (controller.signal.aborted) {
      log.info(correlationId, "timeout", { operation: request.operation });
      return fail(correlationId, "timeout", "provider deadline exceeded");
    }
    log.info(correlationId, "provider_error", { operation: request.operation });
    return fail(correlationId, "provider_error", err instanceof Error ? err.message : "provider failure");
  }
  clearTimeout(timer);

  if (text.length > config.maxOutputBytes) {
    return fail(correlationId, "invalid_output", "provider output exceeds maximum size");
  }

  const outCheck = validateOutput(request.operation, text, request.context, config);
  if (!outCheck.ok) {
    log.info(correlationId, "invalid_output", { operation: request.operation, detail: outCheck.reason });
    return fail(correlationId, "invalid_output", outCheck.reason);
  }

  log.info(correlationId, "ok", { operation: request.operation });
  return { status: 200, body: { ok: true, correlationId, output: outCheck.output } };
}
