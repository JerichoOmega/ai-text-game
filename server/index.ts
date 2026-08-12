import { loadGatewayConfig } from "./config";
import { RateLimiter } from "./rateLimit";
import { createProvider } from "./provider/providerFactory";
import { createGatewayServer } from "./httpServer";
import { createConsoleLogger } from "./log";

/**
 * Standalone entry point for the AI Gateway. The provider is chosen SERVER-SIDE
 * by createProvider(config): the default (AI_PROVIDER_MODE unset -> "null") is
 * the NullGatewayProvider, so a running gateway responds `unconfigured` and the
 * game stays fully deterministic. "real" is used only when both the mode is set
 * AND a server-side AI_PROVIDER_API_KEY is present. Not started by the app's
 * supervisor; run explicitly when needed.
 */
const config = loadGatewayConfig();
const server = createGatewayServer({
  config,
  provider: createProvider(config),
  rateLimiter: new RateLimiter(config.rateLimit),
  log: createConsoleLogger(),
});

const port = Number(process.env.PORT ?? 8787);
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[chronicle-gateway] listening on :${port} (mode=${config.providerMode} providerConfigured=${config.providerConfigured})`);
});
