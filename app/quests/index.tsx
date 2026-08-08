import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { QuestCard } from "@/presentation/components/QuestCard";
import { ActionButton } from "@/presentation/components/ActionButton";
import { COMBAT_OBJECTIVE_TYPES } from "@/systems/QuestSystem";

export default function QuestsScreen() {
  const theme = useTheme();
  const world = useWorldStore((s) => s.world);
  const resolveQuestBattle = useWorldStore((s) => s.resolveQuestBattle);

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
                    label="Resolve battle"
                    accessibilityHint="Fight the threat this quest asks you to clear"
                    onPress={() => resolveQuestBattle(quest.id)}
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
