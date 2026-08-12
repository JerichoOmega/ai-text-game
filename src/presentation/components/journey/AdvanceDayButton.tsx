import React from "react";
import { Animated, Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/useTheme";
import { fontFamily, radii, scaledFontSize, spacing, typeScale } from "../../theme/theme";
import { usePressScale } from "../../theme/usePressScale";
import { HapticManager } from "../../haptics/HapticManager";

interface AdvanceDayButtonProps {
  onPress: () => void;
}

/**
 * The signature RPG action bar: a full-width crimson-and-brass plate with an
 * hourglass, "Rest a Day", and a quiet subtitle. It calls the existing
 * deterministic advanceTime action — no new time system.
 */
export function AdvanceDayButton({ onPress }: AdvanceDayButtonProps) {
  const theme = useTheme();
  const { scale, onPressIn, onPressOut } = usePressScale();

  const handlePress = () => {
    void HapticManager.light();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel="Rest a day"
        accessibilityHint="Advances the world by one day"
        style={({ pressed }) => [
          styles.bar,
          { backgroundColor: "rgba(122,42,40,0.32)", borderColor: theme.goldBorder, opacity: pressed ? 0.9 : 1 },
        ]}
      >
        <View style={[styles.iconWrap, { borderColor: theme.gold }]}>
          <Ionicons name="hourglass-outline" size={18} color={theme.gold} />
        </View>
        <View>
          <Text style={[styles.label, { color: theme.ink, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.body) }]}>
            Rest a Day
          </Text>
          <Text style={[styles.sub, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.eyebrow) }]}>
            Advance time to the next day
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: { width: 32, height: 32, borderRadius: radii.pill, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  label: { fontWeight: "700", letterSpacing: 1 },
  sub: { marginTop: 1, letterSpacing: 0.3, fontStyle: "italic" },
});
