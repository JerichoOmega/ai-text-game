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
  talkTo: (npcId: string) => void;
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
   * not the same bug. advanceTime's bug was "mutate now, persist later,
   * and if persist fails the mutation already happened." talkTo never
   * calls SaveManager at all — it mutates `manager` in memory and updates
   * the UI, and the NPC memory it wrote only reaches disk on the NEXT
   * action that does persist (advanceTime or saveNow). That's a real but
   * DIFFERENT characteristic: no risk of manager-ahead-of-disk from a
   * failed save (there's no save attempt to fail), but a real risk of
   * losing an in-memory-only conversation if the app is killed before the
   * next autosave. Fixing that would mean adding persistence where none
   * exists today — a behavior change, not a consistency fix — which is
   * out of scope for this pass. Flagged here so it doesn't get missed.
   */
  talkTo: (npcId: string) => {
    const { manager, world } = get();
    if (!manager || !world) return;
    try {
      const npc = manager.getNpc(npcId);
      if (!npc) return;

      const line = DialogueSystem.getGreeting(npc, world);

      NPCMemorySystem.remember(manager, npcId, {
        type: "conversation",
        summary: `Spoke with the player.`,
        timestamp: world.currentDate,
        sentiment: 2,
      });

      set((state) => ({
        world: manager.getWorld(),
        storyLog: [...state.storyLog, `${npc.name}: "${line}"`],
      }));
    } catch (err) {
      // Synchronous, but still guarded: a bad NPC memory write shouldn't
      // take down the screen the player is looking at.
      Logger.error("useWorldStore", `talkTo("${npcId}") failed`, err);
    }
  },

  pushLog: (line: string) => set((state) => ({ storyLog: [...state.storyLog, line] })),

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
