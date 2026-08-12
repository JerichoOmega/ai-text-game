import type { GameDate, Quest } from "@/domain/types";
import type { WorldStateManager } from "@/systems/WorldStateManager";
import { QuestGenerator } from "@/systems/QuestGenerator";
import { buildGmContext } from "../context/ContextBuilder";
import type { GameMaster } from "../GameMaster";
import { DEFAULT_AI_CONFIG, isAiEnabled, type AiConfig, type WrapperSource } from "../aiConfig";

export interface QuestOfferResult {
  source: WrapperSource;
  /** Authoritative quests, always produced by QuestGenerator. */
  quests: Quest[];
}

/**
 * Wraps QuestGenerator. The deterministic generator ALWAYS constructs the
 * authoritative Quest objects — ids, objectives, targets, rewards. The AI can
 * neither create a quest nor mutate one; its only future role is to re-rank or
 * add narrative flavor around quests the generator already produced.
 *
 *   AI enabled : GameMaster.proposeQuest (advisory only) then pass generator quests through
 *   AI disabled: QuestGenerator output, untouched
 *
 * In Phase 3B-2 the offline GameMaster yields no proposals, so the quests are
 * always exactly QuestGenerator's output. Generating offers is non-mutating
 * (QuestGenerator does not write to world state).
 */
export class QuestOffers {
  constructor(
    private readonly config: AiConfig = DEFAULT_AI_CONFIG,
    private readonly gm?: GameMaster
  ) {}

  async generate(manager: WorldStateManager, now: GameDate, maxNew = 5): Promise<QuestOfferResult> {
    const quests = QuestGenerator.generateAvailableQuests(manager, now, maxNew);
    if (!isAiEnabled(this.config) || !this.gm || quests.length === 0) {
      return { source: "deterministic", quests };
    }
    // Advisory pass only. The quests themselves are never replaced or edited.
    const res = await this.gm.proposeQuest({ context: buildGmContext(manager, { kind: "scene" }) });
    const source: WrapperSource = res.ok && res.source === "ai" ? "ai" : "deterministic";
    return { source, quests };
  }
}
