/**
 * Minimal structured logger. It logs ONLY the correlation id, a short event
 * name, and explicitly-passed safe metadata (operation, outcome, status). It
 * is never handed auth headers, session tokens, provider keys, prompt text, or
 * raw player/context data, so secrets and sensitive payloads cannot leak.
 */
export interface GatewayLogger {
  info(correlationId: string, event: string, meta?: Record<string, unknown>): void;
}

export const silentLogger: GatewayLogger = { info() {} };

export function createConsoleLogger(): GatewayLogger {
  return {
    info(correlationId, event, meta) {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify({ t: new Date().toISOString(), correlationId, event, ...(meta ?? {}) }));
    },
  };
}
