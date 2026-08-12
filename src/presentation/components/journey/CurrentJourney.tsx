import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/useTheme";
import { fontFamily, radii, scaledFontSize, spacing, typeScale, eyebrowStyle } from "../../theme/theme";

interface Objective {
  id: string;
  label: string;
  complete: boolean;
}

interface CurrentJourneyProps {
  title: string;
  summary: string;
  objectives: Objective[];
  actionHint: string;
  onPress: () => void;
}

/**
 * Tier-2: a focused, journal-style rendering of the active quest — not an
 * oversized bordered card. Objective state is shown with a filled/outline
 * marker (shape, not just color) so completion reads without relying on hue.
 */
export function CurrentJourney({ title, summary, objectives, actionHint, onPress }: CurrentJourneyProps) {
  const theme = useTheme();
  const done = objectives.filter((o) => o.complete).length;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Current journey: ${title}. ${actionHint}`}
      style={({ pressed }) => [styles.wrap, { borderLeftColor: theme.gold, opacity: pressed ? 0.9 : 1 }]}
    >
      <Text style={[eyebrowStyle, { color: theme.inkMuted }]}>Current Journey</Text>
      <Text
        style={[styles.title, { color: theme.ink, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.title) }]}
        numberOfLines={2}
      >
        {title}
      </Text>
      <Text style={[styles.summary, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.caption) }]} numberOfLines={3}>
        {summary}
      </Text>

      <Text style={[styles.progress, { color: theme.bronze, fontSize: scaledFontSize(typeScale.eyebrow) }]}>
        {done} / {objectives.length} objective{objectives.length === 1 ? "" : "s"}
      </Text>

      {objectives.map((o) => (
        <View key={o.id} style={styles.objRow}>
          <Ionicons
            name={o.complete ? "checkmark-circle" : "ellipse-outline"}
            size={16}
            color={o.complete ? theme.forest : theme.inkMuted}
          />
          <Text
            style={[
              styles.objLabel,
              { color: o.complete ? theme.inkMuted : theme.ink, fontSize: scaledFontSize(typeScale.caption), textDecorationLine: o.complete ? "line-through" : "none" },
            ]}
            numberOfLines={2}
          >
            {o.label}
          </Text>
        </View>
      ))}

      <View style={[styles.actionRow, { borderTopColor: theme.border }]}>
        <Text style={[styles.action, { color: theme.gold, fontSize: scaledFontSize(typeScale.caption) }]}>{actionHint}</Text>
        <Ionicons name="chevron-forward" size={16} color={theme.gold} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderLeftWidth: 3, paddingLeft: spacing.md, paddingVertical: spacing.xs },
  title: { marginTop: spacing.xs, lineHeight: 24 },
  summary: { marginTop: spacing.xs, lineHeight: 18 },
  progress: { marginTop: spacing.sm, letterSpacing: 1, textTransform: "uppercase", fontWeight: "700" },
  objRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.sm },
  objLabel: { flexShrink: 1, lineHeight: 18 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  action: { fontWeight: "600" },
});

export const journeyStyles = styles;
