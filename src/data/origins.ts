import type { Background, Motivation, PlayerOrigin, Race } from "@/domain/types";

/**
 * Character-creation content (Part 7). Small, curated lists — identity, not
 * classes. Race + background apply a modest one-time stat bias; the
 * background also grants the Level-1 Character Ability and any starting
 * equipment. Everything is deterministic (no RNG at creation).
 */

export const RACES: Race[] = [
  { id: "human", name: "Human", description: "Adaptable and driven; no glaring weaknesses.", statBias: { maxHp: 4, attack: 1 } },
  { id: "elf", name: "Elf", description: "Graceful and attuned to magic.", statBias: { magicPower: 3, speed: 1 } },
  { id: "dwarf", name: "Dwarf", description: "Hardy and stubborn, built to endure.", statBias: { defense: 3, maxHp: 6 } },
  { id: "halfling", name: "Halfling", description: "Quick, lucky, and hard to pin down.", statBias: { speed: 3, magicDefense: 1 } },
  { id: "orc", name: "Orc", description: "Powerful and fierce in a brawl.", statBias: { attack: 3, maxHp: 4 } },
];

export const BACKGROUNDS: Background[] = [
  { id: "soldier", name: "Soldier", description: "You served under a banner and know the weight of a blade.", statBias: { attack: 2, maxHp: 4 }, startingCharacterAbilityId: "strong", startingEquipmentIds: ["worn_sword"] },
  { id: "scholar", name: "Scholar", description: "You traded a sword for books, and found power in them.", statBias: { magicPower: 3, magicDefense: 1 }, startingCharacterAbilityId: "scholar", startingEquipmentIds: ["apprentice_staff"] },
  { id: "wanderer", name: "Wanderer", description: "The road raised you; you read land and people alike.", statBias: { speed: 2 }, startingCharacterAbilityId: "survivalist", startingEquipmentIds: [] },
  { id: "outlaw", name: "Outlaw", description: "You lived by wit and quick hands where laws were thin.", statBias: { attack: 1, speed: 2 }, startingCharacterAbilityId: "streetwise", startingEquipmentIds: ["rusty_dagger"] },
  { id: "acolyte", name: "Acolyte", description: "You kept a shrine and learned to steady frightened hearts.", statBias: { magicDefense: 3, maxHp: 2 }, startingCharacterAbilityId: "perceptive", startingEquipmentIds: [] },
];

export const MOTIVATIONS: Motivation[] = [
  { id: "revenge", name: "Revenge", description: "Someone took everything from you. You mean to make it right." },
  { id: "redemption", name: "Redemption", description: "You carry a debt of the soul, and mean to pay it." },
  { id: "fortune", name: "Fortune", description: "Coin, glory, a name that outlives you — you'll earn it." },
  { id: "duty", name: "Duty", description: "An oath binds you. You go where it leads." },
];

const RACE_BY_ID: Record<string, Race> = Object.fromEntries(RACES.map((r) => [r.id, r]));
const BG_BY_ID: Record<string, Background> = Object.fromEntries(BACKGROUNDS.map((b) => [b.id, b]));
const MOT_BY_ID: Record<string, Motivation> = Object.fromEntries(MOTIVATIONS.map((m) => [m.id, m]));

export function getRace(id: string | undefined): Race | undefined {
  return id ? RACE_BY_ID[id] : undefined;
}
export function getBackground(id: string | undefined): Background | undefined {
  return id ? BG_BY_ID[id] : undefined;
}
export function getMotivation(id: string | undefined): Motivation | undefined {
  return id ? MOT_BY_ID[id] : undefined;
}

export const DEFAULT_ORIGIN: PlayerOrigin = { raceId: "human", backgroundId: "wanderer", motivation: "duty" };
