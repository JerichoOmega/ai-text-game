import { HEADER_CLIENT_ID, HEADER_SESSION_ID } from "@/systems/ai/gateway/GatewayContract";
import type { GatewayConfig } from "./config";

/**
 * Prototype authentication: a PUBLIC client id plus an opaque session id. This
 * is deliberately NOT a secret-key scheme — it exists to reject anonymous /
 * malformed callers and to key rate-limiting per session, not to protect a
 * credential. A privileged provider key never leaves the gateway.
 */
export type AuthResult = { ok: true; sessionId: string } | { ok: false; reason: string };

const SESSION_RE = /^[A-Za-z0-9._-]{1,128}$/;

export function authenticate(headers: Record<string, string | undefined>, config: GatewayConfig): AuthResult {
  const sessionId = headers[HEADER_SESSION_ID];

  if (!config.requireAuth) {
    return { ok: true, sessionId: sessionId && SESSION_RE.test(sessionId) ? sessionId : "anonymous" };
  }

  const clientId = headers[HEADER_CLIENT_ID];
  if (clientId !== config.clientId) {
    return { ok: false, reason: "invalid or missing client id" };
  }
  if (!sessionId || !SESSION_RE.test(sessionId)) {
    return { ok: false, reason: "invalid or missing session id" };
  }
  return { ok: true, sessionId };
}
