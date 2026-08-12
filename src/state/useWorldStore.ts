import { create, type StoreApi } from "zustand";
import type { CombatAction, CombatEncounter, CombatOutcome, PlayerOrigin, WorldState } from "@/domain/types";
import { WorldStateManager } from "@/systems/WorldStateManager";
import { SaveManager } from "@/systems/SaveManager";
import { TimeSystem } from "@/systems/TimeSystem";
import { runTransactionalWorldUpdate } from "@/systems/WorldTransaction";
import { NPCMemorySystem } from "@/systems/NPCMemorySystem";
import { DialogueSystem } from "@/systems/DialogueSystem";
import { EventEngine } from "@/systems/EventEngine";
import { CombatSystem } from "@/systems/CombatSystem";
import { resolveRound } from "@/systems/CombatEngine";
import { ProgressionSystem } from "@/systems/ProgressionSystem";
import { EquipmentSystem } from "@/systems/EquipmentSystem";
import { COMBAT_OBJECTIVE_TYPES } from "@/systems/QuestSystem";
import { findShopItem } from "@/data/shopCatalog";
import { Logger } from "@/utils/logger";

interface CombatContext {
  questId: string;
  objectiveId: string;
  locationIds: string[];
}

interface CombatSummary {
  outcome: CombatOutcome;
  xpGained: number;
  leveledFrom: number;
  leveledTo: number;
}

interface WorldStore {
  world: WorldState | null;
  manager: WorldStateManager | null;
  loading: boolean;
  storyLog: string[];
  lastSavedAt: Date | null;
  /** Set when an async action fails. `ErrorBoundary` does NOT catch this —
   * error boundaries only catch errors thrown during render, not inside
   * event handlers or promises (a common misconception). Async store
   * actions have to handle their own failures, which is what this field
   * and the try/catch blocks below are for. Nothing reads this yet (no
   * screen shows a save-failed banner) — it exists so that UI can be added
   * without touching the store again, same "prepare the architecture"
   * pattern as the audio volume state. */
  lastError: string | null;

  /** Live interactive combat state (null when not in a fight). */
  combat: CombatEncounter | null;
  combatLog: string[];
  combatContext: CombatContext | null;
  combatSummary: CombatSummary | null;
  /** Consumable item ids used during the current fight, removed on finish. */
  combatConsumed: string[];

  initialize: (playerNameIfNew: string) => Promise<void>;
  startNewAdventure: (name: string, origin?: PlayerOrigin) => Promise<void>;
  advanceTime: (days: number) => Promise<void>;
  beginQuestBattle: (questId: string) => boolean;
  combatAct: (action: CombatAction) => Promise<void>;
  chooseLevelUpAbility: (abilityId: string) => Promise<void>;
  endCombat: () => void;
  buyItem: (itemId: string) => Promise<boolean>;
  equipItem: (itemId: string) => Promise<void>;
  unequipItem: (itemId: string) => Promise<void>;
  talkTo: (npcId: string) => Promise<void>;
  travelTo: (settlementId: string) => Promise<void>;
  pushLog: (line: string) => void;
  saveNow: () => Promise<void>;
}

/**
 * Commits a finished encounter: sets the player's post-fight HP, awards XP
 * (and applies any level-ups) on victory, restores to 1 HP on defeat (Part
 * 24 MVP: no permadeath), and dispatches the quest victory event so the
 * existing objective->completion->reward pipeline runs. All inside one
 * transaction — persisted before it becomes authoritative.
 */
