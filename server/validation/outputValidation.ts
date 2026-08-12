import { isAllowedEntity, type GmContext } from "@/systems/ai/context/GmContext";
import {
  GM_OUTPUT_SCHEMA_VERSION,
  type DialogueOutput,
  type GmProposal,
  type GmProposalBatch,
  type NarrationOutput,
} from "@/systems/ai/contract/GmOutput";
import { parseProposal } from "@/systems/ai/contract/schema";
import { clampProposedSentiment, validateProposal } from "@/systems/ai/validation/ProposalValidator";
import type { GatewayConfig } from "../config";
import type { GmOperation } from "@/systems/ai/gateway/GatewayContract";
import type { GatewayOutput } from "@/systems/ai/gateway/GatewayContract";

/**
 * Validates the UNTRUSTED provider response. Nothing is passed through until it
 * has parsed as JSON, matched the requested output contract, referenced only
 * allow-listed entities, and stayed within string/proposal limits. Any failure
 * returns { ok:false } so the gateway reports invalid_output rather than
 * leaking malformed/hallucinated data toward gameplay.
 */
export type OutputValidation =
  | { ok: true; output: GatewayOutput }
  | { ok: false; reason: string };

const TONES = new Set(["grim", "hopeful", "neutral", "tense"]);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function isString(v: unknown): v is string {
  return typeof v === "string";
}

function parseJson(raw: string): unknown | undefined {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Structural parse + allow-list check + count cap + sentiment clamp. Any
 *  malformed or disallowed proposal fails the whole batch (strict). */
function parseProposalsStrict(
  arr: unknown,
  context: GmContext,
  max: number
): { ok: true; proposals: GmProposal[] } | { ok: false; reason: string } {
  if (!Array.isArray(arr)) return { ok: false, reason: "proposals is not an array" };
  if (arr.length > max) return { ok: false, reason: "too many proposals" };
  const out: GmProposal[] = [];
  for (const raw of arr) {
    const parsed = parseProposal(raw);
    if (!parsed) return { ok: false, reason: "malformed or forbidden proposal" };
    const check = validateProposal(context, parsed);
    if (!check.valid) return { ok: false, reason: check.reason ?? "disallowed proposal" };
    out.push(parsed.kind === "record_memory" ? { ...parsed, sentiment: clampProposedSentiment(parsed.sentiment) } : parsed);
  }
  return { ok: true, proposals: out };
}

function parseNarration(json: unknown, config: GatewayConfig): OutputValidation {
  if (!isObject(json)) return { ok: false, reason: "not an object" };
  if (json.schemaVersion !== GM_OUTPUT_SCHEMA_VERSION) return { ok: false, reason: "bad schemaVersion" };
  if (!isString(json.narrative)) return { ok: false, reason: "narrative missing" };
  if (json.narrative.length > config.maxNarrativeLength) return { ok: false, reason: "narrative too long" };
  if (json.tone !== undefined && !(isString(json.tone) && TONES.has(json.tone))) return { ok: false, reason: "invalid tone" };
  const out: NarrationOutput = {
    schemaVersion: GM_OUTPUT_SCHEMA_VERSION,
    narrative: json.narrative,
    ...(isString(json.tone) ? { tone: json.tone as NarrationOutput["tone"] } : {}),
  };
  return { ok: true, output: out };
}

function parseDialogue(json: unknown, context: GmContext, config: GatewayConfig): OutputValidation {
  if (!isObject(json)) return { ok: false, reason: "not an object" };
  if (json.schemaVersion !== GM_OUTPUT_SCHEMA_VERSION) return { ok: false, reason: "bad schemaVersion" };
  if (!isString(json.speakerNpcId) || !isAllowedEntity(context, json.speakerNpcId)) {
    return { ok: false, reason: "speakerNpcId missing or not allow-listed" };
  }
  if (!isString(json.line)) return { ok: false, reason: "line missing" };
  if (json.line.length > config.maxDialogueLineLength) return { ok: false, reason: "line too long" };
  const proposals = parseProposalsStrict(json.proposals ?? [], context, config.maxProposals);
  if (!proposals.ok) return { ok: false, reason: proposals.reason };
  const out: DialogueOutput = {
    schemaVersion: GM_OUTPUT_SCHEMA_VERSION,
    speakerNpcId: json.speakerNpcId,
    line: json.line,
    proposals: proposals.proposals,
  };
  return { ok: true, output: out };
}

function parseBatch(json: unknown, context: GmContext, config: GatewayConfig): OutputValidation {
  if (!isObject(json)) return { ok: false, reason: "not an object" };
  if (json.schemaVersion !== GM_OUTPUT_SCHEMA_VERSION) return { ok: false, reason: "bad schemaVersion" };
  if (json.narrative !== undefined && !(isString(json.narrative) && json.narrative.length <= config.maxNarrativeLength)) {
    return { ok: false, reason: "invalid narrative" };
  }
  const proposals = parseProposalsStrict(json.proposals ?? [], context, config.maxProposals);
  if (!proposals.ok) return { ok: false, reason: proposals.reason };
  const out: GmProposalBatch = {
    schemaVersion: GM_OUTPUT_SCHEMA_VERSION,
    ...(isString(json.narrative) ? { narrative: json.narrative } : {}),
    proposals: proposals.proposals,
  };
  return { ok: true, output: out };
}

export function validateOutput(
  operation: GmOperation,
  rawText: string,
  context: GmContext,
  config: GatewayConfig
): OutputValidation {
  const json = parseJson(rawText);
  if (json === undefined) return { ok: false, reason: "provider output is not valid JSON" };
  switch (operation) {
    case "narrate":
      return parseNarration(json, config);
    case "dialogue":
      return parseDialogue(json, context, config);
    case "propose_quest":
    case "rumor":
    case "player_action":
      return parseBatch(json, context, config);
    default:
      return { ok: false, reason: "unknown operation" };
  }
}
