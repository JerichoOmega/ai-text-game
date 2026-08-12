import type { EntityId } from "@/domain/types";
import type { GmContext } from "../context/GmContext";
import { isAllowedEntity } from "../context/GmContext";
import type { GmProposal } from "../contract/GmOutput";

/**
 * Structural + allow-list validation of AI proposals. This is the "Proposal
 * Validator" from the approved architecture: it decides whether a proposal is
 * even eligible to be handed to the deterministic systems. It does NOT apply
 * anything to the world (that wiring is Phase 3B-2/deterministic systems) and
 * imports no gameplay system, so it stays pure and isolated.
 */
export interface ProposalCheck {
  proposal: GmProposal;
  valid: boolean;
  reason?: string;
}

/** Every entity id a proposal references (for allow-list checking). */
function referencedIds(p: GmProposal): EntityId[] {
  switch (p.kind) {
    case "adjust_relationship":
      return [p.npcId];
    case "record_memory":
      return [p.npcId];
    case "advance_quest_objective":
      return [p.questId];
    case "offer_quest":
      return [p.targetSettlementId, p.targetNpcId].filter((x): x is EntityId => typeof x === "string");
    case "spawn_rumor":
      return [];
  }
}

/** Bounds a proposed sentiment to the range NPCMemorySystem accepts, so the AI
 *  can never smuggle an out-of-range value through record_memory. */
export function clampProposedSentiment(sentiment: number): number {
  return Math.max(-100, Math.min(100, Math.round(sentiment)));
}

export function validateProposal(context: GmContext, proposal: GmProposal): ProposalCheck {
  for (const id of referencedIds(proposal)) {
    if (!isAllowedEntity(context, id)) {
      return { proposal, valid: false, reason: `references unknown/disallowed entity "${id}"` };
    }
  }
  if (proposal.kind === "record_memory" && !Number.isFinite(proposal.sentiment)) {
    return { proposal, valid: false, reason: "record_memory sentiment is not a finite number" };
  }
  return { proposal, valid: true };
}

export function validateProposals(context: GmContext, proposals: GmProposal[]): ProposalCheck[] {
  return proposals.map((p) => validateProposal(context, p));
}
