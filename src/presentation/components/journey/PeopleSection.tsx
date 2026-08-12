import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { NPC } from "@/domain/types";
import { useTheme } from "../../theme/useTheme";
import { scaledFontSize, spacing, typeScale, eyebrowStyle } from "../../theme/theme";
import { PersonEntry } from "./PersonEntry";

interface PeopleSectionProps {
  npcs: NPC[];
  onSelect: (npcId: string) => void;
}

/** Tier-3: the people currently sharing the player's location. */
export function PeopleSection({ npcs, onSelect }: PeopleSectionProps) {
  const theme = useTheme();
  return (
    <View>
      <Text style={[eyebrowStyle, { color: theme.inkMuted, marginBottom: spacing.xs }]}>People Around You</Text>
      {npcs.length === 0 ? (
        <Text style={[styles.empty, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.caption) }]}>
          No one else is here right now.
        </Text>
      ) : (
        npcs.map((npc) => <PersonEntry key={npc.id} npc={npc} onPress={() => onSelect(npc.id)} />)
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontStyle: "italic", paddingVertical: spacing.sm },
});
