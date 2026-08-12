import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, radii, spacing, historyCategoryColor } from "@/presentation/theme/theme";
import { JournalTriggerButton } from "@/presentation/components/JournalTriggerButton";
import { ScreenContainer } from "@/presentation/components/ScreenContainer";

type ChronicleTab = "news" | "timeline";

const CATEGORY_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  political: "shield-half-outline",
  military: "flame-outline",
  economic: "cash-outline",
  natural: "leaf-outline",
  personal: "person-outline",
};

function categoryColor(category: keyof typeof historyCategoryColor): string {
  return historyCategoryColor[category] ?? historyCategoryColor.political;
}

export default function ChronicleScreen() {
  const theme = useTheme();
  const world = useWorldStore((s) => s.world);
  const [tab, setTab] = useState<ChronicleTab>("news");

  const byYear = useMemo(() => {
    if (!world) return [];
    const groups = new Map<number, typeof world.history>();
    world.history.forEach((entry) => {
      const list = groups.get(entry.year) ?? [];
      list.push(entry);
      groups.set(entry.year, list);
    });
    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
  }, [world]);

  const newsOrder = useMemo(() => {
    if (!world) return [];
    return world.history
      .map((e, index) => ({ e, index }))
      .sort((a, b) => b.e.year - a.e.year || b.index - a.index)
      .map(({ e }) => e);
  }, [world]);

  if (!world) return <ScreenContainer loading loadingLabel="Opening the chronicle..." />;

  return (
    <ScreenContainer>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.display) }]}>
          Chronicle
        </Text>
        <JournalTriggerButton />
      </View>

      <View style={[styles.segment, { borderColor: theme.goldBorder }]}>
        {(["news", "timeline"] as const).map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              testID={`chronicle-tab-${t}`}
              style={[styles.segmentBtn, active && { backgroundColor: theme.surfaceRaised }]}
            >
              <Text style={[styles.segmentLabel, { color: active ? theme.gold : theme.inkMuted }]}>{t === "news" ? "News" : "Timeline"}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === "news" &&
          (newsOrder.length === 0 ? (
            <Text style={[styles.empty, { color: theme.inkMuted }]}>History hasn't been written yet.</Text>
          ) : (
            newsOrder.map((entry, i) => {
              const latest = i === 0;
              const color = categoryColor(entry.category);
              return (
                <View
                  key={entry.id}
                  style={[styles.newsRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}
                >
                  <View style={[styles.sigil, { borderColor: color }]}>
                    <Ionicons name={CATEGORY_ICON[entry.category] ?? "ellipse-outline"} size={latest ? 18 : 15} color={color} />
                  </View>
                  <View style={styles.newsText}>
                    <Text style={[styles.metaLine, { color: theme.bronze }]}>
                      Year {entry.year} · {entry.category}
                    </Text>
                    <Text
                      style={[
                        styles.headline,
                        {
                          color: latest ? theme.ink : theme.inkMuted,
                          fontFamily: latest ? fontFamily.display : fontFamily.body,
                          fontSize: scaledFontSize(latest ? typeScale.title : typeScale.body),
                        },
                      ]}
                    >
                      {entry.headline}
                    </Text>
                  </View>
                </View>
              );
            })
          ))}

        {tab === "timeline" &&
          (byYear.length === 0 ? (
            <Text style={[styles.empty, { color: theme.inkMuted }]}>The timeline is still empty.</Text>
          ) : (
            byYear.map(([year, entries]) => (
              <View key={year} style={styles.yearBlock}>
                <Text style={[styles.year, { color: theme.gold, fontFamily: fontFamily.displayBold }]}>Year {year}</Text>
                <View style={[styles.rail, { borderLeftColor: theme.goldBorder }]}>
                  {entries.map((entry) => {
                    const color = categoryColor(entry.category);
                    return (
                      <View key={entry.id} style={styles.railRow}>
                        <View style={[styles.node, { backgroundColor: theme.background, borderColor: color }]} />
                        <Text style={[styles.railHeadline, { color: theme.ink }]}>{entry.headline}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "800", marginTop: 4, marginBottom: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  segment: { flexDirection: "row", borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.sm, padding: 3, marginBottom: spacing.lg },
  segmentBtn: { flex: 1, paddingVertical: 9, borderRadius: radii.xs, alignItems: "center" },
  segmentLabel: { fontWeight: "700", fontSize: 13, letterSpacing: 0.5 },
  scroll: { paddingBottom: spacing.xxl },
  empty: { fontStyle: "italic", marginTop: spacing.xl, textAlign: "center" },
  // News
  newsRow: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
  sigil: { width: 34, height: 34, borderRadius: radii.sm, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 2, backgroundColor: "rgba(0,0,0,0.25)" },
  newsText: { flex: 1, minWidth: 0 },
  metaLine: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: "700", marginBottom: 3 },
  headline: { lineHeight: 22 },
  // Timeline
  yearBlock: { marginBottom: spacing.lg },
  year: { fontSize: 22, fontWeight: "800", letterSpacing: 1, marginBottom: spacing.sm },
  rail: { borderLeftWidth: StyleSheet.hairlineWidth, paddingLeft: spacing.lg, marginLeft: spacing.sm },
  railRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingVertical: spacing.sm },
  node: { width: 9, height: 9, borderRadius: 5, borderWidth: 2, marginTop: 5, marginLeft: -(spacing.lg + 4) },
  railHeadline: { flex: 1, lineHeight: 20 },
});
