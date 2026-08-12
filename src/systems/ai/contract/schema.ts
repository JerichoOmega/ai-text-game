import { GM_PROPOSAL_KINDS, type GmProposal, type GmProposalBatch } from "./GmOutput";

/**
 * Hand-written runtime validation for provider JSON — no external dependency.
 * A provider's response is untrusted text; nothing is believed until it has
 * passed these guards. Anything malformed returns null (a safe failure), which
 * the GameMaster turns into deterministic fallback.
 */
type Json = unknown;

function isObject(v: Json): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isString(v: Json): v is string {
  return typeof v === "string";
}
function isFiniteNumber(v: Json): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Validates a single proposal. Unknown/forbidden kinds -> null. */
export function parseProposal(v: Json): GmProposal | null {
  if (!isObject(v) || !isString(v.kind)) return null;
  if (!(GM_PROPOSAL_KINDS as readonly string[]).includes(v.kind)) return null; // rejects set_hp, give_gold, etc.

  switch (v.kind) {
    case "adjust_relationship":
      if (!isString(v.npcId) || (v.direction !== "up" && v.direction !== "down")) return null;
      if (v.magnitude !== "small" && v.magnitude !== "large") return null;
      if (!isString(v.reason)) return null;
      return { kind: "adjust_relationship", npcId: v.npcId, direction: v.direction, magnitude: v.magnitude, reason: v.reason };
    case "offer_quest":
      if (!isString(v.templateHint) || !isString(v.rationale)) return null;
      if (v.rewardTier !== "small" && v.rewardTier !== "medium") return null;
      if (v.targetSettlementId !== undefined && !isString(v.targetSettlementId)) return null;
      if (v.targetNpcId !== undefined && !isString(v.targetNpcId)) return null;
      return {
        kind: "offer_quest",
        templateHint: v.templateHint,
        rewardTier: v.rewardTier,
        rationale: v.rationale,
        ...(isString(v.targetSettlementId) ? { targetSettlementId: v.targetSettlementId } : {}),
        ...(isString(v.targetNpcId) ? { targetNpcId: v.targetNpcId } : {}),
      };
    case "spawn_rumor":
      if (!isString(v.text)) return null;
      return { kind: "spawn_rumor", text: v.text };
    case "advance_quest_objective":
      if (!isString(v.questId) || !isString(v.objectiveId)) return null;
      return { kind: "advance_quest_objective", questId: v.questId, objectiveId: v.objectiveId };
    case "record_memory":
      if (!isString(v.npcId) || !isString(v.summary) || !isFiniteNumber(v.sentiment)) return null;
      return { kind: "record_memory", npcId: v.npcId, summary: v.summary, sentiment: v.sentiment };
    default:
      return null;
  }
}

/** Parses raw provider text into a proposal batch, dropping malformed proposals. */
export function parseProposalBatch(raw: string): GmProposalBatch | null {
  let json: Json;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(json)) return null;
  if (!isFiniteNumber(json.schemaVersion)) return null;
  const rawProposals = Array.isArray(json.proposals) ? json.proposals : [];
  const proposals: GmProposal[] = [];
  for (const p of rawProposals) {
    const parsed = parseProposal(p);
    if (parsed) proposals.push(parsed);
  }
  return {
    schemaVersion: json.schemaVersion,
    ...(isString(json.narrative) ? { narrative: json.narrative } : {}),
    proposals,
  };
}
