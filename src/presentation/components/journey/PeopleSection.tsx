import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { NPC } from "@/domain/types";
import { useTheme } from "../../theme/useTheme";
import { scaledFontSize, spacing, typeScale, eyebrowStyle } from "../../theme/theme";
import { PersonEntry } from "./PersonEntry";
import { OrnateFrame } from "./OrnateFrame";

interface PeopleSectionProps {
  npcs: NPC[];
  onSelect: (npcId: string) => void;
  onViewAll?: () => void;
  limit?: number;
}

/** Tier-3: the people currently sharing the player's location. */
export function PeopleSection({ npcs, onSelect, onViewAll, limit = 6 }: PeopleSectionProps) {
  const theme = useTheme();
  const shown = npcs.slice(0, limit);
  const remaining = npcs.length - shown.length;

  return (
    <OrnateFrame>
      <Text style={[eyebrowStyle, { color: theme.gold, marginBottom: spacing.xs }]}>People Around You</Text>
      {shown.length === 0 ? (
        <Text style={[styles.empty, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.caption) }]}>
          No one else is here right now.
        </Text>
      ) : (
        shown.map((npc, i) => (
          <PersonEntry key={npc.id} npc={npc} onPress={() => onSelect(npc.id)} showDivider={i < shown.length - 1} />
        ))
      )}
      {remaining > 0 && onViewAll ? (
        <Text
          onPress={onViewAll}
          accessibilityRole="button"
          style={[styles.viewAll, { color: theme.gold, fontSize: scaledFontSize(typeScale.caption) }]}
        >
          View all people ({npcs.length}) ›
        </Text>
      ) : null}
    </OrnateFrame>
  );
}

const styles = StyleSheet.create({
  empty: { fontStyle: "italic", paddingVertical: spacing.sm },
  viewAll: { fontWeight: "600", marginTop: spacing.md },
});
