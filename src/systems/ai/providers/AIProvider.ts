/**
 * Provider abstraction. A provider turns a prompt-shaped request into raw text
 * (usually JSON). It knows nothing about game state — the GameMaster builds the
 * request from a GmContext. Concrete remote providers arrive in Phase 3C behind
 * a backend gateway; this phase ships only the offline provider.
 */
export interface ProviderRequest {
  operation: "narrate" | "dialogue" | "propose_quest" | "rumor" | "player_action";
  system: string;
  user: string;
  /** Whether the caller expects structured JSON back. */
  expectJson: boolean;
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
