import React, { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, radii, spacing, iconSize } from "@/presentation/theme/theme";
import { SectionLabel } from "@/presentation/components/SectionLabel";
import { PageTabs } from "@/presentation/components/PageTabs";
import { JournalTriggerButton } from "@/presentation/components/JournalTriggerButton";
import { ScreenContainer } from "@/presentation/components/ScreenContainer";
import { capitalize } from "@/utils/format";
import { CharacterSystem } from "@/systems/CharacterSystem";
import { getRace, getBackground } from "@/data/origins";
import { getAbility } from "@/data/abilities";
import { getEquipment } from "@/data/equipment";
import type { CombatStats } from "@/domain/types";

const PORTRAIT = require("../../assets/images/hero-portrait.jpg");

const STAT_ROWS: Array<{ key: keyof CombatStats; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "attack", label: "Attack", icon: "flash" },
  { key: "defense", label: "Defense", icon: "shield" },
  { key: "magicPower", label: "Magic Power", icon: "sparkles" },
  { key: "magicDefense", label: "Magic Defense", icon: "flower" },
  { key: "speed", label: "Speed", icon: "walk" },
];

type Tab = "overview" | "stats" | "gear";
const TABS: Array<{ key: Tab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "stats", label: "Stats" },
  { key: "gear", label: "Gear" },
];

