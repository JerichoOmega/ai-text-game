import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/useTheme";
import { fontFamily, radii, scaledFontSize, spacing, typeScale } from "../../theme/theme";

interface LocationSceneProps {
  locationName: string;
  weather: string;
  compact?: boolean;
}

const WEATHER: Record<string, { icon: keyof typeof Ionicons.glyphMap; phrase: string }> = {
  clear: { icon: "sunny-outline", phrase: "Clear skies" },
  sunny: { icon: "sunny-outline", phrase: "Bright sun" },
  cloudy: { icon: "cloud-outline", phrase: "Overcast" },
  overcast: { icon: "cloud-outline", phrase: "Heavy cloud" },
  rain: { icon: "rainy-outline", phrase: "Steady rain" },
  rainy: { icon: "rainy-outline", phrase: "Steady rain" },
  storm: { icon: "thunderstorm-outline", phrase: "A gathering storm" },
  snow: { icon: "snow-outline", phrase: "Falling snow" },
  fog: { icon: "cloud-outline", phrase: "Thick fog" },
  windy: { icon: "leaf-outline", phrase: "A restless wind" },
  heatwave: { icon: "sunny-outline", phrase: "Oppressive heat" },
};

/**
 * The single framed, atmospheric element on the screen — the player is meant
 * to feel they are *looking at* the settlement, not reading a stats panel. No
 * settlement artwork exists yet, so this uses a restrained layered treatment
 * (muted surface, a faint oversized landmark glyph, a warm hairline) instead
 * of a generic image placeholder.
 */
export function LocationScene({ locationName, weather, compact }: LocationSceneProps) {
  const theme = useTheme();
  const w = WEATHER[weather.toLowerCase()] ?? { icon: "partly-sunny-outline" as const, phrase: weather };

  return (
    <View
      style={[
        styles.scene,
        { backgroundColor: theme.surfaceRaised, borderColor: theme.border, height: compact ? 120 : 148 },
      ]}
    >
      <Ionicons name="business" size={compact ? 120 : 150} color={theme.gold} style={styles.landmark} />
      <View style={[styles.accent, { backgroundColor: theme.goldBorder }]} />
      <View style={styles.content}>
        <View style={styles.weatherRow}>
          <Ionicons name={w.icon} size={16} color={theme.bronze} />
          <Text style={[styles.weather, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.caption) }]}>{w.phrase}</Text>
        </View>
        <Text
          style={[styles.atmosphere, { color: theme.ink, fontFamily: fontFamily.display, fontSize: scaledFontSize(typeScale.title) }]}
          numberOfLines={2}
        >
          {w.phrase} over {locationName}.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  landmark: { position: "absolute", right: -18, top: -14, opacity: 0.06 },
  accent: { position: "absolute", left: 0, right: 0, bottom: 0, height: 2, opacity: 0.6 },
  content: { padding: spacing.lg },
  weatherRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.xs },
  weather: { textTransform: "capitalize", letterSpacing: 0.3 },
  atmosphere: { fontStyle: "italic", lineHeight: 26 },
});
