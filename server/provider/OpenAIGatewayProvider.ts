import type { GatewayProvider } from "./GatewayProvider";
import type { ProviderMessages } from "../prompt/serialize";

/**
 * Real external-AI adapter (OpenAI-compatible Chat Completions over HTTPS). It
 * is SERVER-ONLY: the API key is read from server config, sent solely in the
 * outbound Authorization header, and never logged, echoed, or placed in an
 * error. It calls the provider with Node's built-in fetch (no SDK dependency),
 * honors the caller's AbortSignal, and returns ONLY the model's raw text — the
 * gateway's output-validation layer remains the authority on acceptability.
 *
 * It never touches WorldState, repositories, applyProposals, or persistence.
 */
export type ProviderErrorCategory = "unconfigured" | "auth" | "rate_limited" | "server" | "malformed" | "empty" | "network";

export class ProviderRequestError extends Error {
  constructor(public readonly category: ProviderErrorCategory, message: string) {
    super(message);
    this.name = "ProviderRequestError";
  }
}

export interface OpenAIProviderConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

function categorize(status: number): ProviderErrorCategory {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limited";
  return "server";
}

export class OpenAIGatewayProvider implements GatewayProvider {
  readonly id = "openai";

  constructor(private readonly cfg: OpenAIProviderConfig) {}

  isConfigured(): boolean {
    return typeof this.cfg.apiKey === "string" && this.cfg.apiKey.length > 0;
  }

  async complete(messages: ProviderMessages, opts: { signal: AbortSignal }): Promise<string> {
    // Refuse before any network I/O when unconfigured.
    if (!this.isConfigured()) {
      throw new ProviderRequestError("unconfigured", "AI provider adapter is missing its API key");
    }

    const doFetch = this.cfg.fetchImpl ?? fetch;
    const url = `${this.cfg.baseUrl.replace(/\/$/, "")}/chat/completions`;

    let res: Response;
    try {
      res = await doFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Sent ONLY to the provider; never logged or surfaced in errors.
          Authorization: `Bearer ${this.cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: this.cfg.model,
          temperature: 0,
          messages: [
            { role: "system", content: messages.system },
            { role: "user", content: messages.user },
          ],
        }),
        signal: opts.signal,
      });
    } catch (err) {
      // Any thrown fetch error (incl. abort) — never include the key/headers.
      throw new ProviderRequestError("network", err instanceof Error ? `network failure: ${err.name}` : "network failure");
    }

    if (!res.ok) {
      throw new ProviderRequestError(categorize(res.status), `provider returned HTTP ${res.status}`);
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      throw new ProviderRequestError("malformed", "provider response was not valid JSON");
    }

    const content = extractContent(data);
    if (content === undefined) throw new ProviderRequestError("malformed", "provider response had no message content");
    if (content.length === 0) throw new ProviderRequestError("empty", "provider returned empty content");
    return content;
  }
}

function extractContent(data: unknown): string | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) return undefined;
  const first = choices[0];
  if (typeof first !== "object" || first === null) return undefined;
  const message = (first as { message?: unknown }).message;
  if (typeof message !== "object" || message === null) return undefined;
  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content : undefined;
}
