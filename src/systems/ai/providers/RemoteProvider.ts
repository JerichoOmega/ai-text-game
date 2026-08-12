import type { AIProvider, ProviderRequest, ProviderResponse } from "./AIProvider";
import {
  GATEWAY_PROTOCOL_VERSION,
  HEADER_CLIENT_ID,
  HEADER_SESSION_ID,
  type GatewayRequest,
  type GatewayResponse,
} from "../gateway/GatewayContract";

/**
 * Client-side provider that speaks the gateway wire contract over HTTPS. It is
 * UNCONFIGURED by default (no gateway url) and, whatever the failure, it always
 * resolves to a not-ok ProviderResponse so the GameMaster falls back to
 * deterministic gameplay. It never holds or sends a privileged key — only the
 * public client id and an opaque session id. It is NOT enabled anywhere by
 * default in Phase 3C-1.
 */
export interface RemoteProviderConfig {
  gatewayUrl?: string;
  clientId?: string;
  sessionId?: string;
  deadlineMs?: number;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

function mapHttpStatus(status: number): "unconfigured" | "rate_limited" | "timeout" | "error" {
  if (status === 429) return "rate_limited";
  if (status === 503) return "unconfigured";
  if (status === 504) return "timeout";
  return "error";
}

function mapGatewayReason(reason: string): "unconfigured" | "rate_limited" | "timeout" | "error" {
  if (reason === "rate_limited") return "rate_limited";
  if (reason === "unconfigured") return "unconfigured";
  if (reason === "timeout") return "timeout";
  return "error";
}

export class RemoteProvider implements AIProvider {
  readonly id = "remote";

  constructor(private readonly cfg: RemoteProviderConfig = {}) {}

  isConfigured(): boolean {
    return typeof this.cfg.gatewayUrl === "string" && this.cfg.gatewayUrl.length > 0;
  }

  async complete(req: ProviderRequest): Promise<ProviderResponse> {
    if (!this.isConfigured()) return { ok: false, reason: "unconfigured", detail: "no gateway url" };
    if (!req.context) return { ok: false, reason: "error", detail: "missing context" };

    const body: GatewayRequest = {
      protocolVersion: GATEWAY_PROTOCOL_VERSION,
      operation: req.operation,
      context: req.context,
      ...(req.npcId !== undefined ? { npcId: req.npcId } : {}),
      ...(req.playerLine !== undefined ? { playerLine: req.playerLine } : {}),
      ...(req.actionText !== undefined ? { actionText: req.actionText } : {}),
    };

    const doFetch = this.cfg.fetchImpl ?? fetch;
    const controller = new AbortController();
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), this.cfg.deadlineMs ?? 8000);

    try {
      const res = await doFetch(this.cfg.gatewayUrl as string, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [HEADER_CLIENT_ID]: this.cfg.clientId ?? "chronicle-prototype",
          [HEADER_SESSION_ID]: this.cfg.sessionId ?? "anonymous",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) return { ok: false, reason: mapHttpStatus(res.status), detail: `http ${res.status}` };

      const data = (await res.json()) as GatewayResponse;
      if (!data.ok) return { ok: false, reason: mapGatewayReason(data.reason), detail: data.reason };
      return { ok: true, text: JSON.stringify(data.output) };
    } catch (err) {
      const reason = controller.signal.aborted ? "timeout" : "network";
      return { ok: false, reason, detail: err instanceof Error ? err.message : "request failed" };
    } finally {
      clearTimeout(timer);
    }
  }
}
