import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, radii } from "@/presentation/theme/theme";
import { ChronicleCard } from "@/presentation/components/ChronicleCard";
import { JournalTriggerButton } from "@/presentation/components/JournalTriggerButton";
import { ScreenContainer } from "@/presentation/components/ScreenContainer";

type ChronicleTab = "timeline" | "news";

/**
 * The mockup's Timeline view renders events on a connecting vertical rail
 * (icon nodes linked by a line). That's a nice piece of polish but purely
 * visual — deferred in favor of getting both real views (grouped-by-year
 * vs. recency-ordered) working over the actual HistoryLog data first. The
 * rail is a follow-up to this component, not a different data source.
 */
export default function ChronicleScreen() {
  const theme = useTheme();
  const world = useWorldStore((s) => s.world);
  const [tab, setTab] = useState<ChronicleTab>("news");

  const byYear = useMemo(() => {
    if (!world) return [];
    const groups = new Map<number, typeof world.history>();
    for (const entry of world.history) {
      const list = groups.get(entry.year) ?? [];
      list.push(entry);
      groups.set(entry.year, list);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
  }, [world]);

  const newsOrder = useMemo(() => {
    if (!world) return [];
    return [...world.history].sort((a, b) => b.year - a.year);
  }, [world]);

  // Previously this screen had no loading gate at all — during the brief
  // world-loading window it would silently show "History hasn't been
  // written yet," which reads as "no history exists" rather than "still
  // loading," a real (if minor) honesty gap. ScreenContainer's `loading`
  // prop fixes this as a side effect of the systemic migration, not a
  // separate change.
  if (!world) {
    return <ScreenContainer loading loadingLabel="Opening the chronicle..." />;
  }

  return (
    <ScreenContainer>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.display) }]}>
          Chronicle
        </Text>
        <JournalTriggerButton />
      </View>

      <View style={[styles.tabRow, { borderColor: theme.goldBorder }]}>
        {(["news", "timeline"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tabButton, tab === t && { backgroundColor: theme.accent }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t }}
          >
            <Text style={[styles.tabLabel, { color: tab === t ? theme.background : theme.inkMuted }]}>
              {t === "news" ? "News" : "Timeline"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {tab === "news" &&
          (newsOrder.length === 0 ? (
            <Text style={{ color: theme.inkMuted, fontStyle: "italic", marginTop: 24, textAlign: "center" }}>
              History hasn't been written yet.
            </Text>
          ) : (
            newsOrder.map((entry) => (
              <ChronicleCard key={entry.id} headline={entry.headline} category={entry.category} timeLabel={`Year ${entry.year}`} />
            ))
          ))}

        {tab === "timeline" &&
          byYear.map(([year, entries]) => (
            <View key={year} style={styles.yearBlock}>
              <Text style={[styles.year, { color: theme.gold }]}>Year {year}</Text>
              {entries.map((entry) => (
                <ChronicleCard key={entry.id} headline={entry.headline} category={entry.category} />
              ))}
            </View>
          ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "800", marginTop: 4, marginBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tabRow: {
    flexDirection: "row",
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 3,
    marginBottom: 16,
  },
  tabButton: { flex: 1, paddingVertical: 8, borderRadius: radii.sm, alignItems: "center" },
  tabLabel: { fontWeight: "700", fontSize: 13 },
  scrollContent: { paddingBottom: 24 },
  yearBlock: { marginBottom: 16 },
  year: { fontSize: 18, fontWeight: "800", marginBottom: 8 },
});
