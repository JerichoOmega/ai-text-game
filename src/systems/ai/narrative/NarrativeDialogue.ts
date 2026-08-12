import type { DialogueResponse, DialogueTopic, NPC } from "@/domain/types";
import type { WorldStateManager } from "@/systems/WorldStateManager";
import { DialogueSystem } from "@/systems/DialogueSystem";
import { buildGmContext } from "../context/ContextBuilder";
import type { GameMaster } from "../GameMaster";
import { DEFAULT_AI_CONFIG, isAiEnabled, type AiConfig, type WrapperSource } from "../aiConfig";

export interface DialogueLineResult {
  source: WrapperSource;
  line: string;
}

/**
 * Higher-level dialogue wrapper. It does NOT duplicate or modify
 * DialogueSystem — it delegates to it. The seam it adds is a single greeting
 * path that could one day come from the GameMaster:
 *
 *   AI enabled : GameMaster.converse -> ai line   (fallback -> deterministic)
 *   AI disabled: DialogueSystem.getGreeting directly
 *
 * In Phase 3B-2 AI is off by default and the offline GameMaster never yields an
 * AI line, so every result is deterministic and equal to the existing screen
 * behavior. The wrapper is read-only: producing a line never mutates the world.
 */
export class NarrativeDialogue {
  constructor(
    private readonly config: AiConfig = DEFAULT_AI_CONFIG,
    private readonly gm?: GameMaster
  ) {}

  /** The player's response buttons — structural, so always deterministic. */
  getResponses(npc: NPC, manager: WorldStateManager): DialogueResponse[] {
    return DialogueSystem.getResponses(npc, manager.getWorld());
  }

  /** An NPC's reply to a chosen topic — narrative but deterministic here. */
  getReply(npc: NPC, manager: WorldStateManager, topic: DialogueTopic): string {
    return DialogueSystem.getReply(npc, manager.getWorld(), topic);
  }

  async getGreeting(npc: NPC, manager: WorldStateManager): Promise<DialogueLineResult> {
    const deterministic = DialogueSystem.getGreeting(npc, manager.getWorld());
    if (!isAiEnabled(this.config) || !this.gm) {
      return { source: "deterministic", line: deterministic };
    }
    const ctx = buildGmContext(manager, { kind: "npc", npcId: npc.id });
    const res = await this.gm.converse({ context: ctx, npcId: npc.id });
    if (res.ok && res.source === "ai") return { source: "ai", line: res.value.line };
    return { source: "deterministic", line: deterministic };
  }
}
