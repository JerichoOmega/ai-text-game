import type { EntityId } from "@/domain/types";
import type { GmContext } from "../context/GmContext";
import type { DialogueOutput, GmProposalBatch, NarrationOutput } from "../contract/GmOutput";

/**
 * The SHARED client <-> gateway wire contract. It lives in the app's AI layer
 * (not inside server/) so both the client RemoteProvider and the separate
 * `server/` gateway implement the exact same shape, while the server stays a
 * fully independent application that merely depends on these types.
 *
 * The contract intentionally carries only the bounded GmContext DTO — never a
 * raw WorldState — plus the operation and its small params.
 */
export const GATEWAY_PROTOCOL_VERSION = 1;

export const GM_OPERATIONS = ["narrate", "dialogue", "propose_quest", "rumor", "player_action"] as const;
export type GmOperation = (typeof GM_OPERATIONS)[number];

/** Non-secret headers. The client id is PUBLIC (an app identifier, not a key);
 *  the session id is an opaque per-session token. No privileged secret is ever
 *  sent from the client — a real provider key exists only inside the gateway. */
export const HEADER_CLIENT_ID = "x-client-id";
export const HEADER_SESSION_ID = "x-session-id";
export const HEADER_CORRELATION_ID = "x-correlation-id";

export interface GatewayRequest {
  protocolVersion: number;
  operation: GmOperation;
  context: GmContext;
  npcId?: EntityId;
  playerLine?: string;
  actionText?: string;
}

export type GatewayOutput = NarrationOutput | DialogueOutput | GmProposalBatch;

export type GatewayFailureReason =
  | "unauthenticated"
  | "invalid_request"
  | "rate_limited"
  | "unconfigured"
  | "timeout"
  | "provider_error"
  | "invalid_output";

export type GatewayResponse =
  | { ok: true; correlationId: string; output: GatewayOutput }
  | { ok: false; correlationId: string; reason: GatewayFailureReason; detail?: string };
