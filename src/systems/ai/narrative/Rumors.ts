import type { WorldEvent } from "@/domain/types";
import type { WorldStateManager } from "@/systems/WorldStateManager";
import { generateRumorFromEvent, rumorFeed, type Rumor } from "@/systems/RumorSystem";
import { buildGmContext } from "../context/ContextBuilder";
import type { GameMaster } from "../GameMaster";
import { DEFAULT_AI_CONFIG, isAiEnabled, type AiConfig, type WrapperSource } from "../aiConfig";

export interface RumorResult {
  source: WrapperSource;
}

/**
 * Wraps RumorSystem. Event-driven rumors keep their EXACT existing behavior:
 * `fromEvent` is synchronous, offline, and just delegates to
 * generateRumorFromEvent, so the event pipeline (rumorSubscriber) is unchanged.
 *
 * The only new surface is `ambientRumor`, the seam for future AI-authored
 * rumor text. With AI off (or the offline GameMaster) it returns null and adds
 * nothing to the feed — deterministic rumors continue to come solely from
 * world events, as before.
 */
export class Rumors {
  constructor(
    private readonly config: AiConfig = DEFAULT_AI_CONFIG,
    private readonly gm?: GameMaster
  ) {}

  /** Deterministic, unchanged: event -> template -> feed. */
  fromEvent(event: WorldEvent, absoluteDay: number): RumorResult {
    generateRumorFromEvent(event, absoluteDay);
    return { source: "deterministic" };
  }

  getRecent(count = 10): Rumor[] {
    return rumorFeed.getRecent(count);
  }

  /** Future AI ambient rumor. Returns null (adds nothing) while AI is off. */
  async ambientRumor(manager: WorldStateManager): Promise<string | null> {
    if (!isAiEnabled(this.config) || !this.gm) return null;
    const res = await this.gm.proposeRumor({ context: buildGmContext(manager, { kind: "scene" }) });
    const text = res.ok && res.source === "ai" ? res.value.text : "";
    return text.length > 0 ? text : null;
  }
}
