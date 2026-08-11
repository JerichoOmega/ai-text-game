import type { PlayerOrigin, WorldState } from "@/domain/types";
import { worldRepository } from "@/data/repositories/worldRepository";
import { resetDb } from "@/data/db";
import { buildSeedWorld } from "@/data/seed/seedWorld";
import { WorldStateManager } from "./WorldStateManager";
import { QuestGenerator } from "./QuestGenerator";
import { registerAllEventSubscribers } from "./eventSubscribers/registerAllEventSubscribers";

export const SaveManager = {
  /** Loads the existing save, or seeds and persists a brand-new world if none exists. */
  async loadOrCreate(playerNameIfNew: string): Promise<WorldStateManager> {
    // Must happen before any EventEngine.dispatch — otherwise history/memory/
    // rumor/achievement reactions silently don't fire because nothing is
    // listening on the bus yet. loadOrCreate is the one entry point every
    // app launch goes through, so it's the right place for this.
    registerAllEventSubscribers();

    const existing = await worldRepository.loadAll();
    if (existing) {
      return new WorldStateManager(existing);
    }

    const fresh = buildSeedWorld(playerNameIfNew);
    const manager = new WorldStateManager(fresh);

    // Seed a handful of quests so the world isn't empty on first launch.
    const initialQuests = QuestGenerator.generateAvailableQuests(manager, fresh.currentDate, 5);
    for (const quest of initialQuests) {
      manager.setQuest(quest);
    }

    await worldRepository.saveAll(manager.getWorld());
    return manager;
  },

  async save(world: WorldState): Promise<void> {
    await worldRepository.saveAll(world);
  },

  /**
   * Discards any existing save and seeds a brand-new world under the given
   * hero name — the "New Adventure" path. Clears every table (including the
   * append-only events/history logs) via resetDb so the fresh saga starts
   * with a clean chronicle, then seeds and persists exactly like a first
   * launch. Uses the same repositories/seed as loadOrCreate — no second
   * persistence path.
   */
  async createNewWorld(playerName: string, origin?: PlayerOrigin): Promise<WorldStateManager> {
    registerAllEventSubscribers();
    await resetDb();

    const fresh = buildSeedWorld(playerName, origin);
    const manager = new WorldStateManager(fresh);

    const initialQuests = QuestGenerator.generateAvailableQuests(manager, fresh.currentDate, 5);
    for (const quest of initialQuests) {
      manager.setQuest(quest);
    }

    await worldRepository.saveAll(manager.getWorld());
    return manager;
  },

  async hasExistingSave(): Promise<boolean> {
    return worldRepository.hasSave();
  },
};
