import type { AIProvider, ProviderRequest, ProviderResponse } from "./AIProvider";

/**
 * Always-available provider that performs NO network I/O. It reports itself as
 * configured (so the app always has a provider) but every call returns
 * `unconfigured`, signalling the GameMaster to use its deterministic fallback.
 * With only this provider registered the game is fully playable and completely
 * offline — the Phase 3B-1 default.
 */
export class OfflineProvider implements AIProvider {
  readonly id = "offline";

  isConfigured(): boolean {
    return true;
  }

  async complete(_req: ProviderRequest): Promise<ProviderResponse> {
    // No fetch, no timers, no sockets — deterministic fallback is required.
    return { ok: false, reason: "unconfigured", detail: "offline provider: no AI backend configured" };
  }
}