async function finishCombat(
  get: () => WorldStore,
  set: StoreApi<WorldStore>["setState"],
  encounter: CombatEncounter
): Promise<void> {
  const { manager, combatContext } = get();
  if (!manager) return;
  const leveledFrom = manager.getWorld().player.level;
  const consumed = get().combatConsumed;

  const outcome = await runTransactionalWorldUpdate(
    manager,
    async (candidate) => {
      const w = candidate.getWorld();
      let inventoryItemIds = w.player.inventoryItemIds;
      for (const id of consumed) {
        const idx = inventoryItemIds.indexOf(id);
        if (idx >= 0) inventoryItemIds = [...inventoryItemIds.slice(0, idx), ...inventoryItemIds.slice(idx + 1)];
      }
      let player = { ...w.player, hp: Math.max(0, encounter.player.hp), inventoryItemIds };
      let xpGained = 0;
      if (encounter.outcome === "victory") {
        xpGained = CombatSystem.totalXpReward(encounter);
        player = ProgressionSystem.grantXp(player, xpGained).player;
      }
      if (encounter.outcome === "defeat") {
        player = { ...player, hp: 1 };
      }
      candidate.replaceWorld({ ...w, player });

      if (encounter.outcome === "victory" && combatContext) {
        const victory = CombatSystem.victoryEvent(encounter, {
          timestamp: w.currentDate,
          locationIds: combatContext.locationIds,
        });
        if (victory) await EventEngine.dispatch(candidate, victory);
      }
      return { xpGained };
    },
    (w) => SaveManager.save(w)
  );

  if (!outcome.committed) {
    Logger.error("useWorldStore", "finishCombat failed", outcome.error);
    set({ lastError: "The battle ended, but saving failed." });
    return;
  }

  const player = manager.getWorld().player;
  set((state) => ({
    world: manager.getWorld(),
    combatSummary: {
      outcome: encounter.outcome,
      xpGained: outcome.result.xpGained,
      leveledFrom,
      leveledTo: player.level,
    },
    lastSavedAt: new Date(),
    lastError: null,
    storyLog:
      encounter.outcome === "victory"
        ? [...state.storyLog, `Victory! You gained ${outcome.result.xpGained} XP.`]
        : state.storyLog,
  }));
}

/**
 * Presentation code never touches systems/ or data/ directly — it goes
 * through this store. That keeps gameplay logic (in src/systems) fully
 * decoupled from React, per the "no gameplay logic in UI components" rule.
 */
