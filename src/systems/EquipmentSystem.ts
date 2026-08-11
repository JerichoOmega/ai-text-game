import type { PlayerCharacter } from "@/domain/types";
import { getEquipment, type EquipmentSlot } from "@/data/equipment";

/**
 * Inventory <-> equipment moves. Pure, deterministic, and the ONLY place
 * that shuffles ids between player.inventoryItemIds and
 * player.equipmentItemIds. Stat effects still flow entirely through
 * CharacterSystem.effectiveStats + equipmentBonus (this module never
 * touches stats), so there is a single authoritative equipment/stat path.
 *
 * Slot rule: one item per slot. Equipping into an occupied slot moves the
 * displaced item back to inventory. Invalid operations (item not owned,
 * not equipment, or not currently equipped) return the player unchanged.
 */
export function equippedItemForSlot(player: PlayerCharacter, slot: EquipmentSlot): string | undefined {
  return player.equipmentItemIds.find((id) => getEquipment(id)?.slot === slot);
}

export function isEquippable(itemId: string): boolean {
  return !!getEquipment(itemId);
}

export function equipItem(player: PlayerCharacter, itemId: string): PlayerCharacter {
  const item = getEquipment(itemId);
  if (!item) return player; // not equipment (e.g. a consumable) — reject safely
  const idx = player.inventoryItemIds.indexOf(itemId);
  if (idx < 0) return player; // not owned — reject safely

  // Displace anything already in this slot back into inventory.
  const displaced = player.equipmentItemIds.filter((id) => getEquipment(id)?.slot === item.slot);
  const equipment = player.equipmentItemIds.filter((id) => getEquipment(id)?.slot !== item.slot);

  const inventory = [...player.inventoryItemIds.slice(0, idx), ...player.inventoryItemIds.slice(idx + 1), ...displaced];

  return { ...player, inventoryItemIds: inventory, equipmentItemIds: [...equipment, itemId] };
}

export function unequipItem(player: PlayerCharacter, itemId: string): PlayerCharacter {
  const idx = player.equipmentItemIds.indexOf(itemId);
  if (idx < 0) return player; // not equipped — reject safely
  const equipment = [...player.equipmentItemIds.slice(0, idx), ...player.equipmentItemIds.slice(idx + 1)];
  return { ...player, equipmentItemIds: equipment, inventoryItemIds: [...player.inventoryItemIds, itemId] };
}

export const EquipmentSystem = { equippedItemForSlot, isEquippable, equipItem, unequipItem };
