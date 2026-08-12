import { GM_CONTEXT_SCHEMA_VERSION, type GmContext } from "@/systems/ai/context/GmContext";
import { GM_OPERATIONS, type GatewayRequest, type GmOperation } from "@/systems/ai/gateway/GatewayContract";
import type { GatewayConfig } from "../config";

/**
 * Validates the untrusted request envelope BEFORE anything else runs. It
 * enforces the protocol version, accepts only the bounded GmContext DTO
 * (rejecting anything shaped like a raw WorldState), and caps serialized size
 * and per-string length so a caller cannot smuggle an oversized/hostile prompt
 * into the provider.
 */
export type RequestValidation =
  | { ok: true; request: GatewayRequest }
  | { ok: false; reason: string };

// Top-level keys that only a raw WorldState would carry. Their presence means
// the caller sent authoritative state instead of the AI-facing DTO -> reject.
const FORBIDDEN_WORLDSTATE_KEYS = [
  "player",
  "npcs",
  "settlements",
  "quests",
  "kingdoms",
  "factions",
  "events",
  "weather",
  "currentDate",
  "rngCursor",
  "saveVersion",
  "seed",
];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function anyStringTooLong(value: unknown, max: number): boolean {
  if (typeof value === "string") return value.length > max;
  if (Array.isArray(value)) return value.some((v) => anyStringTooLong(v, max));
  if (isObject(value)) return Object.values(value).some((v) => anyStringTooLong(v, max));
  return false;
}

function looksLikeGmContext(v: unknown): v is GmContext {
  if (!isObject(v)) return false;
  return (
    isObject(v.shortTerm) &&
    isObject(v.session) &&
    isObject(v.persistent) &&
    Array.isArray(v.history) &&
    Array.isArray(v.allowedEntityIds) &&
    "focus" in v
  );
}

export function validateGatewayRequest(body: unknown, config: GatewayConfig): RequestValidation {
  if (!isObject(body)) return { ok: false, reason: "request body must be an object" };

  if (body.protocolVersion !== config.protocolVersion) {
    return { ok: false, reason: `unsupported protocol version` };
  }

  const operation = body.operation;
  if (typeof operation !== "string" || !(GM_OPERATIONS as readonly string[]).includes(operation)) {
    return { ok: false, reason: "unknown operation" };
  }

  const context = body.context;
  if (!isObject(context)) return { ok: false, reason: "missing context" };

  for (const key of FORBIDDEN_WORLDSTATE_KEYS) {
    if (key in context) return { ok: false, reason: `raw WorldState is not accepted (found "${key}")` };
  }

  if (context.schemaVersion !== GM_CONTEXT_SCHEMA_VERSION) {
    return { ok: false, reason: "invalid or unsupported context schema version" };
  }
  if (!looksLikeGmContext(context)) return { ok: false, reason: "context is not a valid GmContext" };
  if (!(context.allowedEntityIds as unknown[]).every((id) => typeof id === "string")) {
    return { ok: false, reason: "allowedEntityIds must be strings" };
  }

  const contextBytes = JSON.stringify(context).length;
  if (contextBytes > config.maxContextBytes) {
    return { ok: false, reason: "context exceeds maximum serialized size" };
  }
  if (anyStringTooLong(context, config.maxStringLength)) {
    return { ok: false, reason: "a context string exceeds the maximum length" };
  }

  const request: GatewayRequest = {
    protocolVersion: config.protocolVersion,
    operation: operation as GmOperation,
    context: context as GmContext,
    ...(typeof body.npcId === "string" ? { npcId: body.npcId } : {}),
    ...(typeof body.playerLine === "string" ? { playerLine: body.playerLine } : {}),
    ...(typeof body.actionText === "string" ? { actionText: body.actionText } : {}),
  };
  return { ok: true, request };
}
