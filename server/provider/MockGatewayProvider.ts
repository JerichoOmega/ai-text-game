import type { GatewayProvider } from "./GatewayProvider";
import type { ProviderMessages } from "../prompt/serialize";

/**
 * DEV/TEST-ONLY deterministic provider. It makes NO network request, reads NO
 * secret, uses NO randomness, and mutates NO game state — it simply returns a
 * fixed, caller-supplied JSON string (or throws, to exercise failure paths).
 *
 * It is deliberately NOT referenced by server/index.ts, so production always
 * uses NullGatewayProvider. Inject this only from tests / local experiments.
 */
export type MockMode = "text" | "throw" | "hang";

export class MockGatewayProvider implements GatewayProvider {
  readonly id = "mock";

  constructor(
    private readonly mode: MockMode = "text",
    private readonly cannedText = ""
  ) {}

  isConfigured(): boolean {
    return true;
  }

  complete(_messages: ProviderMessages, opts: { signal: AbortSignal }): Promise<string> {
    if (this.mode === "throw") return Promise.reject(new Error("mock provider failure"));
    if (this.mode === "hang") {
      return new Promise((_resolve, reject) => {
        opts.signal.addEventListener("abort", () => reject(new Error("aborted")));
      });
    }
    return Promise.resolve(this.cannedText);
  }
}

/** A fixed, valid record_memory batch for `npcId` — deterministic every call. */
export function mockMemoryBatch(npcId: string, sentiment = 60, summary = "The player did me a good turn."): string {
  return JSON.stringify({
    schemaVersion: 1,
    proposals: [{ kind: "record_memory", npcId, summary, sentiment }],
  });
}
