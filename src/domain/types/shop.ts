import type { EntityId } from "./kingdom";

/**
 * Minimal presentational item model for the merchant screen. Chronicle is a
 * text-driven RPG with no full item/inventory subsystem — the player just
 * holds a list of item ids (`PlayerCharacter.inventoryItemIds`). A ShopItem
 * is the small amount of display data a deterministic shop catalog needs to
 * render a buyable row: it is NOT a general item/equipment system.
 */
export type ShopItemCategory = "Weapon (Melee)" | "Consumable" | "Armor (Torso)" | "Utility";

export interface ShopItem {
  id: EntityId;
  name: string;
  /** One short line shown under the name. */
  description: string;
  /** Cost in gold — the existing PlayerCharacter.gold currency. */
  price: number;
  category: ShopItemCategory;
}
