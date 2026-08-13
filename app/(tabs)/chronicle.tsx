import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, spacing, historyCategoryColor } from "@/presentation/theme/theme";
import { JournalTriggerButton } from "@/presentation/components/JournalTriggerButton";
import { PageTabs } from "@/presentation/components/PageTabs";
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

/** A restrained illuminated flourish between manuscript entries. */
function OrnamentDivider({ color, gold }: { color: string; gold: string }) {
  return (
    <View style={styles.divider}>
      <View style={[styles.divRule, { backgroundColor: color }]} />
      <View style={[styles.divDiamond, { backgroundColor: gold }]} />
      <View style={[styles.divRule, { backgroundColor: color }]} />
    </View>
  );
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

      <PageTabs
        tabs={[{ key: "news", label: "News" }, { key: "timeline", label: "Timeline" }]}
        active={tab}
        onChange={setTab}
        testIDPrefix="chronicle-tab"
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === "news" &&
          (newsOrder.length === 0 ? (
            <Text style={[styles.empty, { color: theme.inkMuted }]}>History hasn't been written yet.</Text>
          ) : (
            <View style={styles.leaf}>
              {newsOrder.map((entry, i) => {
                const latest = i === 0;
                const color = categoryColor(entry.category);
                return (
                  <View key={entry.id} style={styles.entry}>
                    {i > 0 && <OrnamentDivider color={theme.goldBorder} gold={theme.gold} />}
                    <Text style={[styles.meta, { color: theme.bronze }]}>
                      Year {entry.year} · {entry.category}
                    </Text>
                    <View style={styles.emblem}>
                      <Ionicons name={CATEGORY_ICON[entry.category] ?? "ellipse-outline"} size={latest ? 22 : 18} color={color} />
                    </View>
                    <Text
                      style={[
                        styles.body,
                        {
                          color: latest ? theme.ink : theme.inkMuted,
                          fontFamily: latest ? fontFamily.displayBold : fontFamily.display,
                          fontSize: scaledFontSize(latest ? typeScale.title : typeScale.body),
                          lineHeight: latest ? 28 : 24,
                        },
                      ]}
                    >
                      {entry.headline}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}

        {tab === "timeline" &&
          (byYear.length === 0 ? (
            <Text style={[styles.empty, { color: theme.inkMuted }]}>The timeline is still empty.</Text>
          ) : (
            <View style={styles.leaf}>
              {byYear.map(([year, entries], gi) => (
                <View key={year} style={styles.yearBlock}>
                  {gi > 0 && <OrnamentDivider color={theme.goldBorder} gold={theme.gold} />}
                  <Text style={[styles.year, { color: theme.gold, fontFamily: fontFamily.displayBold }]}>Year {year}</Text>
                  {entries.map((entry) => {
                    const color = categoryColor(entry.category);
                    return (
                      <View key={entry.id} style={styles.railRow}>
                        <View style={[styles.node, { backgroundColor: color }]} />
                        <Text style={[styles.railHeadline, { color: theme.ink, fontFamily: fontFamily.display }]}>{entry.headline}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "800", marginTop: 4, marginBottom: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scroll: { paddingBottom: spacing.xxl, paddingTop: spacing.sm },
  leaf: { paddingHorizontal: spacing.sm },
  empty: { fontStyle: "italic", marginTop: spacing.xl, textAlign: "center" },

  // News — centered manuscript entries
  entry: { alignItems: "center", paddingVertical: spacing.md },
  meta: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "700", textAlign: "center" },
  emblem: { marginTop: spacing.sm, marginBottom: spacing.sm, alignItems: "center", justifyContent: "center" },
  body: { textAlign: "center", paddingHorizontal: spacing.md },

  // Ornament divider
  divider: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginVertical: spacing.lg, alignSelf: "stretch" },
  divRule: { flex: 1, maxWidth: 90, height: StyleSheet.hairlineWidth, opacity: 0.7 },
  divDiamond: { width: 5, height: 5, transform: [{ rotate: "45deg" }], opacity: 0.85 },

  // Timeline
  yearBlock: { marginBottom: spacing.lg },
  year: { fontSize: 24, fontWeight: "800", letterSpacing: 1, marginBottom: spacing.md, textAlign: "center" },
  railRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  node: { width: 6, height: 6, borderRadius: 3, marginTop: 9 },
  railHeadline: { flex: 1, lineHeight: 23, fontSize: 15 },
});
