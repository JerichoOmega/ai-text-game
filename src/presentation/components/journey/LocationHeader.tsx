import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/useTheme";
import { fontFamily, scaledFontSize, spacing, typeScale, eyebrowStyle } from "../../theme/theme";
import { JournalTriggerButton } from "../JournalTriggerButton";

interface LocationHeaderProps {
  locationName: string;
  dateLabel: string;
  statusLabel: string;
  statusWarning: boolean;
}

/**
 * Tier-1 anchor: the place name is the loudest element on the screen, with
 * the calendar reduced to a quiet eyebrow and world stability folded in as a
 * single inline signal — not a dashboard card.
 */
export function LocationHeader({ locationName, dateLabel, statusLabel, statusWarning }: LocationHeaderProps) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={[styles.date, eyebrowStyle, { color: theme.inkMuted }]} numberOfLines={1}>
          {dateLabel}
        </Text>
        <JournalTriggerButton />
      </View>
      <Text
        style={[styles.name, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.hero) }]}
        allowFontScaling
        maxFontSizeMultiplier={1.4}
        numberOfLines={2}
      >
        {locationName}
      </Text>
      <View style={styles.metaRow}>
        <Ionicons name={statusWarning ? "alert-circle-outline" : "shield-checkmark-outline"} size={14} color={statusWarning ? theme.wax : theme.bronze} />
        <Text style={[styles.meta, { color: statusWarning ? theme.wax : theme.inkMuted, fontSize: scaledFontSize(typeScale.caption) }]}>
          {statusLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: spacing.xs, paddingBottom: spacing.md },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  date: { flexShrink: 1 },
  name: { marginTop: spacing.sm, letterSpacing: 0.5 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.xs },
  meta: { fontStyle: "italic" },
});
