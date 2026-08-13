import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useWorldStore } from "@/state/useWorldStore";
import { ScreenContainer } from "@/presentation/components/ScreenContainer";
import { JournalTriggerButton } from "@/presentation/components/JournalTriggerButton";
import { LocationBanner } from "@/presentation/components/journey/LocationBanner";
import { getLocationArtwork } from "@/presentation/components/journey/locationArtwork";
import { CurrentJourney } from "@/presentation/components/journey/CurrentJourney";
import { PeopleSection } from "@/presentation/components/journey/PeopleSection";
import { RecentEvents } from "@/presentation/components/journey/RecentEvents";
import { AdvanceDayButton } from "@/presentation/components/journey/AdvanceDayButton";
import { resolveQuestAffordance } from "@/presentation/quests/questAffordance";
import { routes } from "@/presentation/navigation/routes";
import { spacing } from "@/presentation/theme/theme";
import { capitalize } from "@/utils/format";

const WEATHER: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  clear: { label: "Clear skies", icon: "sunny-outline" },
  sunny: { label: "Bright sun", icon: "sunny-outline" },
  cloudy: { label: "Overcast", icon: "cloud-outline" },
  overcast: { label: "Heavy cloud", icon: "cloud-outline" },
  rain: { label: "Steady rain", icon: "rainy-outline" },
  rainy: { label: "Steady rain", icon: "rainy-outline" },
  storm: { label: "A gathering storm", icon: "thunderstorm-outline" },
  snow: { label: "Falling snow", icon: "snow-outline" },
  fog: { label: "Thick fog", icon: "cloud-outline" },
  windy: { label: "A restless wind", icon: "leaf-outline" },
  heatwave: { label: "Oppressive heat", icon: "sunny-outline" },
};

function worldStateLabel(stability: number): { label: string; warning: boolean } {
  if (stability >= 60) return { label: "Realm stable", warning: false };
  if (stability >= 30) return { label: "Realm uneasy", warning: false };
  return { label: "Realm in unrest", warning: true };
}

export default function JourneyScreen() {
  const router = useRouter();
  const { world, manager, loading, advanceTime } = useWorldStore();
  const { width } = useWindowDimensions();
  const wide = width >= 1024;
  const contentWidth = wide ? 720 : width;
  const imageWidth = Math.max(320, contentWidth - spacing.lg * 2);

  const npcsHere = useMemo(() => {
    if (!world || !manager) return [];
    return manager.getNpcsInSettlement(world.player.currentSettlementId).filter((n) => n.alive);
  }, [world, manager]);

  const recentEvents = useMemo(() => {
    if (!world) return [];
    // Only `year` is authoritative temporal data; tie-break by insertion index
    // (later-appended = newer) for a deterministic newest-first feed.
    return world.history
      .map((e, index) => ({ e, index }))
      .sort((a, b) => b.e.year - a.e.year || b.index - a.index)
      .slice(0, 2)
      .map(({ e }) => ({ id: e.id, headline: e.headline, category: e.category, year: e.year }));
  }, [world]);

  const activeQuest = useMemo(() => {
    if (!world) return undefined;
    return Object.values(world.quests).find((q) => q.status === "active" || q.status === "available");
  }, [world]);

  if (loading || !world) {
    return <ScreenContainer loading loadingLabel="Waking the world..." />;
  }

  const currentSettlement = world.settlements[world.player.currentSettlementId];
  const kingdom = Object.values(world.kingdoms)[0];
  const status = kingdom ? worldStateLabel(kingdom.stability) : { label: "The realm's fate is unknown", warning: false };
  const weather = WEATHER[world.weather.current.toLowerCase()] ?? { label: capitalize(world.weather.current), icon: "partly-sunny-outline" as const };

  const actionLabel = (() => {
    if (!activeQuest) return "Review your journey";
    const a = resolveQuestAffordance(activeQuest, world);
    switch (a.kind) {
      case "combat":
        return "Continue Journey";
      case "talk":
        return a.npcHere ? `Speak with ${a.npcName}` : `Travel to ${a.npcSettlementName ?? "them"}`;
      case "deliver":
        return a.atDestination ? `Deliver in ${a.settlementName}` : `Travel to ${a.settlementName}`;
      default:
        return "Continue Journey";
    }
  })();

  const onJourneyAction = () => {
    if (activeQuest) {
      const a = resolveQuestAffordance(activeQuest, world);
      if (a.kind === "talk" && a.npcHere) {
        router.push(routes.npc(a.npcId));
        return;
      }
    }
    router.push(routes.quests);
  };

  return (
    <ScreenContainer>
      <View style={styles.topRow}>
        <JournalTriggerButton />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.page, { maxWidth: contentWidth }]}>
          <LocationBanner
            locationName={currentSettlement?.name ?? "The Wilds"}
            dateLabel={`${capitalize(world.currentDate.season)} · Day ${world.currentDate.day} · Year ${world.currentDate.year}`}
            weatherLabel={weather.label}
            weatherIcon={weather.icon}
            statusLabel={status.label}
            statusWarning={status.warning}
            height={wide ? 300 : 240}
            imageWidth={imageWidth}
            artworkSource={getLocationArtwork(currentSettlement)}
          />

          {activeQuest ? (
            <View style={styles.chapterGap}>
              <CurrentJourney
                title={activeQuest.title}
                summary={activeQuest.contextSummary}
                objectives={activeQuest.objectives.map((o) => ({ id: o.id, label: o.label, complete: o.complete }))}
                actionLabel={actionLabel}
                onPress={onJourneyAction}
              />
            </View>
          ) : null}

          <View style={styles.peopleGap}>
            <PeopleSection npcs={npcsHere} onSelect={(id) => router.push(routes.npc(id))} limit={wide ? 8 : 6} />
          </View>

          <View style={styles.eventsGap}>
            <RecentEvents events={recentEvents} onViewAll={() => router.push(routes.chronicle)} />
          </View>

          <View style={styles.advanceGap}>
            <AdvanceDayButton onPress={() => advanceTime(1)} />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", paddingTop: spacing.sm, paddingBottom: spacing.xs },
  scroll: { paddingBottom: spacing.xl, alignItems: "center" },
  page: { width: "100%", alignSelf: "center" },
  chapterGap: { marginTop: spacing.xl },
  peopleGap: { marginTop: spacing.xl },
  eventsGap: { marginTop: spacing.xl },
  advanceGap: { marginTop: spacing.xxl },
});
