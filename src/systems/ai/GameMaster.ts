import type { AIProvider, ProviderRequest } from "./providers/AIProvider";
import type {
  DialogueOutput,
  DialogueRequest,
  GmProposal,
  GmProposalBatch,
  GmResult,
  NarrationOutput,
  NarrationRequest,
  PlayerActionRequest,
  QuestProposalRequest,
  RumorRequest,
} from "./contract/GmOutput";
import { GM_OUTPUT_SCHEMA_VERSION } from "./contract/GmOutput";
import { parseProposal, parseProposalBatch } from "./contract/schema";
import type { GmContext } from "./context/GmContext";

export interface RumorOutput {
  schemaVersion: number;
  text: string;
}

/**
 * The single application-facing Game Master facade. It is EFFECT-FREE: it may
 * produce narrative/proposals but never mutates WorldState (it holds no
 * WorldStateManager). It talks only to an AIProvider and always returns a
 * GmResult, so callers never have to handle a thrown error.
 *
 * Phase 3B-1: with only the OfflineProvider registered, every operation
 * resolves through the deterministic fallback path below. There is no network,
 * no AI call, and this class is not yet wired to the UI. The AI-success branch
 * (parse + validate provider output) arrives with real providers in Phase 3C.
 */
export class GameMaster {
  constructor(private readonly provider: AIProvider) {}

  get providerId(): string {
    return this.provider.id;
  }

  async narrate(req: NarrationRequest): Promise<GmResult<NarrationOutput>> {
    const fallback = fallbackNarration(req.context);
    const res = await this.tryProvider({
      operation: "narrate",
      system: "",
      user: "",
      expectJson: false,
      context: req.context,
      ...(req.prompt !== undefined ? { playerLine: req.prompt } : {}),
    });
    if (res.ok) {
      const parsed = parseNarrationText(res.text);
      if (parsed) return { ok: true, source: "ai", value: parsed };
      return { ok: false, source: "fallback", reason: "unparseable narration", fallback };
    }
    return { ok: false, source: "fallback", reason: res.reason, fallback };
  }

  async converse(req: DialogueRequest): Promise<GmResult<DialogueOutput>> {
    const fallback = fallbackDialogue(req);
    const res = await this.tryProvider({
      operation: "dialogue",
      system: "",
      user: "",
      expectJson: true,
      context: req.context,
      npcId: req.npcId,
      ...(req.playerLine !== undefined ? { playerLine: req.playerLine } : {}),
    });
    if (res.ok) {
      const parsed = parseDialogueText(res.text);
      if (parsed) return { ok: true, source: "ai", value: parsed };
      return { ok: false, source: "fallback", reason: "unparseable dialogue", fallback };
    }
    return { ok: false, source: "fallback", reason: res.reason, fallback };
  }

  async proposeQuest(req: QuestProposalRequest): Promise<GmResult<GmProposalBatch>> {
    const fallback = emptyBatch();
    const res = await this.tryProvider({ operation: "propose_quest", system: "", user: "", expectJson: true, context: req.context });
    if (res.ok) {
      const parsed = parseProposalBatch(res.text);
      if (parsed) return { ok: true, source: "ai", value: parsed };
      return { ok: false, source: "fallback", reason: "unparseable batch", fallback };
    }
    return { ok: false, source: "fallback", reason: res.reason, fallback };
  }

  async proposeRumor(req: RumorRequest): Promise<GmResult<RumorOutput>> {
    const fallback: RumorOutput = { schemaVersion: GM_OUTPUT_SCHEMA_VERSION, text: "" };
    const res = await this.tryProvider({ operation: "rumor", system: "", user: "", expectJson: true, context: req.context });
    if (res.ok) {
      const parsed = parseRumorText(res.text);
      if (parsed) return { ok: true, source: "ai", value: parsed };
      return { ok: false, source: "fallback", reason: "unparseable rumor", fallback };
    }
    return { ok: false, source: "fallback", reason: res.reason, fallback };
  }

  async reactToPlayerAction(req: PlayerActionRequest): Promise<GmResult<GmProposalBatch>> {
    const fallback = emptyBatch();
    const res = await this.tryProvider({ operation: "player_action", system: "", user: "", expectJson: true, context: req.context, actionText: req.actionText });
    if (res.ok) {
      const parsed = parseProposalBatch(res.text);
      if (parsed) return { ok: true, source: "ai", value: parsed };
      return { ok: false, source: "fallback", reason: "unparseable batch", fallback };
    }
    return { ok: false, source: "fallback", reason: res.reason, fallback };
  }

  private async tryProvider(req: ProviderRequest): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
    if (!this.provider.isConfigured()) return { ok: false, reason: "provider not configured" };
    const response = await this.provider.complete(req);
    // Any provider failure -> deterministic fallback. On success we hand the
    // raw (already gateway-validated) text back to the caller for parsing; the
    // GameMaster itself never applies anything (see applyProposals for that).
    if (!response.ok) return { ok: false, reason: response.reason };
    return { ok: true, text: response.text };
  }
}

// --- Deterministic, effect-free fallbacks -----------------------------------

function fallbackNarration(context: GmContext): NarrationOutput {
  const loc = context.shortTerm.location.name;
  const time = context.shortTerm.time;
  return {
    schemaVersion: GM_OUTPUT_SCHEMA_VERSION,
    narrative: `You are in ${loc}. It is ${time.season}, day ${time.day} of year ${time.year}. The weather is ${time.weather.toLowerCase()}.`,
    tone: "neutral",
  };
}

function fallbackDialogue(req: DialogueRequest): DialogueOutput {
  const npc = req.context.session.npcsPresent.find((n) => n.npcId === req.npcId) ?? req.context.persistent.focusNpc;
  return {
    schemaVersion: GM_OUTPUT_SCHEMA_VERSION,
    speakerNpcId: req.npcId,
    line: npc ? `${npc.name} nods in greeting.` : "There is no one here to speak with.",
    proposals: [],
  };
}

function emptyBatch(): GmProposalBatch {
  return { schemaVersion: GM_OUTPUT_SCHEMA_VERSION, proposals: [] };
}

// --- Lightweight parsers for gateway-validated output -----------------------
// The gateway already validated this text server-side; these guards simply
// re-shape it into typed values (and stay defensive against malformed input).

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function tryJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function parseNarrationText(text: string): NarrationOutput | null {
  const j = tryJson(text);
  if (!isObject(j) || typeof j.narrative !== "string") return null;
  return {
    schemaVersion: GM_OUTPUT_SCHEMA_VERSION,
    narrative: j.narrative,
    ...(typeof j.tone === "string" ? { tone: j.tone as NarrationOutput["tone"] } : {}),
  };
}

function parseDialogueText(text: string): DialogueOutput | null {
  const j = tryJson(text);
  if (!isObject(j) || typeof j.speakerNpcId !== "string" || typeof j.line !== "string") return null;
  const proposals: GmProposal[] = Array.isArray(j.proposals)
    ? j.proposals.map((p) => parseProposal(p)).filter((p): p is GmProposal => p !== null)
    : [];
  return { schemaVersion: GM_OUTPUT_SCHEMA_VERSION, speakerNpcId: j.speakerNpcId, line: j.line, proposals };
}

function parseRumorText(text: string): RumorOutput | null {
  const j = tryJson(text);
  if (!isObject(j) || typeof j.text !== "string") return null;
  return { schemaVersion: GM_OUTPUT_SCHEMA_VERSION, text: j.text };
}
