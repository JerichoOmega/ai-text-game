import type { GmContext } from "@/systems/ai/context/GmContext";
import type { GmOperation } from "@/systems/ai/gateway/GatewayContract";

/**
 * Server-side ONLY prompt serializer: turns a bounded GmContext + operation
 * into provider messages. It is the single place a prompt is constructed, it
 * never emits a raw WorldState (the context is already a DTO), and it keeps
 * the system instructions strictly separate from the game-context payload.
 * The prompt is versioned so future changes are traceable and cache-safe.
 */
export const PROMPT_VERSION = 1;

export interface ProviderMessages {
  promptVersion: number;
  operation: GmOperation;
  system: string;
  user: string;
}

const SYSTEM_BASE = [
  'You are the Game Master ("GM") for the deterministic RPG "Chronicle".',
  "You produce narrative and ADVISORY proposals only. You return STRICT JSON matching the requested output contract and nothing else.",
  "You MUST NOT reference any entity id that is not present in the context's allowedEntityIds list.",
  "You have NO authority over HP, damage, XP, gold, inventory, combat outcomes, world time, RNG, NPC death, or settlement destruction.",
  "Those are decided solely by the game's deterministic systems. Every proposal you make is validated and may be rejected.",
].join(" ");

const OPERATION_INSTRUCTION: Record<GmOperation, string> = {
  narrate: "Task: write a short, evocative scene narration for the player's current location and moment.",
  dialogue: "Task: voice the focused NPC's reply in-character. You may include a small number of advisory proposals.",
  propose_quest: "Task: suggest advisory quest hooks. You cannot create quests; the game authors them from your hints.",
  rumor: "Task: suggest advisory ambient rumors that fit the world's recent events.",
  player_action: "Task: react in narrative to the player's stated free-text action, with optional advisory proposals.",
};

export interface PromptParams {
  npcId?: string;
  playerLine?: string;
  actionText?: string;
}

export function serializePrompt(operation: GmOperation, context: GmContext, params: PromptParams = {}): ProviderMessages {
  const system = `${SYSTEM_BASE}\n\n${OPERATION_INSTRUCTION[operation]}`;
  const user = JSON.stringify({
    operation,
    ...(params.npcId !== undefined ? { npcId: params.npcId } : {}),
    ...(params.playerLine !== undefined ? { playerLine: params.playerLine } : {}),
    ...(params.actionText !== undefined ? { actionText: params.actionText } : {}),
    context,
  });
  return { promptVersion: PROMPT_VERSION, operation, system, user };
}
