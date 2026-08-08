import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme/useTheme";
import { eyebrowStyle } from "../theme/theme";

interface SectionHeaderProps {
  label: string;
  actionLabel?: string;
  onActionPress?: () => void;
}

export function SectionHeader({ label, actionLabel, onActionPress }: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[eyebrowStyle, { color: theme.inkMuted }]} allowFontScaling maxFontSizeMultiplier={1.5}>
        {label}
      </Text>
      {actionLabel && onActionPress && (
        <Pressable onPress={onActionPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <Text style={[eyebrowStyle, { color: theme.accent }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
});
