import React, { useMemo, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, radii, spacing, iconSize } from "@/presentation/theme/theme";
import { ActionButton } from "@/presentation/components/ActionButton";
import { HapticManager } from "@/presentation/haptics/HapticManager";
import { DialogueSystem } from "@/systems/DialogueSystem";
import { SHOP_CATALOG } from "@/data/shopCatalog";
import { getShopkeeper } from "@/data/shopkeepers";
import { portraitForNpc } from "@/presentation/npc/shopkeeperPortraits";
import type { ShopItem, ShopItemCategory } from "@/domain/types";

const CATEGORY_ICON: Record<ShopItemCategory, keyof typeof Ionicons.glyphMap> = {
  "Weapon (Melee)": "flash",
  Consumable: "flask",
  "Armor (Torso)": "shirt",
  Utility: "cube",
};

function GoldPill({ amount, color, muted }: { amount: number; color: string; muted: string }) {
  return (
    <View style={styles.goldPill}>
      <Text style={[styles.goldValue, { color }]}>{amount}</Text>
      <Ionicons name="ellipse" size={12} color={color} />
      <Text style={[styles.goldLabel, { color: muted }]}>Your Gold</Text>
    </View>
  );
}

export default function ShopScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { npcId } = useLocalSearchParams<{ npcId?: string }>();
  const world = useWorldStore((s) => s.world);
  const buyItem = useWorldStore((s) => s.buyItem);

  const [selected, setSelected] = useState<ShopItem | null>(null);
  const [justBought, setJustBought] = useState<string | null>(null);

  const npc = world && npcId ? world.npcs[npcId] : undefined;
  const settlement = npc && world ? world.settlements[npc.settlementId] : undefined;
  const shopkeeper = getShopkeeper(npc?.shopkeeperId);

  const greeting = useMemo(() => {
    if (shopkeeper) return shopkeeper.greeting;
    if (!npc || !world) return "Welcome, traveler. Take a look — I've got a few things worth your coin.";
    const line = DialogueSystem.getGreeting(npc, world);
    return line === "..." || line === "Hello, traveler."
      ? "Welcome, traveler. Take a look — I've got a few things worth your coin."
      : line;
  }, [shopkeeper, npc, world]);

  if (!world) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.inkMuted }}>The shop is closed.</Text>
      </SafeAreaView>
    );
  }

  const gold = world.player.gold;
  const shopName = settlement ? `${settlement.name} Market` : "The Merchant's Table";
  const shopSub = settlement ? `${settlement.type[0]!.toUpperCase()}${settlement.type.slice(1)} of ${settlement.name}` : "Wandering trader";
  const keeperRole = shopkeeper
    ? `${shopkeeper.name}, ${shopkeeper.shopTitle}`
    : npc
    ? `${npc.name}, ${npc.role[0]!.toUpperCase()}${npc.role.slice(1)}`
    : "Maren, Village Merchant";

  const doBuy = async (item: ShopItem) => {
    void HapticManager.medium();
    const ok = await buyItem(item.id);
    if (ok) {
      setJustBought(item.name);
      setSelected(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Leave the shop"
          testID="shop-back-button"
          style={[styles.iconButton, { borderColor: theme.goldBorder }]}
        >
          <Ionicons name="arrow-back" size={iconSize.standard} color={theme.gold} />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={[styles.shopName, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.title) }]} numberOfLines={1}>
            {shopName}
          </Text>
          <Text style={[styles.shopSub, { color: theme.inkMuted }]} numberOfLines={1}>{shopSub}</Text>
        </View>
        <GoldPill amount={gold} color={theme.gold} muted={theme.inkMuted} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Shopkeeper — same portrait-dominant framing as the dialogue screen */}
        <View
          style={[styles.keeperHero, { borderColor: theme.goldBorder }]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={keeperRole}
          testID="shop-keeper-portrait"
        >
          <Image
            source={npc ? portraitForNpc(npc) : portraitForNpc({ role: "merchant" })}
            style={styles.heroPortrait}
            resizeMode="cover"
          />
          <View style={styles.heroScrim} pointerEvents="none" />
          <View style={styles.heroPlate}>
            <Text style={[styles.keeperName, { color: theme.gold, fontFamily: fontFamily.displayBold }]} numberOfLines={2}>
              {keeperRole}
            </Text>
          </View>
        </View>
        <View style={[styles.bubble, { backgroundColor: theme.surfaceRaised, borderColor: theme.goldBorder }]}>
          <Text style={[styles.bubbleText, { color: theme.ink }]}>{greeting}</Text>
        </View>

        {justBought && (
          <Text style={[styles.boughtNote, { color: theme.forest }]} testID="shop-bought-note">
            You bought {justBought}. It's in your pack.
          </Text>
        )}

        {/* Items */}
        {SHOP_CATALOG.map((item) => {
          const affordable = gold >= item.price;
          return (
            <Pressable
              key={item.id}
              onPress={() => {
                void HapticManager.light();
                setSelected(item);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.price} gold`}
              testID={`shop-item-${item.id}`}
              style={({ pressed }) => [
                styles.itemRow,
                { backgroundColor: theme.panel, borderColor: theme.goldBorder, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <View style={[styles.itemIconWell, { borderColor: theme.goldBorder, backgroundColor: theme.surface }]}>
                <Ionicons name={CATEGORY_ICON[item.category]} size={iconSize.emphasis} color={theme.gold} />
              </View>
              <View style={styles.itemText}>
                <Text style={[styles.itemName, { color: theme.ink, fontFamily: fontFamily.displayBold }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.itemDesc, { color: theme.inkMuted }]} numberOfLines={2}>{item.description}</Text>
                <View style={styles.catRow}>
                  <Ionicons name={CATEGORY_ICON[item.category]} size={iconSize.inline} color={theme.bronze} />
                  <Text style={[styles.catText, { color: theme.bronze }]}>{item.category}</Text>
                </View>
              </View>
              <View style={styles.priceCol}>
                <Text style={[styles.priceText, { color: affordable ? theme.gold : theme.inkMuted }]}>{item.price}</Text>
                <Ionicons name="ellipse" size={13} color={affordable ? theme.gold : theme.inkMuted} />
              </View>
            </Pressable>
          );
        })}

        <Text style={[styles.footer, { color: theme.inkMuted }]}>The shopkeeper's stock is fixed for now.</Text>
      </ScrollView>

      {/* Item detail / buy overlay */}
      {selected && (
        <View style={styles.overlay} testID="shop-detail-overlay">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelected(null)} accessibilityLabel="Dismiss" />
          <View style={[styles.sheet, { backgroundColor: theme.surfaceRaised, borderColor: theme.goldBorder }]}>
            <Text style={[styles.sheetTitle, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.title) }]}>
              {selected.name}
            </Text>
            <View style={[styles.sheetIconWell, { borderColor: theme.goldBorder, backgroundColor: theme.panel }]}>
              <Ionicons name={CATEGORY_ICON[selected.category]} size={64} color={theme.gold} />
            </View>
            <Text style={[styles.sheetDesc, { color: theme.ink }]}>{selected.description}</Text>

            <View style={[styles.sheetRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.sheetLabel, { color: theme.inkMuted }]}>Price</Text>
              <Text style={[styles.sheetValue, { color: theme.gold }]}>{selected.price} gold</Text>
            </View>
            <View style={[styles.sheetRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.sheetLabel, { color: theme.inkMuted }]}>Your Gold</Text>
              <Text style={[styles.sheetValue, { color: theme.ink }]}>{gold} gold</Text>
            </View>

            {gold < selected.price && (
              <Text style={[styles.cantAfford, { color: theme.wax }]} testID="shop-cant-afford">You don't have enough gold.</Text>
            )}

            <View style={styles.sheetActions}>
              <ActionButton
                label={`Buy for ${selected.price}`}
                onPress={() => void doBuy(selected)}
                disabled={gold < selected.price}
                accessibilityHint={`Spend ${selected.price} gold`}
              />
              <View style={{ height: spacing.sm }} />
              <Pressable
                onPress={() => setSelected(null)}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                testID="shop-cancel-button"
                style={[styles.cancelBtn, { borderColor: theme.goldBorder }]}
              >
                <Text style={[styles.cancelText, { color: theme.ink }]}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  iconButton: { width: 40, height: 40, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth * 2, alignItems: "center", justifyContent: "center" },
  titleBlock: { flex: 1 },
  shopName: { fontWeight: "800" },
  shopSub: { fontSize: 12, marginTop: 1 },
  goldPill: { alignItems: "flex-end" },
  goldValue: { fontSize: 18, fontWeight: "800" },
  goldLabel: { fontSize: 10, textTransform: "uppercase", letterSpacing: 1 },
  scroll: { paddingBottom: 24 },
  keeperHero: {
    width: "100%",
    height: 260,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
    justifyContent: "flex-end",
    marginBottom: spacing.md,
  },
  heroPortrait: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0A080699" },
  heroPlate: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  keeperName: { fontSize: 18, fontWeight: "700" },
  bubble: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md },
  bubbleText: { fontStyle: "italic", lineHeight: 24, fontSize: 15 },
  boughtNote: { fontSize: 13, fontWeight: "600", marginBottom: spacing.sm, textAlign: "center" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm + 2 },
  itemIconWell: { width: 52, height: 52, borderRadius: radii.sm, borderWidth: StyleSheet.hairlineWidth * 2, alignItems: "center", justifyContent: "center" },
  itemText: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: "700" },
  itemDesc: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  catRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  catText: { fontSize: 11, fontWeight: "600" },
  priceCol: { flexDirection: "row", alignItems: "center", gap: 3 },
  priceText: { fontSize: 17, fontWeight: "800" },
  footer: { fontStyle: "italic", fontSize: 12, textAlign: "center", marginTop: spacing.sm },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000000B3", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, borderWidth: StyleSheet.hairlineWidth * 2, padding: spacing.xl, paddingBottom: spacing.xxl },
  sheetTitle: { fontWeight: "800", textAlign: "center", marginBottom: spacing.md },
  sheetIconWell: { alignSelf: "center", width: 120, height: 120, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth * 2, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  sheetDesc: { fontSize: 15, lineHeight: 22, textAlign: "center", marginBottom: spacing.md },
  sheetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.sm + 2 },
  sheetLabel: { fontSize: 13, textTransform: "uppercase", letterSpacing: 1 },
  sheetValue: { fontSize: 16, fontWeight: "700" },
  cantAfford: { textAlign: "center", marginTop: spacing.sm, fontWeight: "600" },
  sheetActions: { marginTop: spacing.lg },
  cancelBtn: { minHeight: 48, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth * 2, alignItems: "center", justifyContent: "center" },
  cancelText: { fontWeight: "600", fontSize: 16 },
});
