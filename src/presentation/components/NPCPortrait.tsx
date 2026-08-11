import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { useTheme } from "../theme/useTheme";
import { npcPortrait } from "../npc/npcPortrait";
import type { NpcRole } from "@/domain/types";

/**
 * The dominant element of the conversation screen: a large NPC portrait
 * that fills its container, with a bottom scrim so the nameplate/dialogue
 * overlaid beneath it stay readable. Portrait art is resolved by role via
 * npcPortrait (placeholder scheme until per-NPC art exists).
 */
export function NPCPortrait({ role, name }: { role: NpcRole; name: string }) {
  const theme = useTheme();
  return (
    <View style={styles.wrap} accessible accessibilityLabel={`Portrait of ${name}`}>
      <Image source={npcPortrait(role)} style={styles.image} resizeMode="cover" />
      <View style={[styles.scrim, { backgroundColor: theme.background }]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "45%", opacity: 0.72 },
});
