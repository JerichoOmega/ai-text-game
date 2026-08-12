import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/useTheme";
import { fontFamily, radii, scaledFontSize, spacing, typeScale, eyebrowStyle, historyCategoryColor } from "../../theme/theme";

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
 * Tier-4: a compact living chronicle. The newest entry is emphasized (serif,
 * brighter, a brass-ringed category sigil); older ones recede. "View Chronicle"
 * keeps the full log a tap away via the existing route.
 */
export function RecentEvents({ events, onViewAll }: RecentEventsProps) {
  const theme = useTheme();

  return (
    <View>
      <Text style={[eyebrowStyle, { color: theme.gold, marginBottom: spacing.sm }]}>Recent Events</Text>
      <View style={[styles.feed, { borderLeftColor: theme.goldBorder }]}>
        {events.length === 0 ? (
          <Text style={[styles.empty, { color: theme.inkMuted }]}>Nothing chronicled yet.</Text>
        ) : (
          events.map((e, i) => {
            const latest = i === 0;
            const color = historyCategoryColor[e.category];
            return (
              <View key={e.id} style={[styles.row, i > 0 && { borderTopColor: theme.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, marginTop: spacing.md }]}>
                <View style={[styles.sigil, { borderColor: color, backgroundColor: "rgba(0,0,0,0.25)" }]}>
                  <Ionicons name={CATEGORY_ICON[e.category] ?? "ellipse-outline"} size={14} color={color} />
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
          })
        )}
        <Text
          onPress={onViewAll}
          accessibilityRole="button"
          style={[styles.viewAll, { color: theme.gold, fontSize: scaledFontSize(typeScale.caption) }]}
        >
          View Chronicle ›
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  feed: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: spacing.md },
  empty: { fontStyle: "italic" },
  row: { flexDirection: "row", gap: spacing.md },
  sigil: { width: 30, height: 30, borderRadius: radii.sm, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 2 },
  textBlock: { flex: 1, minWidth: 0 },
  year: { textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 },
  headline: { lineHeight: 20 },
  viewAll: { fontWeight: "600", marginTop: spacing.md, textAlign: "right" },
});
