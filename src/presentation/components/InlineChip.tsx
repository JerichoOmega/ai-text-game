import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/useTheme";

interface InlineChipProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

export function InlineChip({ icon, label }: InlineChipProps) {
  const theme = useTheme();

  return (
    <View style={[styles.chip, { borderColor: theme.goldBorder, backgroundColor: theme.surface }]}>
      <Ionicons name={icon} size={12} color={theme.gold} />
      <Text style={[styles.label, { color: theme.inkMuted }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: { fontSize: 11, fontWeight: "600" },
});
