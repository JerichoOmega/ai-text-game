import React, { memo } from "react";
import { Pressable, View, Text, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NPC } from "@/domain/types";
import { useTheme } from "../../theme/useTheme";
import { radii, scaledFontSize, spacing, typeScale } from "../../theme/theme";
import { roleLabel } from "../../npc/npcPortrait";
import { portraitForNpc } from "../../npc/shopkeeperPortraits";

interface PersonEntryProps {
  npc: NPC;
  onPress: () => void;
  showDivider: boolean;
}

function standing(value: number): string {
  if (value >= 60) return "Devoted";
  if (value >= 20) return "Friendly";
  if (value > -20) return "Neutral";
  if (value > -60) return "Wary";
  return "Hostile";
}

/**
 * A person, not a database row: a real brass-ringed portrait (resolved by the
 * existing portraitForNpc resolver — canonical art where it exists, a painted
 * role portrait otherwise), name, occupation, and a standing word whose tone
 * shifts warm/cool. The whole row opens the existing NPC screen.
 */
export const PersonEntry = memo(function PersonEntry({ npc, onPress, showDivider }: PersonEntryProps) {
  const theme = useTheme();
  const rel = npc.playerRelationship;
  const tone = rel >= 20 ? theme.forest : rel <= -20 ? theme.wax : theme.inkMuted;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Talk to ${npc.name}, ${npc.role}`}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: theme.border, borderBottomWidth: showDivider ? StyleSheet.hairlineWidth : 0, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={[styles.portraitRing, { borderColor: theme.goldBorder }]}>
        <Image source={portraitForNpc(npc)} style={styles.portrait} resizeMode="cover" />
      </View>
      <View style={styles.textBlock}>
        <Text style={[styles.name, { color: theme.ink, fontSize: scaledFontSize(typeScale.body) }]} numberOfLines={1}>
          {npc.name}
        </Text>
        <Text style={[styles.role, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.eyebrow) }]} numberOfLines={1}>
          {roleLabel(npc.role)}
          {!npc.alive ? " · deceased" : ""}
        </Text>
      </View>
      <Text style={[styles.standing, { color: tone, fontSize: scaledFontSize(typeScale.caption) }]}>{standing(rel)}</Text>
      <Ionicons name="chevron-forward" size={15} color={theme.bronze} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md },
  portraitRing: { width: 46, height: 46, borderRadius: radii.pill, borderWidth: 1, padding: 2, overflow: "hidden" },
  portrait: { width: "100%", height: "100%", borderRadius: radii.pill },
  textBlock: { flex: 1, minWidth: 0 },
  name: { fontWeight: "600" },
  role: { marginTop: 2, textTransform: "uppercase", letterSpacing: 1 },
  standing: { fontWeight: "600" },
});
