import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, Image, ScrollView, StyleSheet, Animated, Easing, useWindowDimensions } from "react-native";
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
 * The title page of the chronicle: a large painted cover with the gold serif
 * CHRONICLE wordmark set over the lower third of the artwork, and — below the
 * painting — a column of compact manuscript navigation entries (serif title +
 * quiet subtitle, a thin brass rule between them). No bordered icon wells, no
 * rounded cards: this should read as the opening leaf of a fantasy book, not
 * an app menu. Entries only route to features that exist; Inventory is shown
 * honestly disabled rather than faked.
 */
export default function MainMenuScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const heroHeight = Math.min(Math.max(winH * 0.55, 360), 620);
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
      { scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.09] }) },
      { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] }) },
      { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [4, -4] }) },
    ],
  };
  const glowStyle = { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.4] }) };

  const savedLabel = lastSavedAt
    ? `Last saved ${lastSavedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
    : "Your saga awaits";

  const items: MenuItem[] = [
    { key: "continue", icon: "compass", brass: "journey", title: "Continue", subtitle: savedLabel, route: routes.journey, highlight: true },
    { key: "new", icon: "sparkles", title: "New Adventure", subtitle: "Begin a fresh saga", route: routes.newAdventure },
    { key: "chronicle", icon: "book", brass: "chronicle", title: "Chronicle", subtitle: "World news & history", route: routes.chronicle },
    { key: "characters", icon: "person", brass: "character", title: "Characters", subtitle: "Your hero & progress", route: routes.character },
    { key: "quests", icon: "reader", brass: "quest", title: "Quest Log", subtitle: "Active quests & objectives", route: routes.quests },
    { key: "world", icon: "globe", brass: "world", title: "World", subtitle: "Map, kingdoms & factions", route: routes.world },
    { key: "inventory", icon: "bag", title: "Inventory", subtitle: "Coming soon", disabled: true },
  ];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} bounces={false}>
        {/* The painted cover — the wordmark rests over its lower edge. */}
        <View style={[styles.heroRegion, { height: heroHeight }]}>
          <Animated.Image source={HERO} style={[styles.hero, heroTransform]} resizeMode="cover" />
          <Animated.View style={[styles.glow, glowStyle, { backgroundColor: theme.gold }]} pointerEvents="none" />
          {/* Fade the painting's lower edge into the dark page so the title reads cleanly. */}
          <View style={[styles.heroFade, styles.heroFadeSoft, { backgroundColor: theme.background }]} pointerEvents="none" />
          <View style={[styles.heroFade, styles.heroFadeSolid, { backgroundColor: theme.background }]} pointerEvents="none" />

          <View style={[styles.settingsWrap, { top: insets.top + spacing.sm }]}>
            <SettingsButton onPress={() => router.push(routes.settings)} borderColor={theme.goldBorder} tint={theme.gold} bg={theme.background} />
          </View>

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
            </View>
            <View style={styles.taglineRow}>
              <View style={[styles.taglineRule, { backgroundColor: theme.goldBorder }]} />
              <Text style={[styles.tagline, { color: theme.bronze }]} allowFontScaling maxFontSizeMultiplier={1.4}>
                Realms remember · Legends endure
              </Text>
              <View style={[styles.taglineRule, { backgroundColor: theme.goldBorder }]} />
            </View>
          </View>
        </View>

        {/* Manuscript navigation on the dark leaf below the cover. */}
        <View style={[styles.menuSurface, { paddingBottom: insets.bottom + spacing.xl }]}>
          {items.map((item, i) => (
            <MenuEntry
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
      style={[styles.settingsButton, { borderColor, backgroundColor: bg + "AA" }]}
    >
      <Ionicons name="settings-sharp" size={iconSize.standard} color={tint} />
    </Pressable>
  );
}

function MenuEntry({ item, theme, showDivider, onPress }: { item: MenuItem; theme: ReturnType<typeof useTheme>; showDivider: boolean; onPress: () => void }) {
  const { scale, onPressIn, onPressOut } = usePressScale();
  const highlight = !!item.highlight;
  const iconColor = highlight ? theme.accent : theme.gold;
  const titleColor = item.disabled ? theme.inkMuted : highlight ? theme.gold : theme.ink;

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
          styles.entry,
          showDivider && { borderTopColor: theme.goldBorder + "40", borderTopWidth: StyleSheet.hairlineWidth },
          { opacity: item.disabled ? 0.5 : pressed ? 0.7 : 1 },
        ]}
      >
        <View style={styles.entryIcon}>
          {item.brass ? (
            <BrassIcon name={item.brass} size={26} active={!item.disabled} />
          ) : (
            <Ionicons name={item.icon} size={22} color={item.disabled ? theme.inkMuted : iconColor} />
          )}
        </View>
        <View style={styles.entryText}>
          <Text
            style={[styles.entryTitle, { color: titleColor, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.title) }]}
            allowFontScaling
            maxFontSizeMultiplier={1.4}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text style={[styles.entrySubtitle, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.caption) }]} numberOfLines={1}>
            {item.subtitle}
          </Text>
        </View>
        {!item.disabled && <Text style={[styles.chevron, { color: theme.bronze }]}>›</Text>}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1 },
  heroRegion: { width: "100%", overflow: "hidden", justifyContent: "flex-end" },
  hero: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  glow: {
    position: "absolute",
    top: "16%",
    right: "16%",
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  heroFade: { position: "absolute", left: 0, right: 0, bottom: 0 },
  heroFadeSoft: { height: "50%", opacity: 0.6 },
  heroFadeSolid: { height: "18%", opacity: 0.96 },
  settingsWrap: { position: "absolute", right: spacing.lg, zIndex: 10 },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  brandBlock: { alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, zIndex: 5 },
  wordmarkRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  wordmark: { fontWeight: "800", letterSpacing: 4, textAlign: "center" },
  taglineRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  taglineRule: { width: 28, height: StyleSheet.hairlineWidth, opacity: 0.8 },
  tagline: { fontSize: 11, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  menuSurface: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.md + 2,
    minHeight: 60,
  },
  entryIcon: { width: 30, alignItems: "center", justifyContent: "center" },
  entryText: { flex: 1, minWidth: 0 },
  entryTitle: { fontWeight: "700", letterSpacing: 0.5 },
  entrySubtitle: { marginTop: 2, fontStyle: "italic" },
  chevron: { fontSize: 22, fontWeight: "400" },
});
