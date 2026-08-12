import type { GmContext } from "../context/GmContext";

/**
 * Provider abstraction. A provider turns a prompt-shaped request into raw text
 * (usually JSON). It knows nothing about game state — the GameMaster builds the
 * request from a GmContext. The offline provider ignores everything; the
 * gateway-backed RemoteProvider (Phase 3C) needs the GmContext + op params to
 * build its request, so those are carried here as optional fields (additive —
 * the offline path is unaffected).
 */
export interface ProviderRequest {
  operation: "narrate" | "dialogue" | "propose_quest" | "rumor" | "player_action";
  system: string;
  user: string;
  /** Whether the caller expects structured JSON back. */
  expectJson: boolean;
  /** Bounded context DTO — required by remote providers, ignored offline. */
  context?: GmContext;
  npcId?: string;
  playerLine?: string;
  actionText?: string;
}

export type ProviderResponse =
  | { ok: true; text: string }
  | { ok: false; reason: "unconfigured" | "network" | "timeout" | "rate_limited" | "error"; detail?: string };

export interface AIProvider {
  readonly id: string;
  /** True when this provider can actually service a request. */
  isConfigured(): boolean;
  complete(req: ProviderRequest): Promise<ProviderResponse>;
}
