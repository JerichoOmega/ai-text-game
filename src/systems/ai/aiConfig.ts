/**
 * The single AI feature switch for the whole game. Phase 3B-2 default is OFF:
 * with `enabled: false` every AI wrapper delegates straight to its
 * deterministic system, no GameMaster/provider is ever consulted, and the
 * player's experience is identical to the pre-AI (Phase 2D) build.
 *
 * There is deliberately no settings UI here — flipping AI on is a later phase
 * (3C, once a secure gateway exists). This module is the only place the default
 * lives, so nothing else has to hard-code it.
 */
export interface AiConfig {
  /** Master switch. Must be false until a real, secured provider is wired. */
  enabled: boolean;
}

/** The authoritative default: AI is OFF. */
export const AI_ENABLED = false;

export const DEFAULT_AI_CONFIG: AiConfig = { enabled: AI_ENABLED };

/** Where a wrapper's returned value actually came from. */
export type WrapperSource = "deterministic" | "ai";

/** True only when a config explicitly opts in. Undefined/default -> false. */
export function isAiEnabled(config: AiConfig = DEFAULT_AI_CONFIG): boolean {
  return config.enabled === true;
}
