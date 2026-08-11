import type { EntityId, NPC, PlayerCharacter, Settlement, WorldState } from "../src/domain/types";

/**
 * Was independently copy-pasted in npcMemory.test.ts and
 * questGenerator.test.ts. Both copies had already drifted out of sync with
 * PlayerCharacter (missing xp/xpToNextLevel/stamina/maxStamina/stats,
 * added in a later domain-model change) — a real, silent test-suite
 * breakage found during the transaction-safety audit, not a hypothetical
 * one. One helper now; a future domain-type change only needs updating
 * here.
 */

export function makeTestPlayer(overrides: Partial<PlayerCharacter> = {}): PlayerCharacter {
  return {
    id: "player_1",
    name: "Tester",
    classId: "wanderer",
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    hp: 10,
    maxHp: 10,
    stamina: 10,
    maxStamina: 10,
    stats: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
    gold: 0,
    currentSettlementId: "settlement_1",
    inventoryItemIds: [],
    reputations: [],
    ...overrides,
  };
}

export function makeTestNpc(id: EntityId, overrides: Partial<NPC> = {}): NPC {
  return {
    id,
    name: "Test NPC",
    role: "commoner",
    settlementId: "settlement_1",
    factionId: null,
    alive: true,
    diedOn: null,
    familyTies: [],
    memories: [],
    playerRelationship: 0,
    debtToPlayer: 0,
    schedule: [],
    ...overrides,
  };
}

export function makeTestSettlement(id: EntityId, overrides: Partial<Settlement> = {}): Settlement {
  return {
    id,
    name: "Test Settlement",
    kingdomId: "kingdom_1",
    type: "village",
    population: 200,
    prosperity: 50,
    roadSafety: 50,
    destroyed: false,
    destroyedOn: null,
    controllingFactionId: null,
    ...overrides,
  };
}

export function makeTestWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    saveVersion: 1,
    seed: 12345,
    currentDate: { year: 1, season: "spring", day: 1 },
    weather: { current: "clear", daysInCurrentState: 0 },
    player: makeTestPlayer(),
    kingdoms: {},
    settlements: {},
    factions: {},
    npcs: {},
    quests: {},
    events: [],
    history: [],
    ...overrides,
  };
}
