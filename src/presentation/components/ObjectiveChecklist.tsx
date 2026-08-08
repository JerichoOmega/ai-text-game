import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/useTheme";
import { iconSize, spacing } from "../theme/theme";

export interface ObjectiveItem {
  id: string;
  label: string;
  complete: boolean;
}

interface ObjectiveChecklistProps {
  objectives: ObjectiveItem[];
}

export function ObjectiveChecklist({ objectives }: ObjectiveChecklistProps) {
  const theme = useTheme();
  if (objectives.length === 0) return null;

  const completedCount = objectives.filter((o) => o.complete).length;
  const progressPct = completedCount / objectives.length;

  return (
    <View style={styles.block}>
      <View
        style={[styles.progressTrack, { backgroundColor: theme.surface, borderColor: theme.border }]}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Objective progress"
        accessibilityValue={{ min: 0, max: objectives.length, now: completedCount }}
      >
        <View style={[styles.progressFill, { width: `${progressPct * 100}%`, backgroundColor: theme.accent }]} />
      </View>
      <Text style={[styles.progressLabel, { color: theme.inkMuted }]}>
        Progress: {completedCount} / {objectives.length} objective{objectives.length === 1 ? "" : "s"}
      </Text>
      {objectives.map((objective) => (
        <View
          key={objective.id}
          style={styles.row}
          accessible
          accessibilityRole="checkbox"
          accessibilityState={{ checked: objective.complete }}
          accessibilityLabel={objective.label}
        >
          <Ionicons
            name={objective.complete ? "checkmark-circle" : "ellipse-outline"}
            size={iconSize.inline}
            color={objective.complete ? theme.forest : theme.inkMuted}
          />
          <Text
            style={[
              styles.label,
              { color: objective.complete ? theme.inkMuted : theme.ink, textDecorationLine: objective.complete ? "line-through" : "none" },
            ]}
          >
            {objective.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.md },
  // radius 3 on a 6px-tall track is a half-height pill cap, same
  // "computed from its own size" exception as a circular avatar radius —
  // not a missed token, see DESIGN_SYSTEM.md's Spacing & radius section.
  progressTrack: { height: 6, borderRadius: 3, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", marginBottom: 6 },
  progressFill: { height: "100%", borderRadius: 3 },
  progressLabel: { fontSize: 12, fontWeight: "600", marginBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  label: { fontSize: 13, flex: 1 },
});
