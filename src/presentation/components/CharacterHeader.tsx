import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { useTheme } from "../theme/useTheme";
import { fontFamily, scaledFontSize, typeScale } from "../theme/theme";
import { StatBar } from "./StatBar";
import { InlineChip } from "./InlineChip";
import type { Ionicons } from "@expo/vector-icons";
import { capitalize } from "@/utils/format";

const HERO_PORTRAIT = require("../../../assets/images/hero-portrait.jpg");

interface CharacterHeaderProps {
  name: string;
  level: number;
  classId: string;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  chips: Array<{ icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }>;
}

/**
 * Painted hero portrait art (Design Bible Character screen). The lettered
 * initial remains as an accessibility label and a graceful fallback if the
 * image ever fails to load. Swap the portrait source to a per-class or
 * per-character asset later; layout is unchanged.
 */
export function CharacterHeader({ name, level, classId, hp, maxHp, stamina, maxStamina, chips }: CharacterHeaderProps) {
  const theme = useTheme();
  const initial = name.charAt(0).toUpperCase();

  return (
    <View>
      <View style={styles.topRow}>
        <View
          style={[styles.portraitFrame, { borderColor: theme.goldBorder, backgroundColor: theme.surfaceRaised }]}
          accessible
          accessibilityLabel={`Portrait of ${name}`}
        >
          <Text style={[styles.portraitInitial, { color: theme.gold, fontFamily: fontFamily.displayBold }]} accessibilityElementsHidden importantForAccessibility="no">
            {initial}
          </Text>
          <Image source={HERO_PORTRAIT} style={styles.portraitImage} resizeMode="cover" />
        </View>
        <View style={styles.nameBlock}>
          <Text
            style={[styles.name, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.title) }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text style={[styles.classLine, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.caption) }]}>
            Level {level} · {capitalize(classId)}
          </Text>
        </View>
      </View>

      <View style={styles.barsBlock}>
        <StatBar label="Health" current={hp} max={maxHp} color={theme.wax} />
        <StatBar label="Stamina" current={stamina} max={maxStamina} color={theme.forest} />
      </View>

      {chips.length > 0 && (
        <View style={styles.chipRow}>
          {chips.map((chip) => (
            <InlineChip key={chip.label} icon={chip.icon} label={chip.label} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  portraitFrame: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  portraitImage: { position: "absolute", width: "100%", height: "100%" },
  portraitInitial: { fontSize: 24, fontWeight: "700" },
  nameBlock: { flex: 1 },
  name: { fontWeight: "700" },
  classLine: { marginTop: 2 },
  barsBlock: { marginBottom: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
