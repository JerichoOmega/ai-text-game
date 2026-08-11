import type { ShopItem } from "@/domain/types";

/**
 * Deterministic merchant stock. Chronicle has no procedural economy — the
 * shop always offers this fixed catalog, matching the "shop inventory
 * remains deterministic" rule. Prices are in the existing gold currency.
 * Add items here (data, not code) to expand what merchants sell.
 */
export const SHOP_CATALOG: ShopItem[] = [
  { id: "item_iron_sword", name: "Iron Sword", description: "A dependable iron blade. Not fancy, but it gets the job done.", price: 75, category: "Weapon (Melee)" },
  { id: "item_healing_potion", name: "Healing Potion", description: "Restores a moderate amount of health.", price: 30, category: "Consumable" },
  { id: "item_travelers_cloak", name: "Traveler's Cloak", description: "Light and warm. Good for long roads.", price: 50, category: "Armor (Torso)" },
  { id: "item_rope", name: "Rope (50 ft.)", description: "Strong and sturdy. Useful in many ways.", price: 10, category: "Utility" },
  { id: "item_torch", name: "Torch", description: "Lights your way in the darkness.", price: 5, category: "Utility" },
];

export function findShopItem(id: string): ShopItem | undefined {
  return SHOP_CATALOG.find((i) => i.id === id);
}
