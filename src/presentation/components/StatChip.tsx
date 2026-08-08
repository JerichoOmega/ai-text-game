import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/useTheme";
import { scaledFontSize, typeScale, iconSize } from "../theme/theme";
import { Panel } from "./Panel";

interface StatChipProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  /** Overrides the icon/value color — used for the world-state "Unrest" warning state. */
  tone?: "default" | "warning";
}

/**
 * Memoized (primitive props, exact shallow compare). Also grouped for
 * VoiceOver via `accessible` + a combined `accessibilityLabel` — without
 * this, a screen reader announces the icon (silently, decorative), then
 * "820" and "Health" as two separate swipe stops instead of one coherent
 * "Health, 820" announcement. Same fix applied to StatBar below.
 */
export const StatChip = memo(function StatChip({ icon, label, value, tone = "default" }: StatChipProps) {
  const theme = useTheme();
  const accentColor = tone === "warning" ? theme.wax : theme.gold;

  return (
    <Panel style={styles.chip} accessible accessibilityLabel={`${label}: ${value}`}>
      <Ionicons name={icon} size={iconSize.standard} color={accentColor} />
      <Text
        style={[styles.value, { color: theme.ink, fontSize: scaledFontSize(typeScale.body) }]}
        allowFontScaling
        maxFontSizeMultiplier={1.4}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={[styles.label, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.caption) }]} numberOfLines={1}>
        {label}
      </Text>
    </Panel>
  );
});

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 6,
    gap: 4,
  },
  value: { fontWeight: "700", marginTop: 2 },
  label: { textTransform: "uppercase", letterSpacing: 0.5 },
});
