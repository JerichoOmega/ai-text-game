import React, { memo } from "react";
import { Text, StyleSheet } from "react-native";
import type { Quest } from "@/domain/types";
import { useTheme } from "../theme/useTheme";
import { scaledFontSize, typeScale } from "../theme/theme";
import { Panel } from "./Panel";
import { ObjectiveChecklist } from "./ObjectiveChecklist";

interface QuestCardProps {
  quest: Quest;
}

/**
 * Memoized on the `quest` object reference. This is safe (not just fast)
 * specifically because WorldStateManager.setQuest replaces only the
 * mutated quest's entry in the quests map — every OTHER quest keeps its
 * exact object reference across a world update. On the quest log screen,
 * that means most cards genuinely don't need to re-render when one quest
 * changes, and memo can trust the reference comparison rather than doing
 * a deep compare.
 */
export const QuestCard = memo(function QuestCard({ quest }: QuestCardProps) {
  const theme = useTheme();

  return (
    <Panel style={styles.card}>
      <Text style={[styles.title, { color: theme.ink, fontSize: scaledFontSize(typeScale.title) }]} allowFontScaling maxFontSizeMultiplier={1.6}>
        {quest.title}
      </Text>
      <Text style={[styles.summary, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.body) }]} allowFontScaling maxFontSizeMultiplier={1.6}>
        {quest.contextSummary}
      </Text>
      <ObjectiveChecklist objectives={quest.objectives.map((o) => ({ id: o.id, label: o.label, complete: o.complete }))} />
      <Text style={styles.rewardRow}>
        <Text style={[styles.reward, { color: theme.gold }]}>{quest.reward.gold} gold</Text>
        {quest.reward.reputationDelta > 0 && (
          <Text style={[styles.reward, { color: theme.forest }]}>  ·  +{quest.reward.reputationDelta} reputation</Text>
        )}
      </Text>
    </Panel>
  );
});

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  title: { fontWeight: "700", marginBottom: 6 },
  summary: { lineHeight: 21 },
  rewardRow: { marginTop: 10 },
  reward: { fontWeight: "600", fontSize: 13 },
});
