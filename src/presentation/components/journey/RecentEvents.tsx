import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/useTheme";
import { fontFamily, radii, scaledFontSize, spacing, typeScale, historyCategoryColor } from "../../theme/theme";
import { SectionLabel } from "../SectionLabel";

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

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  political: "shield-half-outline",
  military: "flame-outline",
  economic: "cash-outline",
  natural: "leaf-outline",
  personal: "person-outline",
};

/**
 * A compact living chronicle: the newest entry is emphasized (serif, brighter,
 * a brass-ringed sigil); older ones recede. The section link opens the full
 * Chronicle. Rendered as an open feed on a thin rail, not a boxed card.
 */
export function RecentEvents({ events, onViewAll }: RecentEventsProps) {
  const theme = useTheme();

  return (
    <View>
      <SectionLabel label="Recent Events" actionLabel="View Chronicle" onAction={onViewAll} />
      {events.length === 0 ? (
        <Text style={[styles.empty, { color: theme.inkMuted }]}>Nothing chronicled yet.</Text>
      ) : (
        <View style={[styles.feed, { borderLeftColor: theme.goldBorder }]}>
          {events.map((e, i) => {
            const latest = i === 0;
            const color = historyCategoryColor[e.category];
            return (
              <View key={e.id} style={[styles.row, i > 0 && { marginTop: spacing.md }]}>
                <View style={[styles.sigil, { borderColor: color, backgroundColor: "rgba(0,0,0,0.25)" }]}>
                  <Ionicons name={CATEGORY_ICON[e.category] ?? "ellipse-outline"} size={13} color={color} />
                </View>
                <View style={styles.textBlock}>
                  <Text style={[styles.year, { color: theme.bronze, fontSize: scaledFontSize(typeScale.eyebrow) }]}>Year {e.year}</Text>
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
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  feed: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: spacing.md },
  empty: { fontStyle: "italic" },
  row: { flexDirection: "row", gap: spacing.md },
  sigil: { width: 28, height: 28, borderRadius: radii.sm, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 2 },
  textBlock: { flex: 1, minWidth: 0 },
  year: { textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 },
  headline: { lineHeight: 20 },
});
