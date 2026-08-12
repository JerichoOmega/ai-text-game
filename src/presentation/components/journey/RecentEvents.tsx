import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { fontFamily, scaledFontSize, spacing, typeScale } from "../../theme/theme";
import { historyCategoryColor } from "../../theme/theme";
import { SectionHeader } from "../SectionHeader";

interface EventEntry {
  id: string;
  headline: string;
  category: keyof typeof historyCategoryColor;
  year: number;
}

interface RecentEventsProps {
  events: EventEntry[];
  onViewAll: () => void;
}

/**
 * Tier-4: a compact chronicle feed. The most recent entry is emphasized;
 * older ones recede. A category dot distinguishes event kinds without turning
 * each entry into a bordered card, and "View Chronicle" keeps the full log one
 * tap away instead of consuming the screen.
 */
export function RecentEvents({ events, onViewAll }: RecentEventsProps) {
  const theme = useTheme();

  return (
    <View>
      <SectionHeader label="Recently" actionLabel="View Chronicle" onActionPress={onViewAll} />
      {events.length === 0 ? (
        <Text style={[styles.empty, { color: theme.inkMuted }]}>Nothing chronicled yet.</Text>
      ) : (
        events.map((e, i) => {
          const latest = i === 0;
          return (
            <View key={e.id} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: historyCategoryColor[e.category] }]} />
              <View style={styles.textBlock}>
                <Text style={[styles.year, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.eyebrow) }]}>
                  Year {e.year}
                </Text>
                <Text
                  style={[
                    styles.headline,
                    {
                      color: latest ? theme.ink : theme.inkMuted,
                      fontFamily: latest ? fontFamily.display : fontFamily.body,
                      fontSize: scaledFontSize(latest ? typeScale.body : typeScale.caption),
                    },
                  ]}
                  numberOfLines={2}
                >
                  {e.headline}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontStyle: "italic" },
  row: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  textBlock: { flex: 1, minWidth: 0 },
  year: { textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 },
  headline: { lineHeight: 20 },
});
