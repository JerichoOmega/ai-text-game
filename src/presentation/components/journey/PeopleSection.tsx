import React from "react";
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from "react-native";
import type { NPC } from "@/domain/types";
import { useTheme } from "../../theme/useTheme";
import { radii, scaledFontSize, spacing, typeScale } from "../../theme/theme";
import { roleLabel } from "../../npc/npcPortrait";
import { portraitForNpc } from "../../npc/shopkeeperPortraits";
import { SectionLabel } from "../SectionLabel";

interface PeopleSectionProps {
  npcs: NPC[];
  onSelect: (npcId: string) => void;
  limit?: number;
}

/**
 * The people sharing the player's location — a horizontal row of small
 * brass-ringed portrait medallions (resolved by the existing portraitForNpc
 * resolver), each opening the NPC encounter. A compact printed row, not a
 * stacked directory or a boxed card.
 */
export function PeopleSection({ npcs, onSelect, limit = 6 }: PeopleSectionProps) {
  const theme = useTheme();
  const shown = npcs.slice(0, limit);

  return (
    <View>
      <SectionLabel label="People You Encounter" />
      {shown.length === 0 ? (
        <Text style={[styles.empty, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.caption) }]}>
          No one else is here right now.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rowContent}
        >
          {shown.map((npc) => {
            const rel = npc.playerRelationship;
            const ringColor = rel >= 20 ? theme.forest : rel <= -20 ? theme.wax : theme.goldBorder;
            return (
              <Pressable
                key={npc.id}
                onPress={() => onSelect(npc.id)}
                accessibilityRole="button"
                accessibilityLabel={`Talk to ${npc.name}, ${npc.role}`}
                testID={`journey-person-${npc.id}`}
                style={({ pressed }) => [styles.medallion, { opacity: pressed ? 0.6 : 1 }]}
              >
                <View style={[styles.portraitRing, { borderColor: ringColor }]}>
                  <Image source={portraitForNpc(npc)} style={styles.portrait} resizeMode="cover" />
                </View>
                <Text style={[styles.name, { color: theme.ink }]} numberOfLines={1}>
                  {npc.name}
                </Text>
                <Text style={[styles.role, { color: theme.inkMuted }]} numberOfLines={1}>
                  {roleLabel(npc.role)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontStyle: "italic", paddingVertical: spacing.sm },
  rowContent: { gap: spacing.lg, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  medallion: { width: 72, alignItems: "center" },
  portraitRing: { width: 60, height: 60, borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth * 2, padding: 2, overflow: "hidden" },
  portrait: { width: "100%", height: "100%", borderRadius: radii.pill },
  name: { marginTop: 6, fontSize: 12, fontWeight: "600", textAlign: "center", maxWidth: 72 },
  role: { marginTop: 1, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "center", maxWidth: 72 },
});
