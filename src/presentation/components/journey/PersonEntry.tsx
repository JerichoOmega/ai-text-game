import React, { memo } from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import type { NPC } from "@/domain/types";
import { useTheme } from "../../theme/useTheme";
import { fontFamily, radii, scaledFontSize, spacing, typeScale } from "../../theme/theme";
import { roleLabel } from "../../npc/npcPortrait";

interface PersonEntryProps {
  npc: NPC;
  onPress: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "?";
}

function standing(value: number): string {
  if (value >= 60) return "Devoted";
  if (value >= 20) return "Friendly";
  if (value > -20) return "Neutral";
  if (value > -60) return "Wary";
  return "Hostile";
}

/**
 * One person, rendered as a person rather than a database row: an initial
 * medallion gives each a distinct visual identity (no fake portraits), with a
 * quiet standing label whose tone shifts warm/cool without relying on color
 * alone (the word carries the meaning).
 */
export const PersonEntry = memo(function PersonEntry({ npc, onPress }: PersonEntryProps) {
  const theme = useTheme();
  const rel = npc.playerRelationship;
  const tone = rel >= 20 ? theme.forest : rel <= -20 ? theme.wax : theme.inkMuted;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Talk to ${npc.name}, ${npc.role}`}
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={[styles.medallion, { borderColor: theme.goldBorder, backgroundColor: theme.panel }]}>
        <Text style={[styles.initials, { color: theme.gold, fontFamily: fontFamily.displayBold }]}>{initials(npc.name)}</Text>
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
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  medallion: { width: 40, height: 40, borderRadius: radii.pill, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 15, fontWeight: "700" },
  textBlock: { flex: 1, minWidth: 0 },
  name: { fontWeight: "600" },
  role: { marginTop: 2, textTransform: "uppercase", letterSpacing: 1 },
  standing: { fontWeight: "600" },
});
