import { create } from "zustand";
import type { WorldState } from "@/domain/types";
import { WorldStateManager } from "@/systems/WorldStateManager";
import { SaveManager } from "@/systems/SaveManager";
import { TimeSystem } from "@/systems/TimeSystem";
import { runTransactionalWorldUpdate } from "@/systems/WorldTransaction";
import { NPCMemorySystem } from "@/systems/NPCMemorySystem";
import { DialogueSystem } from "@/systems/DialogueSystem";
import { EventEngine } from "@/systems/EventEngine";
import { CombatSystem } from "@/systems/CombatSystem";
import { COMBAT_OBJECTIVE_TYPES } from "@/systems/QuestSystem";
import { Logger } from "@/utils/logger";

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

  initialize: (playerNameIfNew: string) => Promise<void>;
  startNewAdventure: (name: string) => Promise<void>;
  advanceTime: (days: number) => Promise<void>;
  resolveQuestBattle: (questId: string) => Promise<void>;
  talkTo: (npcId: string) => void;
  pushLog: (line: string) => void;
  saveNow: () => Promise<void>;
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
  startNewAdventure: async (name: string) => {
    set({ loading: true, lastError: null });
    try {
      const manager = await SaveManager.createNewWorld(name.trim() || "Wanderer");
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
   * Drives the core gameplay loop for a quest's combat objective:
   * resolve an encounter, and on victory dispatch the combat-victory
   * world event through EventEngine. From there the existing EventBus
   * subscribers carry it the rest of the way — quest objective progress
   * (questProgressSubscriber) -> authoritative completion (QuestSystem)
   * -> reward + reputation -> history + NPC memory + world consequences.
   *
   * Runs inside runTransactionalWorldUpdate so a failure leaves the
   * authoritative world exactly as it was, and persistence succeeds before
   * the result is committed. All gameplay logic lives in systems/; this
   * store action only orchestrates and surfaces the result to the UI.
   */
  resolveQuestBattle: async (questId: string) => {
    const { manager } = get();
    if (!manager) return;

    const outcome = await runTransactionalWorldUpdate(
      manager,
      async (candidate) => {
        const quest = candidate.getQuest(questId);
        if (!quest) return { logLines: ["That quest is no longer available."], completed: false };

        const objective = quest.objectives.find((o) => !o.complete && COMBAT_OBJECTIVE_TYPES.has(o.type));
        if (!objective) return { logLines: ["There is no battle to resolve for this quest."], completed: false };

        const world = candidate.getWorld();
        const location = objective.targetId ? candidate.getSettlement(objective.targetId) : undefined;
        const { encounter, logLines } = CombatSystem.resolveAutoBattle(world.player);

        const victory = CombatSystem.victoryEvent(encounter, {
          timestamp: world.currentDate,
          locationIds: objective.targetId ? [objective.targetId] : [],
          description: location
            ? `The raiders threatening the roads near ${location.name} were driven off.`
            : "The raiders threatening the roads were driven off.",
        });

        if (!victory) {
          logLines.push("You were beaten back and must recover before trying again.");
          return { logLines, completed: false };
        }

        await EventEngine.dispatch(candidate, victory);

        const after = candidate.getQuest(questId);
        const completed = after?.status === "completed";
        if (completed) logLines.push(`Quest complete: "${quest.title}".`);
        return { logLines, completed };
      },
      (world) => SaveManager.save(world)
    );

    if (!outcome.committed) {
      Logger.error("useWorldStore", `resolveQuestBattle failed at "${outcome.stage}" stage`, outcome.error);
      set({
        lastError:
          outcome.stage === "simulate"
            ? "Something went wrong resolving the battle. Nothing changed — your world is exactly as it was."
            : "The battle was resolved, but saving failed. Nothing changed — your world is exactly as it was.",
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
