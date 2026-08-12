import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/useTheme";
import { fontFamily, radii, scaledFontSize, spacing, typeScale, eyebrowStyle } from "../../theme/theme";
import { OrnateFrame } from "./OrnateFrame";

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
 * Tier-2: the active quest as a framed journal plate. A crimson crest marks
 * it as the live objective, a thin progress rule shows completion, objectives
 * use shape markers (not color alone), and the primary action is the one
 * crimson button on the screen. The label comes from the caller (real quest
 * affordance); nothing here is hard-coded.
 */
export function CurrentJourney({ title, summary, objectives, actionLabel, onPress }: CurrentJourneyProps) {
  const theme = useTheme();
  const done = objectives.filter((o) => o.complete).length;
  const pct = objectives.length > 0 ? done / objectives.length : 0;

  return (
    <View>
      <Text style={[eyebrowStyle, { color: theme.gold, marginBottom: spacing.sm }]}>Current Journey</Text>
      <OrnateFrame>
        <View style={styles.head}>
          <View style={[styles.crest, { borderColor: theme.wax, backgroundColor: "rgba(122,42,40,0.25)" }]}>
            <Ionicons name="ribbon" size={20} color={theme.wax} />
          </View>
          <View style={styles.headText}>
            <Text
              style={[styles.title, { color: theme.ink, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.title) }]}
              numberOfLines={2}
            >
              {title}
            </Text>
            <Text style={[styles.summary, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.caption) }]} numberOfLines={3}>
              {summary}
            </Text>
          </View>
        </View>

        <Text style={[styles.progressLabel, { color: theme.bronze, fontSize: scaledFontSize(typeScale.eyebrow) }]}>
          {done} / {objectives.length} objective{objectives.length === 1 ? "" : "s"} completed
        </Text>
        <View style={[styles.track, { backgroundColor: theme.border }]}>
          <View style={[styles.fill, { backgroundColor: theme.gold, width: `${Math.round(pct * 100)}%` }]} />
        </View>

        {objectives.map((o) => (
          <View key={o.id} style={styles.objRow}>
            <Ionicons name={o.complete ? "checkmark-circle" : "ellipse-outline"} size={16} color={o.complete ? theme.forest : theme.inkMuted} />
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
      </OrnateFrame>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", gap: spacing.md },
  crest: { width: 44, height: 44, borderRadius: radii.sm, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headText: { flex: 1, minWidth: 0 },
  title: { lineHeight: 24 },
  summary: { marginTop: spacing.xs, lineHeight: 18 },
  progressLabel: { marginTop: spacing.lg, letterSpacing: 1, textTransform: "uppercase", fontWeight: "700" },
  track: { height: 3, borderRadius: 2, marginTop: spacing.xs, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 2 },
  objRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.md },
  objLabel: { flexShrink: 1, lineHeight: 18 },
  action: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 46,
    marginTop: spacing.lg,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionText: { fontWeight: "700", letterSpacing: 0.5 },
});
