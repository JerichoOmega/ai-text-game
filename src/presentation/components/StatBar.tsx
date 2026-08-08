import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/useTheme";
import { scaledFontSize, typeScale, radii } from "../theme/theme";

interface StatBarProps {
  label: string;
  current: number;
  max: number;
  color?: string;
}

/**
 * Uses RN's `accessibilityRole="progressbar"` + `accessibilityValue`
 * rather than just a text label — this is the semantically correct API for
 * a progress indicator (VoiceOver announces it as a progress bar with the
 * actual value, not just a string), and it groups the label+track into one
 * announcement instead of two separate swipe stops.
 */
export function StatBar({ label, current, max, color }: StatBarProps) {
  const theme = useTheme();
  const fillColor = color ?? theme.gold;
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;

  return (
    <View
      style={styles.wrapper}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: current }}
    >
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.caption) }]}>{label}</Text>
        <Text style={[styles.value, { color: theme.ink, fontSize: scaledFontSize(typeScale.caption) }]}>
          {current} / {max}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 10 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "600" },
  value: { fontWeight: "600" },
  track: { height: 8, borderRadius: radii.xs, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  fill: { height: "100%", borderRadius: radii.xs },
});
