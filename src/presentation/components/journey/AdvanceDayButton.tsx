import React from "react";
import { Animated, Pressable, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/useTheme";
import { radii, scaledFontSize, spacing, typeScale } from "../../theme/theme";
import { usePressScale } from "../../theme/usePressScale";
import { HapticManager } from "../../haptics/HapticManager";

interface AdvanceDayButtonProps {
  onPress: () => void;
}

/**
 * A strong-but-compact time-advance action. It calls the existing
 * deterministic day-advance store action (advanceTime) — no new time system —
 * and is a centered pill rather than a full-bleed slab that dominates the
 * screen.
 */
export function AdvanceDayButton({ onPress }: AdvanceDayButtonProps) {
  const theme = useTheme();
  const { scale, onPressIn, onPressOut } = usePressScale();

  const handlePress = () => {
    void HapticManager.light();
    onPress();
  };

  return (
    <Animated.View style={[styles.outer, { transform: [{ scale }] }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel="Rest a day"
        accessibilityHint="Advances the world by one day"
        style={({ pressed }) => [styles.pill, { backgroundColor: theme.gold, borderColor: theme.goldBorder, opacity: pressed ? 0.9 : 1 }]}
      >
        <Ionicons name="moon" size={16} color={theme.background} />
        <Text style={[styles.label, { color: theme.background, fontSize: scaledFontSize(typeScale.body) }]}>Rest a day</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: { alignItems: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  label: { fontWeight: "700", letterSpacing: 0.5 },
});
