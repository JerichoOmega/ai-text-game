import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { QuestCard } from "@/presentation/components/QuestCard";
import { ActionButton } from "@/presentation/components/ActionButton";
import { COMBAT_OBJECTIVE_TYPES } from "@/systems/QuestSystem";
import { routes } from "@/presentation/navigation/routes";

export default function QuestsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const world = useWorldStore((s) => s.world);
  const beginQuestBattle = useWorldStore((s) => s.beginQuestBattle);

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
        {quests.map((quest) => {
          const battleObjective = quest.objectives.find((o) => !o.complete && COMBAT_OBJECTIVE_TYPES.has(o.type));
          return (
            <View key={quest.id} testID={`quest-item-${quest.id}`}>
              <QuestCard quest={quest} />
              {battleObjective && (
                <View style={styles.actionWrap} testID={`quest-resolve-wrap-${quest.id}`}>
                  <ActionButton
                    label="Enter battle"
                    accessibilityHint="Fight the threat this quest asks you to clear"
                    onPress={() => startBattle(quest.id)}
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
});