export default function CharacterScreen() {
  const theme = useTheme();
  const world = useWorldStore((s) => s.world);
  const [tab, setTab] = useState<Tab>("overview");

  if (!world) return <ScreenContainer loading loadingLabel="Loading character..." />;
  const { player } = world;
  const settlement = world.settlements[player.currentSettlementId];
  const effective = CharacterSystem.effectiveStats(player);
  const race = getRace(player.raceId);
  const background = getBackground(player.backgroundId);
  const atMax = player.level >= 12;

  const characterAbilities = player.characterAbilityIds.map(getAbility).filter(Boolean);
  const combatAbilities = player.combatAbilityIds.map(getAbility).filter(Boolean);
  const equipment = player.equipmentItemIds.map(getEquipment).filter(Boolean);
  const equippedWeapon = equipment.find((e) => e && "attack" in e.modifiers) ?? equipment[0];

  const identityLine = `Level ${player.level} · ${race?.name ?? "Traveler"} · ${background?.name ?? "Wanderer"}`;
  const placeLine = `${settlement?.name ?? "The Wilds"} · ${capitalize(world.currentDate.season)} · ${capitalize(world.weather.current)}`;

  return (
    <ScreenContainer>
      <View style={styles.topRow}>
        <Text style={[styles.eyebrow, { color: theme.inkMuted }]}>Character</Text>
        <JournalTriggerButton />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} testID="character-screen">
        {/* Identity hero — the character is the center of the screen. */}
        <View style={styles.hero}>
          <View style={[styles.portraitRing, { borderColor: theme.goldBorder }]}>
            <Image source={PORTRAIT} style={styles.portrait} resizeMode="cover" />
          </View>
          <Text style={[styles.name, { color: theme.ink, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.hero) }]} numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={[styles.identity, { color: theme.bronze }]}>{identityLine}</Text>
          <Text style={[styles.place, { color: theme.inkMuted }]}>{placeLine}</Text>
        </View>

        {/* Essential progression — always visible. */}
        <View style={styles.meters}>
          <Meter label="Health" current={player.hp} max={player.maxHp} color={theme.forest} theme={theme} />
          <Meter
            label={atMax ? "Experience · Max Level" : "Experience"}
            current={atMax ? 1 : player.xp}
            max={atMax ? 1 : player.xpToNextLevel}
            color={theme.accent}
            theme={theme}
          />
        </View>

        {/* Drill-down: keep secondary detail behind book-page tabs. */}
        <PageTabs tabs={TABS} active={tab} onChange={setTab} testIDPrefix="character-tab" containerTestID="character-tabs" />

        {tab === "overview" && (
          <View>
            <SectionLabel label="At a Glance" tone="gold" />
            {STAT_ROWS.map((row) => (
              <View key={row.key} style={styles.ledgerRow}>
                <View style={styles.ledgerLabel}>
                  <Ionicons name={row.icon} size={iconSize.inline} color={theme.bronze} />
                  <Text style={{ color: theme.inkMuted }}>{row.label}</Text>
                </View>
                <Text style={[styles.dotLeader, { borderBottomColor: theme.border }]} />
                <Text style={{ color: theme.ink, fontWeight: "700", fontSize: scaledFontSize(typeScale.body) }}>{effective[row.key]}</Text>
              </View>
            ))}
            <View style={styles.ledgerRow}>
              <View style={styles.ledgerLabel}>
                <Ionicons name="hand-left" size={iconSize.inline} color={theme.bronze} />
                <Text style={{ color: theme.inkMuted }}>Equipped</Text>
              </View>
              <Text style={[styles.dotLeader, { borderBottomColor: theme.border }]} />
              <Text style={{ color: theme.ink, fontWeight: "600" }} numberOfLines={1}>{equippedWeapon ? equippedWeapon.name : "None"}</Text>
            </View>
            <View style={styles.ledgerRow}>
              <View style={styles.ledgerLabel}>
                <Ionicons name="cash" size={iconSize.inline} color={theme.bronze} />
                <Text style={{ color: theme.inkMuted }}>Purse</Text>
              </View>
              <Text style={[styles.dotLeader, { borderBottomColor: theme.border }]} />
              <Text style={{ color: theme.gold, fontWeight: "700" }}>{player.gold} gold</Text>
            </View>

            <View style={styles.abilitiesGap} />
            <SectionLabel label="Abilities" />
            {characterAbilities.length === 0 && combatAbilities.length === 0 ? (
              <Text style={[styles.muted, { color: theme.inkMuted }]}>No abilities yet — you'll earn your first as you grow.</Text>
            ) : (
              <>
                {characterAbilities.map((a) => (
                  <AbilityRow key={a!.id} name={a!.name} description={a!.description} theme={theme} testID={`character-ability-${a!.id}`} />
                ))}
                {combatAbilities.map((a) => (
                  <AbilityRow key={a!.id} name={a!.name} description={a!.description} theme={theme} testID={`combat-ability-${a!.id}`} />
                ))}
              </>
            )}
          </View>
        )}

        {tab === "stats" && (
          <View>
            <SectionLabel label="Attributes" tone="gold" />
            {STAT_ROWS.map((row) => {
              const bonus = effective[row.key] - player.stats[row.key];
              return (
                <View key={row.key} style={styles.ledgerRow} testID={`stat-${row.key}`}>
                  <View style={styles.ledgerLabel}>
                    <Ionicons name={row.icon} size={iconSize.inline} color={theme.bronze} />
                    <Text style={{ color: theme.inkMuted }}>{row.label}</Text>
                  </View>
                  <Text style={[styles.dotLeader, { borderBottomColor: theme.border }]} />
                  <Text style={{ color: theme.ink, fontWeight: "700", fontSize: scaledFontSize(typeScale.body) }}>
                    {effective[row.key]}
                    {bonus !== 0 && <Text style={{ color: theme.forest, fontSize: scaledFontSize(typeScale.caption) }}>{` (${bonus > 0 ? "+" : ""}${bonus})`}</Text>}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {tab === "gear" && (
          <View>
            <SectionLabel label="Equipment" tone="gold" />
            {equipment.length === 0 ? (
              <Text style={[styles.muted, { color: theme.inkMuted }]}>Nothing equipped.</Text>
            ) : (
              equipment.map((e) => (
                <View key={e!.id} style={styles.ledgerRow} testID={`equipment-${e!.id}`}>
                  <Text style={{ color: theme.ink, fontWeight: "600", flexShrink: 1 }}>{e!.name}</Text>
                  <Text style={[styles.dotLeader, { borderBottomColor: theme.border }]} />
                  <Text style={{ color: theme.forest, fontSize: scaledFontSize(typeScale.caption) }}>
                    {Object.entries(e!.modifiers).map(([k, v]) => `+${v} ${k}`).join(", ")}
                  </Text>
                </View>
              ))
            )}

            <View style={styles.purseGap} />
            <SectionLabel label="Purse" />
            <View style={styles.purseRow}>
              <Ionicons name="cash" size={iconSize.standard} color={theme.gold} />
              <Text style={{ color: theme.ink, fontWeight: "700", fontSize: scaledFontSize(typeScale.title) }}>{player.gold} gold</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

function Meter({ label, current, max, color, theme }: { label: string; current: number; max: number; color: string; theme: ReturnType<typeof useTheme> }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  return (
    <View style={styles.meter}>
      <View style={styles.meterHead}>
        <Text style={[styles.meterLabel, { color: theme.inkMuted }]}>{label}</Text>
        <Text style={{ color: theme.ink, fontWeight: "700" }}>{current} / {max}</Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.border }]}>
        <View style={[styles.fill, { backgroundColor: color, width: `${Math.round(pct * 100)}%` }]} />
      </View>
    </View>
  );
}

function AbilityRow({ name, description, theme, testID }: { name: string; description: string; theme: ReturnType<typeof useTheme>; testID: string }) {
  return (
    <View style={styles.abilityRow} testID={testID}>
      <Text style={{ color: theme.gold, fontWeight: "700", fontFamily: fontFamily.display }}>{name}</Text>
      <Text style={{ color: theme.inkMuted, fontSize: 13, marginTop: 2, lineHeight: 19, fontFamily: fontFamily.display, fontStyle: "italic" }}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: spacing.sm, paddingBottom: spacing.sm },
  eyebrow: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "700" },
  scroll: { paddingBottom: spacing.xxl },
  hero: { alignItems: "center", paddingTop: spacing.md },
  portraitRing: { width: 104, height: 104, borderRadius: radii.pill, borderWidth: 2, padding: 3, overflow: "hidden" },
  portrait: { width: "100%", height: "100%", borderRadius: radii.pill },
  name: { fontWeight: "800", letterSpacing: 1, marginTop: spacing.md },
  identity: { marginTop: 4, fontSize: 14, letterSpacing: 0.5 },
  place: { marginTop: 2, fontSize: 12, fontStyle: "italic" },
  meters: { marginTop: spacing.xl, gap: spacing.md },
  meter: {},
  meterHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 },
  meterLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: "700" },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  segment: { flexDirection: "row", borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.sm, padding: 3, marginTop: spacing.xl, marginBottom: spacing.lg },
  segmentBtn: { flex: 1, paddingVertical: 9, borderRadius: radii.xs, alignItems: "center" },
  segmentLabel: { fontWeight: "700", fontSize: 13, letterSpacing: 0.5 },
  muted: { fontStyle: "italic" },
  abilityRow: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "transparent" },
  ledgerRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, paddingVertical: spacing.sm },
  ledgerLabel: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dotLeader: { flex: 1, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 5, opacity: 0.6 },
  purseGap: { height: spacing.xl },
  purseRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  glanceGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: spacing.md, columnGap: spacing.sm },
  glanceItem: { flexBasis: "31%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  glanceLabel: { flex: 1, fontSize: 12, minWidth: 0 },
  glanceValue: { fontWeight: "700", fontSize: 15 },
  glanceMetaRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  glanceMetaItem: { flex: 1, minWidth: 0 },
  metaKey: { fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: "700", marginBottom: 3 },
  metaVal: { fontSize: 14, fontWeight: "600" },
  abilitiesGap: { height: spacing.xl },
});
