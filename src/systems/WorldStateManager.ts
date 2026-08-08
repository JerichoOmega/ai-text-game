import type { EntityId, Faction, Kingdom, NPC, Quest, Settlement, WorldState } from "@/domain/types";

/**
 * Owns the live WorldState object and exposes controlled read/write access.
 * Every other system takes a WorldStateManager (or the raw WorldState it
 * wraps) rather than reaching into persistence directly — this is the
 * "clearly defined interface" boundary between systems and storage.
 *
 * Mutations here are synchronous and in-memory only. Persisting to SQLite is
 * the SaveManager's job, called explicitly (e.g. after each EventEngine
 * dispatch, or on a save-point) rather than on every field write, so a long
 * chain of consequence events doesn't thrash disk I/O.
 */
export class WorldStateManager {
  private state: WorldState;

  constructor(initialState: WorldState) {
    this.state = initialState;
  }

  getWorld(): WorldState {
    return this.state;
  }

  replaceWorld(next: WorldState): void {
    this.state = next;
  }

  /**
   * Deep-clones the current state into a brand-new, fully independent
   * WorldStateManager — used to run simulation against a disposable
   * candidate instead of the authoritative one (see WorldTransaction.ts
   * and DESIGN_SYSTEM.md's "World-state transaction boundary" section).
   *
   * JSON round-trip rather than `structuredClone`: WorldState is
   * guaranteed plain, JSON-safe data (every domain type is a plain
   * interface — no class instances, no functions, no Dates as objects),
   * and `structuredClone`'s availability across React Native's Hermes
   * engine versions isn't something this project can verify without a
   * device. JSON.parse/stringify has no such uncertainty. This also
   * relies on the domain convention of using `null` rather than
   * `undefined` for "no value" everywhere (confirmed across every
   * optional field in src/domain/types) — JSON silently drops
   * `undefined` object properties, which would make this lossy if that
   * convention weren't already consistent.
   */
  clone(): WorldStateManager {
    return new WorldStateManager(JSON.parse(JSON.stringify(this.state)) as WorldState);
  }

  // --- Reads -------------------------------------------------------------

  getNpc(id: EntityId): NPC | undefined {
    return this.state.npcs[id];
  }

  getSettlement(id: EntityId): Settlement | undefined {
    return this.state.settlements[id];
  }

  getKingdom(id: EntityId): Kingdom | undefined {
    return this.state.kingdoms[id];
  }

  getFaction(id: EntityId): Faction | undefined {
    return this.state.factions[id];
  }

  getQuest(id: EntityId): Quest | undefined {
    return this.state.quests[id];
  }

  getNpcsInSettlement(settlementId: EntityId): NPC[] {
    return Object.values(this.state.npcs).filter((npc) => npc.settlementId === settlementId);
  }

  getSettlementsInKingdom(kingdomId: EntityId): Settlement[] {
    return Object.values(this.state.settlements).filter((s) => s.kingdomId === kingdomId);
  }

  // --- Writes --------------------------------------------------------------
  // Each setter replaces the record immutably so React/Zustand subscribers
  // downstream can rely on referential-equality checks for re-renders.

  setNpc(npc: NPC): void {
    this.state = { ...this.state, npcs: { ...this.state.npcs, [npc.id]: npc } };
  }

  setSettlement(settlement: Settlement): void {
    this.state = {
      ...this.state,
      settlements: { ...this.state.settlements, [settlement.id]: settlement },
    };
  }

  setKingdom(kingdom: Kingdom): void {
    this.state = { ...this.state, kingdoms: { ...this.state.kingdoms, [kingdom.id]: kingdom } };
  }

  setFaction(faction: Faction): void {
    this.state = { ...this.state, factions: { ...this.state.factions, [faction.id]: faction } };
  }

  setQuest(quest: Quest): void {
    this.state = { ...this.state, quests: { ...this.state.quests, [quest.id]: quest } };
  }
}
