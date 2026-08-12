import type { ProviderMessages } from "../prompt/serialize";

/**
 * Server-side provider adapter boundary. A concrete adapter would call a real
 * model (OpenAI/Anthropic/etc.) here — and the privileged API key would live
 * ONLY inside such an adapter's process env. This phase ships no real adapter:
 * NullGatewayProvider reports itself unconfigured, so the gateway responds
 * `unconfigured` and the client falls back to deterministic gameplay.
 */
export interface GatewayProvider {
  readonly id: string;
  isConfigured(): boolean;
  /** Returns raw provider text (expected to be JSON). Must honor the abort signal. */
  complete(messages: ProviderMessages, opts: { signal: AbortSignal }): Promise<string>;
}

export class NullGatewayProvider implements GatewayProvider {
  readonly id = "null";
  isConfigured(): boolean {
    return false;
  }
  async complete(): Promise<string> {
    throw new Error("NullGatewayProvider: no AI provider configured");
  }
}
