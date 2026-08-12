import type { GameDate, WorldState } from "@/domain/types";
import { toAbsoluteDay } from "@/domain/types";
import type { WorldStateManager } from "@/systems/WorldStateManager";
import { NPCMemorySystem } from "@/systems/NPCMemorySystem";
import { runTransactionalWorldUpdate } from "@/systems/WorldTransaction";
import { rumorFeed } from "@/systems/RumorSystem";
import type { GmContext } from "../context/GmContext";
import type { GmProposal, GmProposalBatch } from "../contract/GmOutput";
import { clampProposedSentiment, validateProposals } from "../validation/ProposalValidator";

/**
 * THE single authoritative application boundary for AI proposals:
 *
 *   provider batch -> ProposalValidator (allow-list) -> deterministic op
 *                  -> WorldTransaction -> SaveManager (persist) -> commit
 *
 * Wrappers and providers MUST NOT apply proposals themselves — they route
 * here. AI stays proposal/text-only: this function can never set HP, damage,
 * XP, gold, inventory, combat outcomes, world time, RNG, NPC death, or
 * settlement destruction, because no proposal kind can express those and this
 * code only ever calls existing deterministic systems on a candidate clone.
 * `clampProposedSentiment` is applied here as part of the authoritative path.
 *
 * Effect-free unless it commits: mutations happen on WorldTransaction's clone,
 * so a failed persist leaves authoritative state byte-for-byte unchanged.
 */
export interface ApplyReport {
  committed: boolean;
  applied: GmProposal[];
  skipped: { proposal: GmProposal; reason: string }[];
  stage?: "simulate" | "persist";
}

// Deterministic sentiment magnitude for a relationship nudge. Applied as a
// memory so it flows through the authoritative memory->relationship math
// rather than overwriting the derived field directly.
const RELATIONSHIP_STEP: Record<"small" | "large", number> = { small: 15, large: 40 };

// Proposal kinds whose authoritative deterministic operation is not wired yet.
// They are validated but NOT applied in 3C-1 (offer_quest can never author a
// quest; advance_quest_objective needs a deterministic quest op added later).
const NOT_YET_APPLICABLE: Record<string, string> = {
  offer_quest: "advisory only — quests are authored deterministically, never by AI",
  advance_quest_objective: "deferred — requires a deterministic quest operation (later phase)",
};

export async function applyGmProposals(
  manager: WorldStateManager,
  context: GmContext,
  batch: GmProposalBatch,
  now: GameDate,
  persist: (world: WorldState) => Promise<void>
): Promise<ApplyReport> {
  const skipped: { proposal: GmProposal; reason: string }[] = [];
  const toApply: GmProposal[] = [];

  for (const check of validateProposals(context, batch.proposals)) {
    if (!check.valid) {
      skipped.push({ proposal: check.proposal, reason: check.reason ?? "invalid proposal" });
      continue;
    }
    const notApplicable = NOT_YET_APPLICABLE[check.proposal.kind];
    if (notApplicable) {
      skipped.push({ proposal: check.proposal, reason: notApplicable });
      continue;
    }
    toApply.push(check.proposal);
  }

  if (toApply.length === 0) {
    return { committed: false, applied: [], skipped };
  }

  const pendingRumors: string[] = [];

  const outcome = await runTransactionalWorldUpdate(
    manager,
    async (candidate) => {
      for (const proposal of toApply) {
        switch (proposal.kind) {
          case "record_memory":
            NPCMemorySystem.remember(candidate, proposal.npcId, {
              type: "conversation",
              summary: proposal.summary,
              timestamp: now,
              sentiment: clampProposedSentiment(proposal.sentiment),
            });
            break;
          case "adjust_relationship": {
            const magnitude = RELATIONSHIP_STEP[proposal.magnitude];
            const signed = proposal.direction === "up" ? magnitude : -magnitude;
            NPCMemorySystem.remember(candidate, proposal.npcId, {
              type: "conversation",
              summary: proposal.reason,
              timestamp: now,
              sentiment: clampProposedSentiment(signed),
            });
            break;
          }
          case "spawn_rumor":
            pendingRumors.push(proposal.text);
            break;
        }
      }
    },
    persist
  );

  if (!outcome.committed) {
    return { committed: false, applied: [], skipped, stage: outcome.stage };
  }

  // Rumors are in-memory (not WorldState), so add them only after commit.
  for (const text of pendingRumors) rumorFeed.add(text, toAbsoluteDay(now));

  return { committed: true, applied: toApply, skipped };
}
