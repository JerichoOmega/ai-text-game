import type { EntityId } from "./kingdom";
import type { MemoryType } from "./npc";

/**
 * Dialogue is template + variable substitution, not an LLM call, so it is
 * fast, offline, deterministic, and free to run. Variables are resolved by
 * the DialogueSystem from live NPC/world state at render time.
 */
export interface DialogueLine {
  id: EntityId;
  /** e.g. "You rescued my {relationTerm} {timeAgo}." — {placeholders} filled at runtime. */
  template: string;
  /** All conditions must hold for this line to be eligible. */
  conditions: DialogueCondition[];
  /** Higher priority lines are preferred when multiple are eligible (memory-referencing beats generic greeting). */
  priority: number;
}

export type DialogueCondition =
  | { kind: "hasMemoryOfType"; memoryType: MemoryType }
  | { kind: "relationshipAtLeast"; value: number }
  | { kind: "relationshipAtMost"; value: number }
  | { kind: "npcRoleIs"; role: string }
  | { kind: "debtOwedByPlayer" }
  | { kind: "debtOwedToPlayer" }
  | { kind: "settlementDestroyed" }
  | { kind: "always" };

export interface DialogueNode {
  id: EntityId;
  npcId: EntityId;
  lines: DialogueLine[];
  responseOptionIds: EntityId[];
}

/**
 * A branch the player can pick in a conversation. Deterministic and
 * generated from live world state (see DialogueSystem.getResponses) — not
 * an open chatbox. `topic` is what the DialogueSystem/screen acts on;
 * `label` is the player's spoken line.
 */
export type DialogueTopic = "news" | "rumors" | "quest" | "shop" | "leave";

export interface DialogueResponse {
  id: EntityId;
  topic: DialogueTopic;
  label: string;
}
