import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { scaledFontSize, typeScale, radii, spacing, iconSize } from "@/presentation/theme/theme";
import { Panel } from "@/presentation/components/Panel";
import { SectionHeader } from "@/presentation/components/SectionHeader";
import { StatBar } from "@/presentation/components/StatBar";
import { CharacterHeader } from "@/presentation/components/CharacterHeader";
import { JournalTriggerButton } from "@/presentation/components/JournalTriggerButton";
import { ScreenContainer } from "@/presentation/components/ScreenContainer";
import { capitalize } from "@/utils/format";
import { CharacterSystem } from "@/systems/CharacterSystem";
import { getRace, getBackground } from "@/data/origins";
import { getAbility } from "@/data/abilities";
import { getEquipment } from "@/data/equipment";
import type { CombatStats } from "@/domain/types";

const STAT_ROWS: Array<{ key: keyof CombatStats; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "attack", label: "Attack", icon: "flash" },
  { key: "defense", label: "Defense", icon: "shield" },
  { key: "magicPower", label: "Magic Power", icon: "sparkles" },
  { key: "magicDefense", label: "Magic Defense", icon: "flower" },
  { key: "speed", label: "Speed", icon: "walk" },
];

export default function CharacterScreen() {
  const theme = useTheme();
  const world = useWorldStore((s) => s.world);

  if (!world) return <ScreenContainer loading loadingLabel="Loading character..." />;
  const { player } = world;
  const settlement = world.settlements[player.currentSettlementId];
  const effective = CharacterSystem.effectiveStats(player);
  const race = getRace(player.raceId);
  const background = getBackground(player.backgroundId);

  const characterAbilities = player.characterAbilityIds.map(getAbility).filter(Boolean);
  const combatAbilities = player.combatAbilityIds.map(getAbility).filter(Boolean);
  const equipment = player.equipmentItemIds.map(getEquipment).filter(Boolean);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scrollContent} testID="character-screen">
        <View style={styles.topRow}>
          <Text style={[styles.eyebrow, { color: theme.inkMuted }]}>Character</Text>
          <JournalTriggerButton />
        </View>
        <Panel>
          <CharacterHeader
            name={player.name}
            level={player.level}
            subtitle={`${race?.name ?? "Traveler"} ${background?.name ?? ""}`.trim()}
            hp={player.hp}
            maxHp={player.maxHp}
            chips={[
              { icon: "location", label: settlement?.name ?? "Unknown" },
              { icon: "leaf", label: capitalize(world.currentDate.season) },
              { icon: "cloud", label: capitalize(world.weather.current) },
            ]}
          />
        </Panel>

        <View style={styles.sectionGap} />
        <Panel>
          <StatBar
            label={player.level >= 12 ? "Experience (max level)" : "Experience"}
            current={player.level >= 12 ? 1 : player.xp}
            max={player.level >= 12 ? 1 : player.xpToNextLevel}
            color={theme.accent}
          />
        </Panel>

        <View style={styles.sectionGap} />
        <SectionHeader label="Combat Stats" />
        <Panel>
          {STAT_ROWS.map((row, i) => {
            const bonus = effective[row.key] - player.stats[row.key];
            return (
              <View
                key={row.key}
                style={[styles.statRow, i < STAT_ROWS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}
                testID={`stat-${row.key}`}
              >
                <View style={styles.statLabelRow}>
                  <Ionicons name={row.icon} size={iconSize.standard} color={theme.bronze} />
                  <Text style={{ color: theme.inkMuted }}>{row.label}</Text>
                </View>
                <Text style={{ color: theme.ink, fontWeight: "700" }}>
                  {effective[row.key]}
                  {bonus !== 0 && <Text style={{ color: theme.forest }}>{`  (${bonus > 0 ? "+" : ""}${bonus})`}</Text>}
                </Text>
              </View>
            );
          })}
        </Panel>

        <View style={styles.sectionGap} />
        <SectionHeader label={`Character Abilities (${characterAbilities.length})`} />
        <Panel>
          {characterAbilities.length === 0 && <Text style={{ color: theme.inkMuted, fontStyle: "italic" }}>None yet.</Text>}
          {characterAbilities.map((a, i) => (
            <View key={a!.id} style={[styles.abilityRow, i < characterAbilities.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]} testID={`character-ability-${a!.id}`}>
              <Text style={{ color: theme.gold, fontWeight: "700" }}>{a!.name}</Text>
              <Text style={{ color: theme.inkMuted, fontSize: 13, marginTop: 2 }}>{a!.description}</Text>
            </View>
          ))}
        </Panel>

        <View style={styles.sectionGap} />
        <SectionHeader label={`Combat Abilities (${combatAbilities.length})`} />
        <Panel>
          {combatAbilities.length === 0 && <Text style={{ color: theme.inkMuted, fontStyle: "italic" }}>None yet — you'll earn your first at Level 2.</Text>}
          {combatAbilities.map((a, i) => (
            <View key={a!.id} style={[styles.abilityRow, i < combatAbilities.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]} testID={`combat-ability-${a!.id}`}>
              <Text style={{ color: theme.gold, fontWeight: "700" }}>{a!.name}</Text>
              <Text style={{ color: theme.inkMuted, fontSize: 13, marginTop: 2 }}>{a!.description}</Text>
            </View>
          ))}
        </Panel>

        <View style={styles.sectionGap} />
        <SectionHeader label="Equipment" />
        <Panel>
          {equipment.length === 0 && <Text style={{ color: theme.inkMuted, fontStyle: "italic" }}>Nothing equipped.</Text>}
          {equipment.map((e, i) => (
            <View key={e!.id} style={[styles.statRow, i < equipment.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]} testID={`equipment-${e!.id}`}>
              <Text style={{ color: theme.ink, fontWeight: "600" }}>{e!.name}</Text>
              <Text style={{ color: theme.forest, fontSize: 13 }}>
                {Object.entries(e!.modifiers).map(([k, v]) => `+${v} ${k}`).join(", ")}
              </Text>
            </View>
          ))}
        </Panel>

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
  sectionGap: { height: 20 },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  abilityRow: { paddingVertical: 10 },
  goldRow: { flexDirection: "row", alignItems: "center", gap: 10 },
});
