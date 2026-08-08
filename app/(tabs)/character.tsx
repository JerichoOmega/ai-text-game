import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { scaledFontSize, typeScale, radii, iconSize } from "@/presentation/theme/theme";
import { Panel } from "@/presentation/components/Panel";
import { SectionHeader } from "@/presentation/components/SectionHeader";
import { StatBar } from "@/presentation/components/StatBar";
import { CharacterHeader } from "@/presentation/components/CharacterHeader";
import { JournalTriggerButton } from "@/presentation/components/JournalTriggerButton";
import { ScreenContainer } from "@/presentation/components/ScreenContainer";
import { capitalize } from "@/utils/format";
import type { PlayerStats } from "@/domain/types";

const STAT_LABELS: Record<keyof PlayerStats, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

const EQUIPMENT_SLOTS: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string }> = [
  { icon: "flash", label: "Weapon" },
  { icon: "shield", label: "Shield" },
  { icon: "body", label: "Armor" },
  { icon: "footsteps", label: "Boots" },
];

export default function CharacterScreen() {
  const theme = useTheme();
  const world = useWorldStore((s) => s.world);

  if (!world) return <ScreenContainer loading loadingLabel="Loading character..." />;
  const { player } = world;
  const settlement = world.settlements[player.currentSettlementId];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topRow}>
          <Text style={[styles.eyebrow, { color: theme.inkMuted }]}>Character</Text>
          <JournalTriggerButton />
        </View>
        <Panel style={styles.headerPanel}>
          <CharacterHeader
            name={player.name}
            level={player.level}
            classId={player.classId}
            hp={player.hp}
            maxHp={player.maxHp}
            stamina={player.stamina}
            maxStamina={player.maxStamina}
            chips={[
              { icon: "location", label: settlement?.name ?? "Unknown" },
              { icon: "leaf", label: capitalize(world.currentDate.season) },
              { icon: "cloud", label: capitalize(world.weather.current) },
            ]}
          />
        </Panel>

        <View style={styles.sectionGap} />
        <Panel>
          <StatBar label="Experience" current={player.xp} max={player.xpToNextLevel} color={theme.accent} />
        </Panel>

        <View style={styles.sectionGap} />
        <SectionHeader label="Attributes" />
        <Panel>
          {(Object.keys(STAT_LABELS) as Array<keyof PlayerStats>).map((key, i) => (
            <View
              key={key}
              style={[styles.statRow, i < 5 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}
            >
              <Text style={{ color: theme.inkMuted }}>{STAT_LABELS[key]}</Text>
              <Text style={{ color: theme.ink, fontWeight: "700" }}>{player.stats[key]}</Text>
            </View>
          ))}
        </Panel>

        <View style={styles.sectionGap} />
        <SectionHeader label="Equipment" />
        <Text style={{ color: theme.inkMuted, fontStyle: "italic", marginBottom: 8 }}>
          No inventory system yet — slots shown for layout, not yet backed by real items.
        </Text>
        <View style={styles.equipmentRow}>
          {EQUIPMENT_SLOTS.map((slot) => (
            <View key={slot.label} style={[styles.equipmentSlot, { borderColor: theme.goldBorder, backgroundColor: theme.panel }]}>
              <Ionicons name={slot.icon} size={iconSize.emphasis} color={theme.goldMuted} />
            </View>
          ))}
        </View>

        <View style={styles.sectionGap} />
        <SectionHeader label="Purse" />
        <Panel style={styles.goldRow}>
          <Ionicons name="cash" size={iconSize.standard} color={theme.gold} />
          <Text style={{ color: theme.ink, fontWeight: "700", fontSize: scaledFontSize(typeScale.title) }}>{player.gold} gold</Text>
        </Panel>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 24, paddingTop: 12 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  eyebrow: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "700" },
  headerPanel: {},
  sectionGap: { height: 20 },
  statRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  equipmentRow: { flexDirection: "row", gap: 10 },
  equipmentSlot: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  goldRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
