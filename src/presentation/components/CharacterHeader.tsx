import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/useTheme";
import { fontFamily, scaledFontSize, typeScale } from "../theme/theme";
import { StatBar } from "./StatBar";
import { InlineChip } from "./InlineChip";
import type { Ionicons } from "@expo/vector-icons";
import { capitalize } from "@/utils/format";

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
 * No portrait art asset exists (the mockup uses a painted character
 * illustration) — this uses a lettered roundel instead, styled with the
 * same gold-border language, rather than shipping a placeholder image or a
 * generic silhouette icon that would look unfinished. Swap in real art by
 * replacing just the `<View style={styles.portraitPlaceholder}>` block;
 * everything else (layout, bars, chips) stays the same.
 */
export function CharacterHeader({ name, level, classId, hp, maxHp, stamina, maxStamina, chips }: CharacterHeaderProps) {
  const theme = useTheme();
  const initial = name.charAt(0).toUpperCase();

  return (
    <View>
      <View style={styles.topRow}>
        <View style={[styles.portraitPlaceholder, { borderColor: theme.goldBorder, backgroundColor: theme.surfaceRaised }]}>
          <Text style={[styles.portraitInitial, { color: theme.gold, fontFamily: fontFamily.displayBold }]}>{initial}</Text>
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
  portraitPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  portraitInitial: { fontSize: 24, fontWeight: "700" },
  nameBlock: { flex: 1 },
  name: { fontWeight: "700" },
  classLine: { marginTop: 2 },
  barsBlock: { marginBottom: 10 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
});
