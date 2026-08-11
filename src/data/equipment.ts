import type { CombatStats } from "@/domain/types";

/**
 * Simple equipment (Part 21): items apply flat modifiers to the five combat
 * stats. No rarity, affixes, or durability yet. Equipped items are stored
 * by id on the player; effective combat stats = base + sum of these.
 */
export type EquipmentSlot = "weapon" | "armor" | "trinket";

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipmentSlot;
  description: string;
  modifiers: Partial<CombatStats>;
}

export const EQUIPMENT: EquipmentItem[] = [
  { id: "worn_sword", name: "Worn Sword", slot: "weapon", description: "Old but serviceable steel.", modifiers: { attack: 2 } },
  { id: "rusty_dagger", name: "Rusty Dagger", slot: "weapon", description: "Light and fast, if a little pitted.", modifiers: { attack: 1, speed: 1 } },
  { id: "iron_sword", name: "Iron Sword", slot: "weapon", description: "A dependable soldier's blade.", modifiers: { attack: 4 } },
  { id: "apprentice_staff", name: "Apprentice Staff", slot: "weapon", description: "Focuses a novice's magic.", modifiers: { magicPower: 2 } },
  { id: "oak_staff", name: "Oak Staff", slot: "weapon", description: "A seasoned caster's focus.", modifiers: { magicPower: 4 } },
  { id: "leather_armor", name: "Leather Armor", slot: "armor", description: "Boiled leather, light protection.", modifiers: { defense: 2 } },
  { id: "iron_armor", name: "Iron Armor", slot: "armor", description: "Heavy plates that turn blades.", modifiers: { defense: 4 } },
  { id: "warding_amulet", name: "Warding Amulet", slot: "trinket", description: "Hums faintly against hostile magic.", modifiers: { magicDefense: 3 } },
  { id: "swift_boots", name: "Swift Boots", slot: "trinket", description: "Light on the feet.", modifiers: { speed: 2 } },
  // Shop-catalog equippables (ids match src/data/shopCatalog.ts so a purchased
  // item is itself a valid equipment id — one id space, one stat path).
  { id: "item_iron_sword", name: "Iron Sword", slot: "weapon", description: "A dependable iron blade.", modifiers: { attack: 3 } },
  { id: "item_travelers_cloak", name: "Traveler's Cloak", slot: "armor", description: "Light and warm; surprisingly protective.", modifiers: { defense: 2, speed: 1 } },
];

const BY_ID: Record<string, EquipmentItem> = Object.fromEntries(EQUIPMENT.map((e) => [e.id, e]));

export function getEquipment(id: string | undefined): EquipmentItem | undefined {
  return id ? BY_ID[id] : undefined;
}

/** Sums the stat modifiers of a set of equipped item ids. */
export function equipmentBonus(ids: string[]): CombatStats {
  const total: CombatStats = { attack: 0, defense: 0, magicPower: 0, magicDefense: 0, speed: 0 };
  for (const id of ids) {
    const item = BY_ID[id];
    if (!item) continue;
    total.attack += item.modifiers.attack ?? 0;
    total.defense += item.modifiers.defense ?? 0;
    total.magicPower += item.modifiers.magicPower ?? 0;
    total.magicDefense += item.modifiers.magicDefense ?? 0;
    total.speed += item.modifiers.speed ?? 0;
  }
  return total;
}
