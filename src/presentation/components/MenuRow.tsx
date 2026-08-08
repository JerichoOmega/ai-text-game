import React from "react";
import { Animated, Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/useTheme";
import { scaledFontSize, typeScale, radii, iconSize, spacing } from "../theme/theme";
import { usePressScale } from "../theme/usePressScale";
import { HapticManager } from "../haptics/HapticManager";

interface MenuRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
}

export function MenuRow({ icon, title, subtitle, onPress, disabled }: MenuRowProps) {
  const theme = useTheme();
  const { scale, onPressIn, onPressOut } = usePressScale();

  const handlePress = () => {
    void HapticManager.light();
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: disabled ? 1 : scale }] }}>
      <Pressable
        onPress={handlePress}
        onPressIn={disabled ? undefined : onPressIn}
        onPressOut={disabled ? undefined : onPressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint={subtitle}
        accessibilityState={{ disabled: !!disabled }}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: theme.panel, borderColor: theme.goldBorder, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        ]}
      >
        <View style={[styles.iconWell, { borderColor: theme.goldBorder }]}>
          <Ionicons name={icon} size={iconSize.standard} color={theme.gold} />
        </View>
        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: theme.ink, fontSize: scaledFontSize(typeScale.body) }]} allowFontScaling maxFontSizeMultiplier={1.5}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.caption) }]}>{subtitle}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={iconSize.inline} color={theme.inkMuted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm + 2,
    minHeight: 56,
  },
  iconWell: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { flex: 1 },
  title: { fontWeight: "600" },
  subtitle: { marginTop: 2 },
});
