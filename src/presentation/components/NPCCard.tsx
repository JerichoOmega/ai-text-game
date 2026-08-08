import React, { memo } from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import type { NPC } from "@/domain/types";
import { useTheme } from "../theme/useTheme";
import { scaledFontSize, typeScale, radii } from "../theme/theme";

interface NPCCardProps {
  npc: NPC;
  onPress: () => void;
}

function relationshipLabel(value: number): string {
  if (value >= 60) return "Devoted";
  if (value >= 20) return "Friendly";
  if (value > -20) return "Neutral";
  if (value > -60) return "Wary";
  return "Hostile";
}

/**
 * Memoized: renders once per NPC in "People Here" lists, which re-render
 * whenever the world store updates for ANY reason (time advancing,
 * talking to a different NPC, etc.) — most of those updates don't change
 * this particular NPC's props, so a plain re-render would be wasted work
 * on every card in the list for every unrelated state change.
 */
export const NPCCard = memo(function NPCCard({ npc, onPress }: NPCCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Talk to ${npc.name}, ${npc.role}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.panel, borderColor: theme.goldBorder, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={styles.textBlock}>
        <Text style={[styles.name, { color: theme.ink, fontSize: scaledFontSize(typeScale.title) }]} allowFontScaling maxFontSizeMultiplier={1.6}>
          {npc.name}
        </Text>
        <Text style={[styles.role, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.caption) }]} allowFontScaling maxFontSizeMultiplier={1.6}>
          {npc.role}
          {!npc.alive ? " · deceased" : ""}
        </Text>
      </View>
      <Text style={[styles.relationship, { color: theme.gold, fontSize: scaledFontSize(typeScale.caption) }]} allowFontScaling maxFontSizeMultiplier={1.6}>
        {relationshipLabel(npc.playerRelationship)}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    minHeight: 56,
  },
  textBlock: { flexShrink: 1 },
  name: { fontWeight: "600" },
  role: { marginTop: 2, textTransform: "capitalize" },
  relationship: { fontWeight: "600" },
});
