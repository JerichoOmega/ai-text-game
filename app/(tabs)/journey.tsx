import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale } from "@/presentation/theme/theme";
import { ActionButton } from "@/presentation/components/ActionButton";
import { StoryLog } from "@/presentation/components/StoryLog";
import { NPCCard } from "@/presentation/components/NPCCard";
import { StatChip } from "@/presentation/components/StatChip";
import { SectionHeader } from "@/presentation/components/SectionHeader";
import { ChronicleCard } from "@/presentation/components/ChronicleCard";
import { JourneyCard } from "@/presentation/components/JourneyCard";
import { JournalTriggerButton } from "@/presentation/components/JournalTriggerButton";
import { ScreenContainer } from "@/presentation/components/ScreenContainer";
import { routes } from "@/presentation/navigation/routes";
import { capitalize } from "@/utils/format";

/** Rough aggregate reading of kingdom stability, standing in for the
 * mockup's "World State" chip until a real political-tension system exists. */
function worldStateLabel(stability: number): { label: string; warning: boolean } {
  if (stability >= 60) return { label: "Stable", warning: false };
  if (stability >= 30) return { label: "Uneasy", warning: false };
  return { label: "Unrest", warning: true };
}

export default function JourneyScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { world, manager, loading, storyLog, advanceTime } = useWorldStore();

  const npcsHere = useMemo(() => {
    if (!world || !manager) return [];
    return manager.getNpcsInSettlement(world.player.currentSettlementId).filter((n) => n.alive);
  }, [world, manager]);

  const recentHistory = useMemo(() => {
    if (!world) return [];
    return [...world.history].sort((a, b) => b.year - a.year).slice(0, 3);
  }, [world]);

  const activeQuest = useMemo(() => {
    if (!world) return undefined;
    return Object.values(world.quests).find((q) => q.status === "active" || q.status === "available");
  }, [world]);

  const currentSettlement = world ? world.settlements[world.player.currentSettlementId] : null;
  const primaryKingdom = world ? Object.values(world.kingdoms)[0] : null;
  const worldState = primaryKingdom ? worldStateLabel(primaryKingdom.stability) : { label: "Unknown", warning: false };

  if (loading || !world) {
    return <ScreenContainer loading loadingLabel="Waking the world..." />;
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Text style={[styles.dateLine, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.caption) }]}>
              Year {world.currentDate.year} · {capitalize(world.currentDate.season)}, Day {world.currentDate.day}
            </Text>
            <JournalTriggerButton />
          </View>
          <Text
            style={[styles.location, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.hero) }]}
          >
            {currentSettlement?.name ?? "Unknown"}
          </Text>
        </View>

        <SectionHeader label="The World Today" />
        <View style={styles.statRow}>
          <StatChip icon="calendar" label="Year" value={String(world.currentDate.year)} />
          <StatChip icon="sunny" label="Season" value={capitalize(world.currentDate.season)} />
          <StatChip icon="cloud" label="Weather" value={capitalize(world.weather.current)} />
          <StatChip icon="warning" label="World State" value={worldState.label} tone={worldState.warning ? "warning" : "default"} />
        </View>

        {activeQuest && (
          <>
            <View style={styles.sectionGap} />
            <SectionHeader label="Your Current Journey" />
            <JourneyCard
              title={activeQuest.title}
              detail={activeQuest.contextSummary}
              objectives={activeQuest.objectives.map((o) => ({ id: o.id, label: o.label, complete: o.complete }))}
              onPress={() => router.push(routes.quests)}
            />
          </>
        )}

        <View style={styles.sectionGap} />
        <SectionHeader label="Latest Chronicle" actionLabel="View All" onActionPress={() => router.push(routes.chronicle)} />
        {recentHistory.length === 0 ? (
          <Text style={{ color: theme.inkMuted, fontStyle: "italic" }}>Nothing chronicled yet.</Text>
        ) : (
          recentHistory.map((entry) => (
            <ChronicleCard key={entry.id} headline={entry.headline} category={entry.category} timeLabel={`Year ${entry.year}`} />
          ))
        )}

        <View style={styles.sectionGap} />
        <SectionHeader label="People Here" />
        {npcsHere.length === 0 ? (
          <Text style={{ color: theme.inkMuted, fontStyle: "italic" }}>No one else is here right now.</Text>
        ) : (
          npcsHere.map((npc) => <NPCCard key={npc.id} npc={npc} onPress={() => router.push(routes.npc(npc.id))} />)
        )}

        {storyLog.length > 0 && (
          <>
            <View style={styles.sectionGap} />
            <SectionHeader label="Recent Happenings" />
            <View style={styles.logSection}>
              <StoryLog lines={storyLog} />
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.actionRow}>
        <ActionButton label="Rest a day" onPress={() => advanceTime(1)} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 12 },
  header: { paddingTop: 4, paddingBottom: 16 },
  headerTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateLine: { textTransform: "uppercase", letterSpacing: 1, flexShrink: 1 },
  location: { fontWeight: "800", marginTop: 4 },
  statRow: { flexDirection: "row", gap: 8, marginBottom: 4 },
  sectionGap: { height: 20 },
  logSection: { height: 140 },
  actionRow: { paddingVertical: 12 },
});
