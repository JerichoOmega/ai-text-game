import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { QuestCard } from "@/presentation/components/QuestCard";
import { ActionButton } from "@/presentation/components/ActionButton";
import { resolveQuestAffordance } from "@/presentation/quests/questAffordance";
import { routes } from "@/presentation/navigation/routes";

export default function QuestsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const world = useWorldStore((s) => s.world);
  const beginQuestBattle = useWorldStore((s) => s.beginQuestBattle);
  const travelTo = useWorldStore((s) => s.travelTo);

  const startBattle = (questId: string) => {
    if (beginQuestBattle(questId)) router.push(routes.combat);
  };

  const quests = world
    ? Object.values(world.quests).filter((q) => q.status === "available" || q.status === "active")
    : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} testID="quest-list">
        {quests.length === 0 && (
          <Text style={{ color: theme.inkMuted, fontStyle: "italic", marginTop: 24, textAlign: "center" }}>
            No quests right now. Rest a day and see what the world brings.
          </Text>
        )}
        {world &&
          quests.map((quest) => {
            const affordance = resolveQuestAffordance(quest, world);
            return (
              <View key={quest.id} testID={`quest-item-${quest.id}`}>
                <QuestCard quest={quest} />

                {affordance.kind === "combat" && (
                  <View style={styles.actionWrap} testID={`quest-resolve-wrap-${quest.id}`}>
                    <ActionButton
                      label="Enter battle"
                      accessibilityHint="Fight the threat this quest asks you to clear"
                      onPress={() => startBattle(quest.id)}
                    />
                  </View>
                )}

                {affordance.kind === "talk" && (
                  <View style={styles.actionWrap} testID={`quest-talk-wrap-${quest.id}`}>
                    <Text style={[styles.targetLine, { color: theme.inkMuted }]} testID={`quest-talk-target-${quest.id}`}>
                      Speak with {affordance.npcName}
                      {affordance.npcHere ? " (here)" : ` in ${affordance.npcSettlementName ?? "another town"}`}
                    </Text>
                    {affordance.npcHere ? (
                      <ActionButton
                        label={`Talk to ${affordance.npcName}`}
                        accessibilityHint="Open this conversation to satisfy the quest"
                        onPress={() => router.push(routes.npc(affordance.npcId))}
                      />
                    ) : (
                      <ActionButton
                        label={`Travel to ${affordance.npcSettlementName ?? "them"}`}
                        accessibilityHint="Travel to where this person is, then speak with them"
                        onPress={() => {
                          void travelTo(affordance.npcSettlementId);
                        }}
                      />
                    )}
                  </View>
                )}

                {affordance.kind === "deliver" && (
                  <View style={styles.actionWrap} testID={`quest-deliver-wrap-${quest.id}`}>
                    <Text style={[styles.targetLine, { color: theme.inkMuted }]} testID={`quest-deliver-target-${quest.id}`}>
                      Deliver to {affordance.settlementName}
                      {affordance.atDestination ? " (you're here)" : ""}
                    </Text>
                    <ActionButton
                      label={affordance.atDestination ? `Deliver in ${affordance.settlementName}` : `Travel to ${affordance.settlementName}`}
                      accessibilityHint="Arrive at the destination to complete the delivery"
                      onPress={() => {
                        void travelTo(affordance.settlementId);
                      }}
                    />
                  </View>
                )}
              </View>
            );
          })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  actionWrap: { marginTop: -4, marginBottom: 16 },
  targetLine: { fontSize: 13, fontStyle: "italic", marginBottom: 8 },
});
