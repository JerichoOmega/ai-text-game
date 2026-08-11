import type { EntityId, NPC } from "@/domain/types";
import { mulberry32 } from "@/utils/rng";

/**
 * Canonical registry for Chronicle's 12 recurring NPC identities. These are
 * authored, immutable visual identities: the world simulation decides WHEN,
 * WHERE, and WHETHER a character appears (and how they feel), never what
 * they look like. This is a SEPARATE content pool from shopkeepers
 * (src/data/shopkeepers.ts) — do not merge them.
 *
 * Node-safe by design (no image `require`s). The static portrait/expression
 * asset map lives in src/presentation/npc/npcAssets.ts.
 *
 * NOTE: race/gender were NOT supplied in the asset archive (images only).
 * The values below are provisional best-effort metadata (gender inferred
 * from name where clear, race left "Unknown") and should be corrected if a
 * canonical manifest is provided — they do not affect asset resolution.
 */
export interface NpcCharacter {
  id: EntityId;
  name: string;
  race: string;
  gender: string;
  /** The exactly-six canonical expression keys this character ships with. */
  expressionKeys: string[];
}

export const NPC_CHARACTERS: NpcCharacter[] = [
  { id: "alden", name: "Alden", race: "Unknown", gender: "Male", expressionKeys: ["angry", "concerned", "friendly", "neutral", "skeptical", "smiling"] },
  { id: "elara", name: "Elara", race: "Unknown", gender: "Female", expressionKeys: ["amused", "curious", "determined", "friendly", "neutral", "worried"] },
  { id: "caelan", name: "Caelan", race: "Unknown", gender: "Unknown", expressionKeys: ["concerned", "disapproving", "neutral", "smirking", "surprised", "thoughtful"] },
  { id: "lyssara", name: "Lyssara", race: "Unknown", gender: "Female", expressionKeys: ["angry", "kind", "neutral", "playful", "sad", "suspicious"] },
  { id: "borin", name: "Borin", race: "Unknown", gender: "Male", expressionKeys: ["angry", "grumpy", "jovial", "neutral", "proud", "skeptical"] },
  { id: "brunna", name: "Brunna", race: "Unknown", gender: "Female", expressionKeys: ["annoyed", "determined", "laughing", "neutral", "warm", "worried"] },
  { id: "garruk", name: "Garruk", race: "Unknown", gender: "Male", expressionKeys: ["enraged", "grinning", "irritated", "neutral", "respectful", "threatened"] },
  { id: "vesha", name: "Vesha", race: "Unknown", gender: "Unknown", expressionKeys: ["confident", "defiant", "furious", "neutral", "sad", "smirking"] },
  { id: "perrin", name: "Perrin", race: "Unknown", gender: "Male", expressionKeys: ["cheerful", "friendly", "guilty", "nervous", "neutral", "surprised"] },
  { id: "mira", name: "Mira", race: "Unknown", gender: "Female", expressionKeys: ["disappointed", "excited", "kind", "neutral", "skeptical", "worried"] },
  { id: "kael", name: "Kael", race: "Unknown", gender: "Male", expressionKeys: ["amused", "angry", "brooding", "charming", "neutral", "surprised"] },
  { id: "seraphine", name: "Seraphine", race: "Unknown", gender: "Female", expressionKeys: ["furious", "kind", "neutral", "playful", "sad", "suspicious"] },
];

const BY_ID: Record<string, NpcCharacter> = Object.fromEntries(NPC_CHARACTERS.map((c) => [c.id, c]));

export function getNpcCharacter(id: string | undefined): NpcCharacter | undefined {
  return id ? BY_ID[id] : undefined;
}

/**
 * Centralized emotion -> ordered candidate expression keys. Dialogue emotion
 * labels don't need a 1:1 match with the art; the resolver walks the
 * candidates and uses the first the character actually ships, else neutral.
 */
const EMOTION_ALIASES: Record<string, string[]> = {
  neutral: ["neutral", "thoughtful", "curious", "confident", "determined", "proud"],
  friendly: ["friendly", "kind", "warm", "respectful", "jovial", "cheerful"],
  happy: ["smiling", "grinning", "laughing", "cheerful", "amused", "jovial", "playful", "excited"],
  amused: ["amused", "smirking", "grinning", "playful", "laughing", "charming"],
  suspicious: ["suspicious", "skeptical", "disapproving", "defiant", "brooding", "smirking"],
  skeptical: ["skeptical", "suspicious", "disapproving", "brooding"],
  concerned: ["concerned", "worried", "nervous", "sad", "disappointed", "guilty"],
  worried: ["worried", "concerned", "nervous", "sad"],
  sad: ["sad", "disappointed", "guilty", "worried"],
  angry: ["angry", "irritated", "annoyed", "grumpy", "furious", "enraged", "threatened", "defiant"],
};

/** Resolves a (possibly loosely-named) emotion to a real expression key the
 * given character owns, always falling back to "neutral". */
export function resolveExpressionKey(characterId: string, emotion: string): string {
  const character = BY_ID[characterId];
  if (!character) return "neutral";
  const owns = (k: string) => character.expressionKeys.includes(k);
  const normalized = emotion.toLowerCase();
  if (owns(normalized)) return normalized;
  for (const candidate of EMOTION_ALIASES[normalized] ?? []) {
    if (owns(candidate)) return candidate;
  }
  return owns("neutral") ? "neutral" : character.expressionKeys[0]!;
}

/** Maps an NPC's cached relationship to a base emotion label for portraiture. */
export function emotionForRelationship(relationship: number): string {
  if (relationship >= 30) return "friendly";
  if (relationship <= -30) return "angry";
  if (relationship <= -10) return "suspicious";
  return "neutral";
}

/**
 * Deterministically selects which recurring NPCs exist in a run (a subset,
 * never all 12). Same seed -> same roster; different seeds can differ.
 */
export function selectRecurringRoster(seed: number): EntityId[] {
  const rng = mulberry32((seed ^ 0x51ed270b) >>> 0);
  return NPC_CHARACTERS.filter(() => rng() < 0.5).map((c) => c.id);
}

/**
 * Assigns selected recurring identities onto ordinary generated NPCs
 * (never merchants/innkeepers or already-assigned shopkeepers). Returns a
 * NEW npcs map (no mutation). Each identity is used at most once; unplaced
 * identities simply don't appear this run.
 */
export function assignRecurringNpcs(npcsInput: Record<EntityId, NPC>, seed: number): Record<EntityId, NPC> {
  const npcs: Record<EntityId, NPC> = { ...npcsInput };
  const roster = selectRecurringRoster(seed);
  if (roster.length === 0) return npcs;

  const eligible = Object.values(npcs)
    .filter((n) => n.role !== "merchant" && n.role !== "innkeeper" && !n.shopkeeperId && !n.characterId)
    .sort((a, b) => a.id.localeCompare(b.id));

  const count = Math.min(roster.length, eligible.length);
  for (let i = 0; i < count; i++) {
    const npc = eligible[i]!;
    const character = BY_ID[roster[i]!]!;
    npcs[npc.id] = { ...npc, name: character.name, characterId: character.id };
  }
  return npcs;
}
