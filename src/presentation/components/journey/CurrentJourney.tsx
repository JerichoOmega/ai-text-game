import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/useTheme";
import { fontFamily, radii, scaledFontSize, spacing, typeScale } from "../../theme/theme";
import { SectionLabel } from "../SectionLabel";

interface Objective {
  id: string;
  label: string;
  complete: boolean;
}

interface CurrentJourneyProps {
  title: string;
  summary: string;
  objectives: Objective[];
  actionLabel: string;
  onPress: () => void;
}

/**
 * The primary gameplay focus, presented as an open journal passage rather than
 * a boxed card: a serif quest title, a line of narrative summary, a thin
 * progress rule, and the ONE crimson action on the screen. No border, no frame
 * — hierarchy comes from type and the single strong button.
 */
export function CurrentJourney({ title, summary, objectives, actionLabel, onPress }: CurrentJourneyProps) {
  const theme = useTheme();
  const done = objectives.filter((o) => o.complete).length;
  const pct = objectives.length > 0 ? done / objectives.length : 0;

  return (
    <View>
      <SectionLabel label="Current Journey" tone="gold" />

      <View style={styles.titleRow}>
        <Ionicons name="ribbon" size={18} color={theme.wax} style={styles.crest} />
        <Text
          style={[styles.title, { color: theme.ink, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.title) }]}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>
      <Text style={[styles.summary, { color: theme.inkMuted, fontFamily: fontFamily.display, fontSize: scaledFontSize(typeScale.caption) }]} numberOfLines={3}>
        {summary}
      </Text>

      <View style={styles.progressRow}>
        <View style={[styles.track, { backgroundColor: theme.border }]}>
          <View style={[styles.fill, { backgroundColor: theme.gold, width: `${Math.round(pct * 100)}%` }]} />
        </View>
        <Text style={[styles.progressLabel, { color: theme.bronze, fontSize: scaledFontSize(typeScale.eyebrow) }]}>
          {done}/{objectives.length}
        </Text>
      </View>

      {objectives.map((o) => (
        <View key={o.id} style={styles.objRow}>
          <Ionicons name={o.complete ? "checkmark-circle" : "ellipse-outline"} size={15} color={o.complete ? theme.forest : theme.inkMuted} />
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

      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        style={({ pressed }) => [styles.action, { backgroundColor: theme.wax, borderColor: theme.goldBorder, opacity: pressed ? 0.9 : 1 }]}
      >
        <Text style={[styles.actionText, { color: "#F6ECD8", fontSize: scaledFontSize(typeScale.body) }]}>{actionLabel}</Text>
        <Ionicons name="chevron-forward" size={16} color="#F6ECD8" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  crest: { marginTop: 1 },
  title: { flex: 1, lineHeight: 24 },
  summary: { marginTop: spacing.xs, lineHeight: 19 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  track: { flex: 1, height: 3, borderRadius: 2, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
  progressLabel: { letterSpacing: 1, fontWeight: "700" },
  objRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.sm },
  objLabel: { flexShrink: 1, lineHeight: 18 },
  action: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 48,
    marginTop: spacing.lg,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: { fontWeight: "700", letterSpacing: 0.5 },
});
