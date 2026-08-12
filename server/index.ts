import { loadGatewayConfig } from "./config";
import { RateLimiter } from "./rateLimit";
import { NullGatewayProvider } from "./provider/GatewayProvider";
import { createGatewayServer } from "./httpServer";
import { createConsoleLogger } from "./log";

/**
 * Standalone entry point for the AI Gateway. Phase 3C-1 wires ONLY the
 * NullGatewayProvider (no real model, no key), so a running gateway responds
 * `unconfigured` to every request and the game stays fully deterministic. This
 * is not started by the app's supervisor; it is run explicitly when needed.
 */
const config = loadGatewayConfig();
const server = createGatewayServer({
  config,
  provider: new NullGatewayProvider(),
  rateLimiter: new RateLimiter(config.rateLimit),
  log: createConsoleLogger(),
});

const port = Number(process.env.PORT ?? 8787);
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[chronicle-gateway] listening on :${port} (providerConfigured=${config.providerConfigured})`);
});
