import React from "react";
import { View, Text, Pressable, ImageBackground, ScrollView, StyleSheet, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, radii, spacing, iconSize } from "@/presentation/theme/theme";
import { usePressScale } from "@/presentation/theme/usePressScale";
import { HapticManager } from "@/presentation/haptics/HapticManager";
import { routes } from "@/presentation/navigation/routes";

const HERO = require("../assets/images/main-menu-hero.jpg");

interface MenuItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route?: string;
  highlight?: boolean;
  disabled?: boolean;
}

/**
 * The Design Bible's flagship screen (UI-001): a full-bleed painted hero,
 * the gold serif CHRONICLE wordmark + compass medallion, tagline, and a
 * vertical launcher of large gold-bordered buttons. It owns "/" — every
 * button pushes into the four-tab experience (which now lives at
 * /journey, /character, ...). Buttons only route to features that actually
 * exist; the two the app hasn't built yet are shown, honestly disabled,
 * rather than faked (matching the project's stated honesty rule).
 */
export default function MainMenuScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const lastSavedAt = useWorldStore((s) => s.lastSavedAt);

  const savedLabel = lastSavedAt
    ? `Last saved ${lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
    : "Your saga awaits";

  const items: MenuItem[] = [
    { key: "continue", icon: "compass", title: "Continue", subtitle: savedLabel, route: routes.journey, highlight: true },
    { key: "new", icon: "sparkles", title: "New Adventure", subtitle: "Coming soon", disabled: true },
    { key: "chronicle", icon: "book", title: "Chronicle", subtitle: "World news & history", route: routes.chronicle },
    { key: "characters", icon: "person", title: "Characters", subtitle: "Your hero & companions", route: routes.character },
    { key: "quests", icon: "reader", title: "Quest Log", subtitle: "Active quests & objectives", route: routes.quests },
    { key: "inventory", icon: "bag", title: "Inventory", subtitle: "Coming soon", disabled: true },
    { key: "world", icon: "globe", title: "World", subtitle: "Map, kingdoms & factions", route: routes.world },
  ];

  return (
    <ImageBackground source={HERO} style={styles.bg} resizeMode="cover">
      {/* Top and bottom scrims so the wordmark and buttons stay legible over the art. */}
      <View style={[styles.scrim, styles.scrimTop, { backgroundColor: theme.background }]} pointerEvents="none" />
      <View style={[styles.scrim, styles.scrimBottom, { backgroundColor: theme.background }]} pointerEvents="none" />

      <View style={[styles.settingsWrap, { top: insets.top + spacing.sm }]}>
        <SettingsButton onPress={() => router.push(routes.settings)} borderColor={theme.goldBorder} tint={theme.gold} bg={theme.background} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxl, paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandBlock}>
          <View style={styles.wordmarkRow}>
            <Text
              testID="main-menu-title"
              style={[styles.wordmark, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.hero) }]}
              allowFontScaling
              maxFontSizeMultiplier={1.3}
            >
              CHRONICLE
            </Text>
            <View style={[styles.medallion, { borderColor: theme.goldBorder }]}>
              <Ionicons name="compass" size={iconSize.emphasis} color={theme.gold} />
            </View>
          </View>
          <Text style={[styles.tagline, { color: theme.bronze }]} allowFontScaling maxFontSizeMultiplier={1.4}>
            REALMS REMEMBER.  LEGENDS ENDURE.
          </Text>
        </View>

        <View style={styles.menuBlock}>
          {items.map((item) => (
            <MenuButton
              key={item.key}
              item={item}
              theme={theme}
              onPress={() => {
                if (item.route) router.push(item.route as never);
              }}
            />
          ))}
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

function SettingsButton({ onPress, borderColor, tint, bg }: { onPress: () => void; borderColor: string; tint: string; bg: string }) {
  return (
    <Pressable
      onPress={() => {
        void HapticManager.light();
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Settings"
      testID="main-menu-settings-button"
      style={[styles.settingsButton, { borderColor, backgroundColor: bg + "CC" }]}
    >
      <Ionicons name="settings-sharp" size={iconSize.standard} color={tint} />
    </Pressable>
  );
}

function MenuButton({ item, theme, onPress }: { item: MenuItem; theme: ReturnType<typeof useTheme>; onPress: () => void }) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  const borderColor = item.highlight ? theme.accent : theme.goldBorder;
  const iconColor = item.highlight ? theme.accent : theme.gold;
  const titleColor = item.disabled ? theme.inkMuted : theme.ink;

  const handlePress = () => {
    if (item.disabled) return;
    void HapticManager.light();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: item.disabled ? 1 : scale }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={item.disabled ? undefined : onPressIn}
        onPressOut={item.disabled ? undefined : onPressOut}
        disabled={item.disabled}
        accessibilityRole="button"
        accessibilityLabel={item.title}
        accessibilityHint={item.subtitle}
        accessibilityState={{ disabled: !!item.disabled }}
        testID={`main-menu-${item.key}-button`}
        style={({ pressed }) => [
          styles.menuButton,
          {
            borderColor,
            backgroundColor: (item.highlight ? theme.surfaceRaised : theme.panel) + "E6",
            opacity: item.disabled ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={[styles.iconWell, { borderColor }]}>
          <Ionicons name={item.icon} size={iconSize.standard} color={iconColor} />
        </View>
        <View style={styles.menuText}>
          <Text
            style={[styles.menuTitle, { color: titleColor, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.title) }]}
            allowFontScaling
            maxFontSizeMultiplier={1.4}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={[styles.menuSubtitle, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.caption) }]} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>
        {!item.disabled && <Ionicons name="chevron-forward" size={iconSize.standard} color={theme.inkMuted} />}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scrim: { position: "absolute", left: 0, right: 0, height: "34%" },
  scrimTop: { top: 0, opacity: 0.6 },
  scrimBottom: { bottom: 0, height: "48%", opacity: 0.92 },
  settingsWrap: { position: "absolute", right: spacing.lg, zIndex: 10 },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: spacing.lg, minHeight: "100%", justifyContent: "space-between" },
  brandBlock: { alignItems: "center", marginBottom: spacing.xl },
  wordmarkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  wordmark: { fontWeight: "800", letterSpacing: 3 },
  medallion: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tagline: { marginTop: spacing.md, fontSize: 12, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  menuBlock: { gap: spacing.sm + 2 },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    minHeight: 62,
  },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { flex: 1 },
  menuTitle: { fontWeight: "700", letterSpacing: 0.3 },
  menuSubtitle: { marginTop: 2 },
});
