import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme/useTheme";
import { eyebrowStyle, spacing } from "../theme/theme";

interface SectionLabelProps {
  label: string;
  /** Optional trailing link (e.g. "View Chronicle") using the existing route. */
  actionLabel?: string;
  onAction?: () => void;
  /** `gold` for the primary section of a screen; `bronze` (default) for the rest. */
  tone?: "gold" | "bronze";
}

/**
 * Typographic section divider — a tracked small-caps label followed by a thin
 * brass rule that runs to the edge. This replaces the habit of wrapping every
 * section in a bordered panel: hierarchy comes from type + a hairline, not a
 * box. An optional right-aligned link handles drill-down ("View Chronicle").
 */
export function SectionLabel({ label, actionLabel, onAction, tone = "bronze" }: SectionLabelProps) {
  const theme = useTheme();
  const color = tone === "gold" ? theme.gold : theme.bronze;

  return (
    <View style={styles.row}>
      <Text style={[eyebrowStyle, { color }]} allowFontScaling maxFontSizeMultiplier={1.4}>
        {label}
      </Text>
      <View style={[styles.rule, { backgroundColor: theme.goldBorder }]} />
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <Text style={[styles.action, { color: theme.gold }]}>{actionLabel} ›</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  rule: { flex: 1, height: StyleSheet.hairlineWidth, opacity: 0.7 },
  action: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
});
