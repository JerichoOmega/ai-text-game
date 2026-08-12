import type { AIProvider, ProviderRequest } from "./providers/AIProvider";
import type {
  DialogueOutput,
  DialogueRequest,
  GmProposalBatch,
  GmResult,
  NarrationOutput,
  NarrationRequest,
  PlayerActionRequest,
  QuestProposalRequest,
  RumorRequest,
} from "./contract/GmOutput";
import { GM_OUTPUT_SCHEMA_VERSION } from "./contract/GmOutput";
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
    const res = await this.tryProvider({ operation: "narrate", system: "", user: "", expectJson: false });
    return res.ok ? { ok: true, source: "fallback", value: fallback } : { ok: false, source: "fallback", reason: res.reason, fallback };
    // NOTE: even the "ok" provider branch returns fallback in 3B-1 — no real
    // provider exists yet, so nothing else can be produced.
  }

  async converse(req: DialogueRequest): Promise<GmResult<DialogueOutput>> {
    const fallback = fallbackDialogue(req);
    const res = await this.tryProvider({ operation: "dialogue", system: "", user: "", expectJson: true });
    return res.ok ? { ok: true, source: "fallback", value: fallback } : { ok: false, source: "fallback", reason: res.reason, fallback };
  }

  async proposeQuest(_req: QuestProposalRequest): Promise<GmResult<GmProposalBatch>> {
    const fallback = emptyBatch();
    const res = await this.tryProvider({ operation: "propose_quest", system: "", user: "", expectJson: true });
    return res.ok ? { ok: true, source: "fallback", value: fallback } : { ok: false, source: "fallback", reason: res.reason, fallback };
  }

  async proposeRumor(_req: RumorRequest): Promise<GmResult<RumorOutput>> {
    const fallback: RumorOutput = { schemaVersion: GM_OUTPUT_SCHEMA_VERSION, text: "" };
    const res = await this.tryProvider({ operation: "rumor", system: "", user: "", expectJson: true });
    return res.ok ? { ok: true, source: "fallback", value: fallback } : { ok: false, source: "fallback", reason: res.reason, fallback };
  }

  async reactToPlayerAction(_req: PlayerActionRequest): Promise<GmResult<GmProposalBatch>> {
    const fallback = emptyBatch();
    const res = await this.tryProvider({ operation: "player_action", system: "", user: "", expectJson: true });
    return res.ok ? { ok: true, source: "fallback", value: fallback } : { ok: false, source: "fallback", reason: res.reason, fallback };
  }

  private async tryProvider(req: ProviderRequest): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!this.provider.isConfigured()) return { ok: false, reason: "provider not configured" };
    const response = await this.provider.complete(req);
    // In 3B-1 the offline provider always returns not-ok; treat any failure as
    // "use fallback". A real provider's success will be parsed/validated in 3C.
    if (!response.ok) return { ok: false, reason: response.reason };
    return { ok: false, reason: "no-op: provider output handling arrives in Phase 3C" };
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
