import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { useTheme } from "../theme/useTheme";

const BG = require("../../../assets/images/textures/chronicle-bg.jpg");

/**
 * The shared atmosphere behind every destination: a very dark warm
 * leather/parchment texture with a heavy obsidian scrim so the grain reads as
 * a subtle premium surface (a bound chronicle cover) without ever competing
 * with foreground text. Purely decorative — always pointerEvents="none".
 */
export function ChronicleBackground() {
  const theme = useTheme();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background }]} />
      <Image source={BG} style={styles.texture} resizeMode="cover" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.background, opacity: 0.5 }]} />
      {/* A faint warm page-glow near the top so screens read as an aged leaf, not flat black. */}
      <View style={[styles.warmBand, { backgroundColor: theme.surface }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  texture: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%", opacity: 0.9 },
  warmBand: { position: "absolute", top: 0, left: 0, right: 0, height: "34%", opacity: 0.14 },
});
