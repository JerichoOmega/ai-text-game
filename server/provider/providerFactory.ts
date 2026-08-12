import type { GatewayConfig } from "../config";
import type { GatewayProvider } from "./GatewayProvider";
import { NullGatewayProvider } from "./GatewayProvider";
import { MockGatewayProvider } from "./MockGatewayProvider";
import { OpenAIGatewayProvider } from "./OpenAIGatewayProvider";

/**
 * SERVER-SIDE provider selection. The client never chooses the provider and
 * never supplies a credential. Default is "null" (AI off). "real" is honored
 * only when a server-side API key is present; without a key it safely falls
 * back to the NullGatewayProvider so nothing external is ever contacted.
 *
 * The API key is read here from the server environment and handed straight to
 * the adapter — it is never stored in GatewayConfig and never logged.
 */
export function createProvider(config: GatewayConfig, env: Record<string, string | undefined> = process.env): GatewayProvider {
  switch (config.providerMode) {
    case "real": {
      const apiKey = env.AI_PROVIDER_API_KEY;
      if (!apiKey) return new NullGatewayProvider(); // no key -> stay OFF
      return new OpenAIGatewayProvider({ apiKey, model: config.providerModel, baseUrl: config.providerBaseUrl });
    }
    case "mock":
      // Development-only echo provider; returns an empty object that fails
      // output validation unless a test injects a real MockGatewayProvider.
      return new MockGatewayProvider("text", "{}");
    case "null":
    default:
      return new NullGatewayProvider();
  }
}