export const useWorldStore = create<WorldStore>((set, get) => ({
  world: null,
  manager: null,
  loading: true,
  storyLog: [],
  lastSavedAt: null,
  lastError: null,
  combat: null,
  combatLog: [],
  combatContext: null,
  combatSummary: null,
  combatConsumed: [],

  initialize: async (playerNameIfNew: string) => {
    set({ loading: true, lastError: null });
    try {
      const manager = await SaveManager.loadOrCreate(playerNameIfNew);
      set({ manager, world: manager.getWorld(), loading: false, lastSavedAt: new Date() });
    } catch (err) {
      Logger.error("useWorldStore", "initialize failed", err);
      set({ loading: false, lastError: "Failed to load your save." });
    }
  },

  /**
   * Starts a fresh saga under a chosen hero name, discarding any prior
   * save (see SaveManager.createNewWorld). Resets the in-memory story log
   * so the new game doesn't inherit the previous one's messages.
   */
  startNewAdventure: async (name: string, origin?: PlayerOrigin) => {
    set({ loading: true, lastError: null });
    try {
      const manager = await SaveManager.createNewWorld(name.trim() || "Wanderer", origin);
      set({ manager, world: manager.getWorld(), loading: false, lastSavedAt: new Date(), storyLog: [] });
    } catch (err) {
      Logger.error("useWorldStore", "startNewAdventure failed", err);
      set({ loading: false, lastError: "Failed to start a new adventure." });
    }
  },

  advanceTime: async (days: number) => {
    const { manager } = get();
    if (!manager) return;

    // See src/systems/WorldTransaction.ts for the invariant this
    // guarantees. Simulation runs against a disposable clone; `manager`
    // (the authoritative, shared instance every screen reads through) is
    // only mutated in the final line of runTransactionalWorldUpdate, and
    // only once persistence has already succeeded. A failure at either
    // stage leaves `manager` — and therefore the Zustand `world` below,
    // since we only read from it after a committed outcome — byte-for-byte
    // unchanged from before this call, which also means it stays exactly
    // equal to what's on disk.
    const outcome = await runTransactionalWorldUpdate(
      manager,
      (candidate) => TimeSystem.advance(candidate, days),
      (world) => SaveManager.save(world)
    );

    if (!outcome.committed) {
      Logger.error("useWorldStore", `advanceTime failed at "${outcome.stage}" stage`, outcome.error);
      set({
        lastError:
          outcome.stage === "simulate"
            ? "Something went wrong advancing time. Nothing changed — your world is exactly as it was."
            : "Time advanced, but saving failed. Nothing changed — your world is exactly as it was.",
      });
      return;
    }

    set((state) => ({
      world: manager.getWorld(),
      storyLog: [...state.storyLog, ...outcome.result.logLines],
      lastSavedAt: new Date(),
      lastError: null,
    }));
  },

  /**
   * Sets up an interactive encounter for a quest's combat objective and
   * puts the store into "in combat" mode. No persistence happens here — the
   * fight plays out in memory (combatAct) and only commits at the end
   * (finishCombat). The screen navigates to /combat after this returns true.
   */
  beginQuestBattle: (questId: string) => {
    const { manager, world } = get();
    if (!manager || !world) return false;
    const quest = world.quests[questId];
    if (!quest) return false;
    const objective = quest.objectives.find((o) => !o.complete && COMBAT_OBJECTIVE_TYPES.has(o.type));
    if (!objective) return false;

    const encounter = CombatSystem.startQuestEncounter(world.player);
    const enemyName = encounter.enemies[0]?.name ?? "the enemy";
    set({
      combat: encounter,
      combatLog: [`A ${enemyName} blocks your path. Steel yourself.`],
      combatContext: { questId, objectiveId: objective.id, locationIds: objective.targetId ? [objective.targetId] : [] },
      combatSummary: null,
      combatConsumed: [],
    });
    return true;
  },

  /**
   * Resolves one combat round through the single CombatEngine, appends the
   * narration, and — if the fight ended — commits the outcome (XP, HP,
   * quest event) transactionally. Deterministic: no RNG here.
   */
  combatAct: async (action: CombatAction) => {
    const { combat, combatLog, combatConsumed } = get();
    if (!combat || combat.outcome !== "ongoing") return;
    if (action.type === "flee" && !combat.canFlee) return;

    if (action.type === "item" && action.itemId) {
      set({ combatConsumed: [...combatConsumed, action.itemId] });
    }

    const { encounter, log } = resolveRound(combat, action);
    set({ combat: encounter, combatLog: [...combatLog, ...log] });

    if (encounter.outcome !== "ongoing") {
      await finishCombat(get, set, encounter);
    }
  },

  /**
   * Applies a level-up ability choice (validated in ProgressionSystem so a
   * player can never unlock two from one level or the wrong category) and
   * persists it. The combat screen re-reads pendingAbilitySelection after.
   */
  chooseLevelUpAbility: async (abilityId: string) => {
    const { manager, world } = get();
    if (!manager || !world) return;

    const outcome = await runTransactionalWorldUpdate(
      manager,
      async (candidate) => {
        const w = candidate.getWorld();
        const player = ProgressionSystem.applyAbilityChoice(w.player, abilityId, w.seed);
        candidate.replaceWorld({ ...w, player });
        return player;
      },
      (w) => SaveManager.save(w)
    );

    if (!outcome.committed) {
      Logger.error("useWorldStore", "chooseLevelUpAbility failed", outcome.error);
      set({ lastError: "Couldn't save your new ability." });
      return;
    }
    set({ world: manager.getWorld(), lastSavedAt: new Date(), lastError: null });
  },

  endCombat: () => set({ combat: null, combatLog: [], combatContext: null, combatSummary: null, combatConsumed: [] }),

  /**
   * Buys a deterministic shop-catalog item: deducts its price from the
   * existing `gold` currency and appends its id to the existing
   * `inventoryItemIds` (no new economy/inventory system). Runs inside
   * runTransactionalWorldUpdate so the purchase persists before it becomes
   * authoritative. Returns true on success, false if unaffordable or the
   * save failed. Deterministic — no RNG, no AI.
   */
  buyItem: async (itemId: string) => {
    const { manager } = get();
    if (!manager) return false;

    const item = findShopItem(itemId);
    if (!item) return false;

    if (manager.getWorld().player.gold < item.price) {
      set({ lastError: `You can't afford ${item.name}.` });
      return false;
    }

    const outcome = await runTransactionalWorldUpdate(
      manager,
      async (candidate) => {
        const world = candidate.getWorld();
        candidate.replaceWorld({
          ...world,
          player: {
            ...world.player,
            gold: world.player.gold - item.price,
            inventoryItemIds: [...world.player.inventoryItemIds, item.id],
          },
        });
        return item;
      },
      (world) => SaveManager.save(world)
    );

    if (!outcome.committed) {
      Logger.error("useWorldStore", `buyItem("${itemId}") failed at "${outcome.stage}" stage`, outcome.error);
      set({ lastError: "The purchase couldn't be saved. Nothing changed." });
      return false;
    }

    set((state) => ({
      world: manager.getWorld(),
      storyLog: [...state.storyLog, `Bought ${item.name} for ${item.price} gold.`],
      lastSavedAt: new Date(),
      lastError: null,
    }));
    return true;
  },

  /**
   * Equips an owned item (weapon/armor/trinket). Delegates the id-shuffle to
   * EquipmentSystem (pure), then persists through the same
   * WorldTransaction/SaveManager boundary as every other player mutation.
   * effectiveStats — and therefore combat — pick up the change automatically.
   */
  equipItem: async (itemId: string) => {
    const { manager } = get();
    if (!manager) return;
    const before = manager.getWorld().player;
    const next = EquipmentSystem.equipItem(before, itemId);
    if (next === before) return; // invalid op — no-op, no save

    const outcome = await runTransactionalWorldUpdate(
      manager,
      async (candidate) => {
        candidate.replaceWorld({ ...candidate.getWorld(), player: next });
        return next;
      },
      (w) => SaveManager.save(w)
    );
    if (!outcome.committed) {
      Logger.error("useWorldStore", `equipItem("${itemId}") failed`, outcome.error);
      set({ lastError: "Couldn't save your equipment change." });
      return;
    }
    set({ world: manager.getWorld(), lastSavedAt: new Date(), lastError: null });
  },

  unequipItem: async (itemId: string) => {
    const { manager } = get();
    if (!manager) return;
    const before = manager.getWorld().player;
    const next = EquipmentSystem.unequipItem(before, itemId);
    if (next === before) return;

    const outcome = await runTransactionalWorldUpdate(
      manager,
      async (candidate) => {
        candidate.replaceWorld({ ...candidate.getWorld(), player: next });
        return next;
      },
      (w) => SaveManager.save(w)
    );
    if (!outcome.committed) {
      Logger.error("useWorldStore", `unequipItem("${itemId}") failed`, outcome.error);
      set({ lastError: "Couldn't save your equipment change." });
      return;
    }
    set({ world: manager.getWorld(), lastSavedAt: new Date(), lastError: null });
  },


  /**
   * Records a conversation in the NPC's memory (which recomputes their
   * relationship toward the player) and seats the greeting in the story log.
   *
   * The memory/relationship write now goes through the SAME transactional
   * boundary as every other authoritative world mutation
   * (runTransactionalWorldUpdate -> SaveManager.save): it runs on a
   * disposable clone and only becomes authoritative once the save has
   * succeeded. Previously it mutated `manager` directly and never persisted,
   * so a conversation could be lost if the app closed before the next
   * autosave, and `manager` could drift ahead of disk. Now a failed save
   * leaves the authoritative world (and disk) byte-for-byte unchanged.
   *
   * The greeting itself is display-only and reflects the pre-conversation
   * state (exactly as before), so it is computed outside the transaction.
   * The dialogue screen shows the greeting from its own local state, so the
   * on-screen conversation is unchanged regardless of the save outcome.
   */
  talkTo: async (npcId: string) => {
    const { manager, world } = get();
    if (!manager || !world) return;

    const npc = manager.getNpc(npcId);
    if (!npc) return;

    const line = DialogueSystem.getGreeting(npc, world);
    const npcName = npc.name;

    const outcome = await runTransactionalWorldUpdate(
      manager,
      async (candidate) => {
        NPCMemorySystem.remember(candidate, npcId, {
          type: "conversation",
          summary: `Spoke with the player.`,
          timestamp: world.currentDate,
          sentiment: 2,
        });
        // Announce the conversation so the quest-progress subscriber can
        // advance any active talk_to_npc objective that targets this NPC and
        // complete the quest through the existing QuestSystem path. Runs on
        // the same candidate, so quest progress/reward persist atomically.
        await EventEngine.dispatch(candidate, {
          type: "player_talked_to_npc",
          timestamp: world.currentDate,
          description: `Spoke with ${npcName}.`,
          affectedEntityIds: [npcId],
          originatedFromPlayer: true,
        });
      },
      (w) => SaveManager.save(w)
    );

    if (!outcome.committed) {
      Logger.error("useWorldStore", `talkTo("${npcId}") failed at "${outcome.stage}" stage`, outcome.error);
      set({ lastError: "Couldn't save the conversation. Nothing changed." });
      return;
    }

    set((state) => ({
      world: manager.getWorld(),
      storyLog: [...state.storyLog, `${npcName}: "${line}"`],
      lastSavedAt: new Date(),
      lastError: null,
    }));
  },

  pushLog: (line: string) => set((state) => ({ storyLog: [...state.storyLog, line] })),

  /**
   * Moves the player to a settlement (the game had no travel action before —
   * `currentSettlementId` was fixed at creation). Persists through the same
   * WorldTransaction/SaveManager boundary as every other player mutation, and
   * dispatches `player_arrived_at_settlement` on the candidate so the
   * quest-progress subscriber can complete any deliver_item objective whose
   * destination is this settlement. Uses only the existing currentSettlementId
   * field — no new inventory/delivery data model.
   */
  travelTo: async (settlementId: string) => {
    const { manager, world } = get();
    if (!manager || !world) return;
    const destination = world.settlements[settlementId];
    if (!destination || destination.destroyed) {
      set({ lastError: "You can't travel there." });
      return;
    }

    const outcome = await runTransactionalWorldUpdate(
      manager,
      async (candidate) => {
        const w = candidate.getWorld();
        candidate.replaceWorld({ ...w, player: { ...w.player, currentSettlementId: settlementId } });
        await EventEngine.dispatch(candidate, {
          type: "player_arrived_at_settlement",
          timestamp: w.currentDate,
          description: `Arrived at ${destination.name}.`,
          affectedEntityIds: [settlementId],
          originatedFromPlayer: true,
        });
      },
      (w) => SaveManager.save(w)
    );

    if (!outcome.committed) {
      Logger.error("useWorldStore", `travelTo("${settlementId}") failed at "${outcome.stage}" stage`, outcome.error);
      set({ lastError: "Couldn't save your travel. Nothing changed." });
      return;
    }

    set((state) => ({
      world: manager.getWorld(),
      storyLog: [...state.storyLog, `You arrive at ${destination.name}.`],
      lastSavedAt: new Date(),
      lastError: null,
    }));
  },

  /**
   * Does NOT use runTransactionalWorldUpdate — correctly. saveNow has no
   * `simulate` stage at all; it just re-persists whatever `manager`
   * already holds. There is nothing for it to protect against: it never
   * mutates `manager`, so a failed save here can't leave the in-memory
   * state ahead of disk — it can only leave disk exactly where it already
   * was (unchanged) or catch it up. After the advanceTime fix, `manager`
   * is also now guaranteed to already match disk before saveNow is ever
   * called (see WorldTransaction.ts), so in practice this call is close
   * to a no-op verification write rather than a risk point.
   */
  saveNow: async () => {
    const { manager } = get();
    if (!manager) return;
    try {
      await SaveManager.save(manager.getWorld());
      set({ lastSavedAt: new Date(), lastError: null });
    } catch (err) {
      Logger.error("useWorldStore", "saveNow failed", err);
      set({ lastError: "Save failed. Will retry automatically on the next action." });
    }
  },
}));
