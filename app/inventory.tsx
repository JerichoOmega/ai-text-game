import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, radii, spacing, iconSize } from "@/presentation/theme/theme";
import { SectionHeader } from "@/presentation/components/SectionHeader";
import { Panel } from "@/presentation/components/Panel";
import { HapticManager } from "@/presentation/haptics/HapticManager";
import { CharacterSystem } from "@/systems/CharacterSystem";
import { equippedItemForSlot } from "@/systems/EquipmentSystem";
import { getEquipment, type EquipmentSlot } from "@/data/equipment";
import { findShopItem } from "@/data/shopCatalog";
import type { CombatStats } from "@/domain/types";

/**
 * Text-first Inventory & Equipment (MVP). Shows owned items, what's
 * equipped, and a live effective-stat readout, with Equip/Unequip actions.
 * All stat effects resolve through CharacterSystem.effectiveStats — this
 * screen only presents them.
 */
const STAT_LABELS: Array<{ key: keyof CombatStats; label: string }> = [
  { key: "attack", label: "Attack" },
  { key: "defense", label: "Defense" },
  { key: "magicPower", label: "Magic Power" },
  { key: "magicDefense", label: "Magic Defense" },
  { key: "speed", label: "Speed" },
];

function modifierText(id: string): string {
  const item = getEquipment(id);
  if (!item) return "";
  return Object.entries(item.modifiers).map(([k, v]) => `+${v} ${k}`).join(", ");
}

function displayName(id: string): string {
  return getEquipment(id)?.name ?? findShopItem(id)?.name ?? id;
}

export default function InventoryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const world = useWorldStore((s) => s.world);
  const equipItem = useWorldStore((s) => s.equipItem);
  const unequipItem = useWorldStore((s) => s.unequipItem);

  if (!world) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.inkMuted }}>Loading inventory...</Text>
      </SafeAreaView>
    );
  }

  const { player } = world;
  const effective = CharacterSystem.effectiveStats(player);
  const weaponId = equippedItemForSlot(player, "weapon");
  const armorId = equippedItemForSlot(player, "armor");

  const doEquip = (id: string) => { void HapticManager.medium(); void equipItem(id); };
  const doUnequip = (id: string) => { void HapticManager.light(); void unequipItem(id); };

  const slotRow = (slot: EquipmentSlot, label: string, equippedId: string | undefined) => (
    <View style={[styles.slotRow, { borderColor: theme.border }]} testID={`equip-slot-${slot}`}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.slotLabel, { color: theme.inkMuted }]}>{label}</Text>
        {equippedId ? (
          <>
            <Text style={{ color: theme.gold, fontWeight: "700" }}>{displayName(equippedId)}</Text>
            <Text style={{ color: theme.forest, fontSize: 13 }}>{modifierText(equippedId)}</Text>
          </>
        ) : (
          <Text style={{ color: theme.inkMuted, fontStyle: "italic" }}>Empty</Text>
        )}
      </View>
      {equippedId && (
        <Pressable
          onPress={() => doUnequip(equippedId)}
          accessibilityRole="button"
          accessibilityLabel={`Unequip ${displayName(equippedId)}`}
          testID={`unequip-${equippedId}`}
          style={[styles.smallBtn, { borderColor: theme.goldBorder }]}
        >
          <Text style={{ color: theme.ink, fontWeight: "600" }}>Unequip</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} testID="inventory-screen">
        <SectionHeader label="Effective Stats" />
        <Panel>
          {STAT_LABELS.map((s, i) => (
            <View key={s.key} style={[styles.statRow, i < STAT_LABELS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
              <Text style={{ color: theme.inkMuted }}>{s.label}</Text>
              <Text style={{ color: theme.ink, fontWeight: "700" }} testID={`eff-stat-${s.key}`}>
                {effective[s.key]}
                {effective[s.key] !== player.stats[s.key] && (
                  <Text style={{ color: theme.forest }}>{`  (base ${player.stats[s.key]})`}</Text>
                )}
              </Text>
            </View>
          ))}
        </Panel>

        <View style={styles.gap} />
        <SectionHeader label="Equipment" />
        <Panel>
          {slotRow("weapon", "Weapon", weaponId)}
          {slotRow("armor", "Armor", armorId)}
        </Panel>

        <View style={styles.gap} />
        <SectionHeader label="Inventory" />
        <Panel>
          {player.inventoryItemIds.length === 0 && (
            <Text style={{ color: theme.inkMuted, fontStyle: "italic" }} testID="inventory-empty">Your pack is empty.</Text>
          )}
          {player.inventoryItemIds.map((id, i) => {
            const equip = getEquipment(id);
            const shop = findShopItem(id);
            return (
              <View
                key={`${id}-${i}`}
                style={[styles.itemRow, i < player.inventoryItemIds.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}
                testID={`inventory-item-${id}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.ink, fontWeight: "700" }}>{displayName(id)}</Text>
                  <Text style={{ color: equip ? theme.forest : theme.inkMuted, fontSize: 13 }}>
                    {equip ? `${equip.slot} · ${modifierText(id)}` : shop?.category ?? "Item"}
                  </Text>
                </View>
                {equip && (
                  <Pressable
                    onPress={() => doEquip(id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Equip ${displayName(id)}`}
                    testID={`equip-${id}`}
                    style={[styles.smallBtn, { borderColor: theme.goldBorder, backgroundColor: theme.gold }]}
                  >
                    <Text style={{ color: theme.background, fontWeight: "700" }}>Equip</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </Panel>

        <Text style={[styles.footer, { color: theme.inkMuted }]}>
          Equipping a weapon or armor swaps out whatever you had in that slot.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingVertical: spacing.md, paddingBottom: spacing.xxl },
  gap: { height: spacing.lg },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8 },
  slotRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  slotLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: "700", marginBottom: 2 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  smallBtn: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth * 2, alignItems: "center", justifyContent: "center" },
  footer: { fontStyle: "italic", fontSize: 12, textAlign: "center", marginTop: spacing.lg },
});
