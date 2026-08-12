import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { NPC } from "@/domain/types";
import { useTheme } from "../../theme/useTheme";
import { scaledFontSize, spacing, typeScale } from "../../theme/theme";
import { PersonEntry } from "./PersonEntry";
import { SectionLabel } from "../SectionLabel";

interface PeopleSectionProps {
  npcs: NPC[];
  onSelect: (npcId: string) => void;
  limit?: number;
}

/** The people currently sharing the player's location — an open portrait list
 * (max `limit`), not a boxed directory. */
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
        shown.map((npc, i) => (
          <PersonEntry key={npc.id} npc={npc} onPress={() => onSelect(npc.id)} showDivider={i < shown.length - 1} />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontStyle: "italic", paddingVertical: spacing.sm },
});
