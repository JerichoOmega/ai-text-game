import React from "react";
import { Animated, Pressable, Text, StyleSheet, type AccessibilityRole } from "react-native";
import { useTheme } from "../theme/useTheme";
import { scaledFontSize, typeScale, radii } from "../theme/theme";
import { usePressScale } from "../theme/usePressScale";
import { HapticManager } from "../haptics/HapticManager";

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  accessibilityHint?: string;
}

/**
 * One-handed-friendly: large hit target (min 44pt per HIG), haptic tap
 * feedback via HapticManager (never expo-haptics directly — see that
 * file), text that scales with Dynamic Type, and a shared press-scale
 * animation (see usePressScale) so every button in the app feels like the
 * same physical material rather than each screen having its own feedback.
 */
export function ActionButton({ label, onPress, variant = "primary", disabled, accessibilityHint }: ActionButtonProps) {
  const theme = useTheme();
  const { scale, onPressIn, onPressOut } = usePressScale();

  const backgroundColor =
    variant === "primary" ? theme.gold : variant === "danger" ? theme.wax : theme.panel;
  const textColor = variant === "secondary" ? theme.ink : theme.background;

  const handlePress = () => {
    void (variant === "danger" ? HapticManager.heavy() : HapticManager.light());
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        accessibilityRole={"button" as AccessibilityRole}
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor, borderColor: theme.goldBorder, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        ]}
      >
        <Text
          style={[styles.label, { color: textColor, fontSize: scaledFontSize(typeScale.body) }]}
          allowFontScaling
          maxFontSizeMultiplier={1.6}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontWeight: "600",
  },
});
