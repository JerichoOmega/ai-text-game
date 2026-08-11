import type {
  Faction,
  GameDate,
  Kingdom,
  NPC,
  NpcRole,
  PlayerCharacter,
  PlayerOrigin,
  Settlement,
  WorldState,
} from "@/domain/types";
import { createId } from "@/utils/id";
import { assignShopkeepers } from "@/data/shopkeepers";
import { assignRecurringNpcs } from "@/data/npcRegistry";
import { CharacterSystem } from "@/systems/CharacterSystem";
import { DEFAULT_ORIGIN } from "@/data/origins";

const START_DATE: GameDate = { year: 212, season: "spring", day: 1 };

const FIRST_NAMES = [
  "Alden", "Briar", "Corwin", "Dara", "Elric", "Fenna", "Garrick", "Hilde",
  "Ivo", "Jora", "Kestrel", "Lira", "Mora", "Nash", "Oswin", "Petra",
  "Quill", "Rowan", "Sable", "Torin", "Una", "Varin", "Wren", "Yara",
];

const ROLE_CYCLE: NpcRole[] = ["noble", "merchant", "guard", "farmer", "innkeeper", "priest", "commoner"];

function makeNpc(name: string, role: NpcRole, settlementId: string, factionId: string | null): NPC {
  return {
    id: createId("npc"),
    name,
    role,
    settlementId,
    factionId,
    alive: true,
    diedOn: null,
    familyTies: [],
    memories: [],
    playerRelationship: 0,
    debtToPlayer: 0,
    schedule: [
      { startHour: 8, location: "workplace" },
      { startHour: 18, location: role === "guard" ? "tavern" : "home" },
    ],
  };
}

export function buildSeedWorld(playerName: string, origin: PlayerOrigin = DEFAULT_ORIGIN, seed: number = Math.floor(Math.random() * 0x7fffffff)): WorldState {
  const kingdomId = createId("kingdom");
  const factionMerchantId = createId("faction");
  const factionWatchId = createId("faction");

  const eastbridgeId = createId("settlement");
  const millbrookId = createId("settlement");
  const stonefordId = createId("settlement");

  const kingdom: Kingdom = {
    id: kingdomId,
    name: "Kingdom of Eastbridge",
    rulerId: null, // assigned to the ruler NPC below once created
    treasury: 500,
    stability: 70,
    atWarWithKingdomIds: [],
    foundedOn: { year: 1, season: "spring", day: 1 },
  };

  const settlements: Settlement[] = [
    {
      id: eastbridgeId,
      name: "Eastbridge",
      kingdomId,
      type: "city",
      population: 1200,
      prosperity: 65,
      roadSafety: 70,
      destroyed: false,
      destroyedOn: null,
      controllingFactionId: factionWatchId,
    },
    {
      id: millbrookId,
      name: "Millbrook",
      kingdomId,
      type: "village",
      population: 240,
      prosperity: 35,
      roadSafety: 30,
      destroyed: false,
      destroyedOn: null,
      controllingFactionId: null,
    },
    {
      id: stonefordId,
      name: "Stoneford",
      kingdomId,
      type: "town",
      population: 560,
      prosperity: 55,
      roadSafety: 55,
      destroyed: false,
      destroyedOn: null,
      controllingFactionId: factionMerchantId,
    },
  ];

  const factions: Faction[] = [
    {
      id: factionMerchantId,
      name: "The Stoneford Trading Company",
      power: 55,
      homeSettlementId: stonefordId,
      goals: [{ type: "accumulate_wealth", targetId: null, priority: 70 }],
      relationships: { [factionWatchId]: 20 },
      playerStanding: 0,
    },
    {
      id: factionWatchId,
      name: "The Eastbridge Watch",
      power: 60,
      homeSettlementId: eastbridgeId,
      goals: [{ type: "protect_settlement", targetId: eastbridgeId, priority: 80 }],
      relationships: { [factionMerchantId]: 20 },
      playerStanding: 0,
    },
  ];

  const npcs: NPC[] = [];
  const settlementCycle = [eastbridgeId, eastbridgeId, millbrookId, stonefordId]; // Eastbridge is bigger, gets more NPCs
  const factionForSettlement: Record<string, string | null> = {
    [eastbridgeId]: factionWatchId,
    [stonefordId]: factionMerchantId,
    [millbrookId]: null,
  };

  FIRST_NAMES.forEach((name, i) => {
    const settlementId = settlementCycle[i % settlementCycle.length]!;
    const role = ROLE_CYCLE[i % ROLE_CYCLE.length]!;
    npcs.push(makeNpc(name, role, settlementId, factionForSettlement[settlementId] ?? null));
  });

  // Designate a ruler among the nobles in Eastbridge (before shopkeeper
  // assignment, which only touches merchant/innkeeper NPCs).
  const ruler = npcs.find((n) => n.settlementId === eastbridgeId && n.role === "noble");
  if (ruler) kingdom.rulerId = ruler.id;

  const settlementsById = Object.fromEntries(settlements.map((s) => [s.id, s]));
  const npcsById = Object.fromEntries(npcs.map((n) => [n.id, n]));
  // Deterministically place this run's recurring shopkeepers onto the
  // merchant/innkeeper slots, keyed off the world seed.
  const npcsWithShopkeepers = assignShopkeepers(npcsById, settlementsById, seed);
  // Then place this run's subset of canonical KEY NPCs onto ordinary NPC
  // slots (never merchant/innkeeper/shopkeeper). Separate pool from shopkeepers.
  const npcsFinal = assignRecurringNpcs(npcsWithShopkeepers, seed);

  const player: PlayerCharacter = CharacterSystem.createStartingPlayer({
    id: createId("player"),
    name: playerName,
    currentSettlementId: eastbridgeId,
    origin,
  });

  return {
    saveVersion: 1,
    seed,
    currentDate: START_DATE,
    weather: { current: "clear", daysInCurrentState: 0 },
    player,
    kingdoms: { [kingdom.id]: kingdom },
    settlements: Object.fromEntries(settlements.map((s) => [s.id, s])),
    factions: Object.fromEntries(factions.map((f) => [f.id, f])),
    npcs: npcsFinal,
    quests: {},
    events: [],
    history: [
      {
        id: createId("hist"),
        sourceEventId: "seed",
        year: 210,
        category: "military",
        headline: "The Goblin King was defeated at the Ashwood border.",
        relatedEntityIds: [],
      },
      {
        id: createId("hist"),
        sourceEventId: "seed",
        year: 211,
        category: "political",
        headline: "Eastbridge reopened trade with the northern holds.",
        relatedEntityIds: [eastbridgeId],
      },
    ],
  };
}
