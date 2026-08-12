import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Image, ScrollView, StyleSheet, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, radii, spacing, iconSize } from "@/presentation/theme/theme";
import { usePressScale } from "@/presentation/theme/usePressScale";
import { useReduceMotion } from "@/presentation/theme/useReduceMotion";
import { HapticManager } from "@/presentation/haptics/HapticManager";
import { BrassIcon, type BrassIconName } from "@/presentation/components/BrassIcon";
import { routes } from "@/presentation/navigation/routes";

const HERO = require("../assets/images/main-menu-hero.jpg");

interface MenuItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  brass?: BrassIconName;
  title: string;
  subtitle: string;
  route?: string;
  highlight?: boolean;
  disabled?: boolean;
}

/**
 * The Design Bible's flagship screen (UI-001): a full-bleed painted hero
 * with a slow parallax drift and a soft torch-glow (both disabled under
 * Reduce Motion), the gold serif CHRONICLE wordmark + compass medallion,
 * tagline, and a vertical launcher of large gold-bordered buttons. It owns
 * "/" — every button pushes into the four-tab experience (which now lives
 * at /journey, /character, ...). Buttons only route to features that exist;
 * Inventory is shown honestly disabled rather than faked.
 */
export default function MainMenuScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const lastSavedAt = useWorldStore((s) => s.lastSavedAt);

  const drift = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      drift.setValue(0.5);
      glow.setValue(0.5);
      return;
    }
    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    driftLoop.start();
    glowLoop.start();
    return () => {
      driftLoop.stop();
      glowLoop.stop();
    };
  }, [reduceMotion, drift, glow]);

  const heroTransform = {
    transform: [
      { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1.07, 1.11] }) },
      { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-7, 7] }) },
      { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [5, -5] }) },
    ],
  };
  const glowStyle = { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.44] }) };

  const savedLabel = lastSavedAt
    ? `Last saved ${lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
    : "Your saga awaits";

  const items: MenuItem[] = [
    { key: "continue", icon: "compass", brass: "journey", title: "Continue", subtitle: savedLabel, route: routes.journey, highlight: true },
    { key: "new", icon: "sparkles", title: "New Adventure", subtitle: "Begin a fresh saga", route: routes.newAdventure },
    { key: "chronicle", icon: "book", brass: "chronicle", title: "Chronicle", subtitle: "World news & history", route: routes.chronicle },
    { key: "characters", icon: "person", brass: "character", title: "Characters", subtitle: "Your hero & progress", route: routes.character },
    { key: "quests", icon: "reader", brass: "quest", title: "Quest Log", subtitle: "Active quests & objectives", route: routes.quests },
    { key: "inventory", icon: "bag", title: "Inventory", subtitle: "Coming soon", disabled: true },
    { key: "world", icon: "globe", brass: "world", title: "World", subtitle: "Map, kingdoms & factions", route: routes.world },
  ];

  return (
    <View style={styles.root}>
      <Animated.Image source={HERO} style={[styles.hero, heroTransform]} resizeMode="cover" />
      {/* Warm torch-glow near the horizon/castle, pulsing softly. */}
      <Animated.View style={[styles.glow, glowStyle, { backgroundColor: theme.gold }]} pointerEvents="none" />
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
          {items.map((item, i) => (
            <MenuButton
              key={item.key}
              item={item}
              theme={theme}
              showDivider={i > 0}
              onPress={() => {
                if (item.route) router.push(item.route as never);
              }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
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

function MenuButton({ item, theme, showDivider, onPress }: { item: MenuItem; theme: ReturnType<typeof useTheme>; showDivider: boolean; onPress: () => void }) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  const highlight = !!item.highlight;
  const iconColor = highlight ? theme.accent : theme.gold;
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
          highlight && {
            backgroundColor: theme.surfaceRaised + "E6",
            borderColor: theme.accent,
            borderWidth: StyleSheet.hairlineWidth * 2,
            borderRadius: radii.md,
            paddingHorizontal: spacing.lg,
            marginBottom: spacing.sm,
          },
          !highlight && showDivider && { borderTopColor: theme.goldBorder + "55", borderTopWidth: StyleSheet.hairlineWidth },
          { opacity: item.disabled ? 0.5 : pressed ? 0.8 : 1 },
        ]}
      >
        <View style={[styles.iconWell, { borderColor: highlight ? theme.accent : theme.goldBorder }]}>
          {item.brass ? (
            <BrassIcon name={item.brass} size={26} />
          ) : (
            <Ionicons name={item.icon} size={iconSize.standard} color={iconColor} />
          )}
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
  root: { flex: 1, overflow: "hidden" },
  hero: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  glow: {
    position: "absolute",
    top: "22%",
    right: "18%",
    width: 240,
    height: 240,
    borderRadius: 120,
  },
  scrim: { position: "absolute", left: 0, right: 0 },
  scrimTop: { top: 0, height: "34%", opacity: 0.6 },
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
  menuBlock: { gap: 0 },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2,
    minHeight: 62,
  },
  iconWell: {
    width: 42,
    height: 42,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { flex: 1 },
  menuTitle: { fontWeight: "700", letterSpacing: 0.3 },
  menuSubtitle: { marginTop: 2 },
});
