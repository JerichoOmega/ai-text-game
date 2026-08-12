import React, { useMemo } from "react";
import { View, StyleSheet, ScrollView, useWindowDimensions } from "react-native";
import { useRouter } from "expo-router";
import { useWorldStore } from "@/state/useWorldStore";
import { ScreenContainer } from "@/presentation/components/ScreenContainer";
import { LocationHeader } from "@/presentation/components/journey/LocationHeader";
import { LocationScene } from "@/presentation/components/journey/LocationScene";
import { CurrentJourney } from "@/presentation/components/journey/CurrentJourney";
import { PeopleSection } from "@/presentation/components/journey/PeopleSection";
import { RecentEvents } from "@/presentation/components/journey/RecentEvents";
import { AdvanceDayButton } from "@/presentation/components/journey/AdvanceDayButton";
import { resolveQuestAffordance } from "@/presentation/quests/questAffordance";
import { routes } from "@/presentation/navigation/routes";
import { spacing } from "@/presentation/theme/theme";
import { capitalize } from "@/utils/format";

/** Coarse political-stability read, standing in for a full tension system. */
function worldStateLabel(stability: number): { label: string; warning: boolean } {
  if (stability >= 60) return { label: "The realm is stable", warning: false };
  if (stability >= 30) return { label: "The realm is uneasy", warning: false };
  return { label: "The realm is in unrest", warning: true };
}

export default function JourneyScreen() {
  const router = useRouter();
  const { world, manager, loading, advanceTime } = useWorldStore();
  const { width } = useWindowDimensions();
  const wide = width >= 1024;

  const npcsHere = useMemo(() => {
    if (!world || !manager) return [];
    return manager.getNpcsInSettlement(world.player.currentSettlementId).filter((n) => n.alive);
  }, [world, manager]);

  const recentEvents = useMemo(() => {
    if (!world) return [];
    return [...world.history]
      .sort((a, b) => b.year - a.year)
      .slice(0, 3)
      .map((e) => ({ id: e.id, headline: e.headline, category: e.category, year: e.year }));
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

  const actionHint = (() => {
    if (!activeQuest) return "";
    const a = resolveQuestAffordance(activeQuest, world);
    switch (a.kind) {
      case "combat":
        return "Battle awaits — open journey";
      case "talk":
        return a.npcHere ? `Speak with ${a.npcName}` : `Travel to ${a.npcSettlementName ?? "them"}`;
      case "deliver":
        return a.atDestination ? `Deliver in ${a.settlementName}` : `Travel to ${a.settlementName}`;
      default:
        return "Review your journey";
    }
  })();

  const currentJourney = activeQuest ? (
    <CurrentJourney
      title={activeQuest.title}
      summary={activeQuest.contextSummary}
      objectives={activeQuest.objectives.map((o) => ({ id: o.id, label: o.label, complete: o.complete }))}
      actionHint={actionHint}
      onPress={() => router.push(routes.quests)}
    />
  ) : null;

  const people = <PeopleSection npcs={npcsHere} onSelect={(id) => router.push(routes.npc(id))} />;
  const events = <RecentEvents events={recentEvents} onViewAll={() => router.push(routes.chronicle)} />;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LocationHeader
          locationName={currentSettlement?.name ?? "Unknown"}
          dateLabel={`${capitalize(world.currentDate.season)} · Day ${world.currentDate.day} · Year ${world.currentDate.year}`}
          statusLabel={status.label}
          statusWarning={status.warning}
        />
        <LocationScene locationName={currentSettlement?.name ?? "the wilds"} weather={world.weather.current} compact={wide} />

        {wide ? (
          <View style={styles.columns}>
            <View style={styles.primaryCol}>
              {currentJourney}
              <View style={styles.blockGap}>{events}</View>
            </View>
            <View style={styles.secondaryCol}>{people}</View>
          </View>
        ) : (
          <>
            {currentJourney ? <View style={styles.blockGap}>{currentJourney}</View> : null}
            <View style={styles.blockGap}>{people}</View>
            <View style={styles.blockGap}>{events}</View>
          </>
        )}
      </ScrollView>

      <View style={styles.actionBar}>
        <AdvanceDayButton onPress={() => advanceTime(1)} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.lg },
  blockGap: { marginTop: spacing.xl },
  columns: { flexDirection: "row", gap: spacing.xxl, marginTop: spacing.xl },
  primaryCol: { flex: 2, minWidth: 0 },
  secondaryCol: { flex: 1, minWidth: 0 },
  actionBar: { paddingVertical: spacing.md },
});
