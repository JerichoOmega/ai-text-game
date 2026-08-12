import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ImageBackground } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, iconSize, radii, spacing } from "@/presentation/theme/theme";
import { JournalTriggerButton } from "@/presentation/components/JournalTriggerButton";
import { ScreenContainer } from "@/presentation/components/ScreenContainer";
import type { Settlement } from "@/domain/types";

const MAP_IMAGE = require("../../assets/images/world-map.jpg");

type WorldTab = "map" | "kingdoms" | "factions" | "locations";
const TABS: Array<{ key: WorldTab; label: string }> = [
  { key: "map", label: "Map" },
  { key: "kingdoms", label: "Kingdoms" },
  { key: "factions", label: "Factions" },
  { key: "locations", label: "Locations" },
];

/** Deterministic marker layout across the painted map (normalized 0-1),
 * assigned by settlement order so placement is stable across renders. */
const MARKER_SLOTS = [
  { x: 0.34, y: 0.24 },
  { x: 0.63, y: 0.38 },
  { x: 0.44, y: 0.58 },
  { x: 0.70, y: 0.66 },
  { x: 0.23, y: 0.5 },
  { x: 0.57, y: 0.79 },
  { x: 0.3, y: 0.73 },
  { x: 0.73, y: 0.22 },
];

const FACTION_COLORS = ["#A5453F", "#4F6FA3", "#4F8A5B", "#8A6BB0", "#B0873F"];

export default function WorldScreen() {
  const theme = useTheme();
  const world = useWorldStore((s) => s.world);
  const [tab, setTab] = useState<WorldTab>("map");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const factionColor = useMemo(() => {
    const map: Record<string, string> = {};
    if (world) Object.values(world.factions).forEach((f, i) => (map[f.id] = FACTION_COLORS[i % FACTION_COLORS.length]!));
    return map;
  }, [world]);

  if (!world) return <ScreenContainer loading loadingLabel="Surveying the realm..." />;

  const kingdoms = Object.values(world.kingdoms);
  const settlements = Object.values(world.settlements);
  const factions = Object.values(world.factions);
  const selected = selectedId ? world.settlements[selectedId] : undefined;

  const markerColor = (s: Settlement) =>
    s.destroyed ? theme.inkMuted : s.controllingFactionId ? factionColor[s.controllingFactionId] ?? theme.gold : theme.gold;

  return (
    <ScreenContainer>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.display) }]}>
          The World
        </Text>
        <JournalTriggerButton />
      </View>

      <View style={[styles.segment, { borderColor: theme.goldBorder }]} testID="world-tab-row">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              testID={`world-tab-${t.key}`}
              style={[styles.segmentBtn, active && { backgroundColor: theme.surfaceRaised }]}
            >
              <Text style={[styles.segmentLabel, { color: active ? theme.gold : theme.inkMuted }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === "map" && (
          <>
            <ImageBackground source={MAP_IMAGE} style={styles.map} imageStyle={[styles.mapImage, { borderColor: theme.goldBorder }]} resizeMode="cover">
              {settlements.map((s, i) => {
                const slot = MARKER_SLOTS[i % MARKER_SLOTS.length]!;
                const color = markerColor(s);
                const isSel = s.id === selectedId;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setSelectedId(isSel ? null : s.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${s.name}, ${s.type}`}
                    testID={`world-map-marker-${s.id}`}
                    style={[styles.marker, { left: `${slot.x * 100}%`, top: `${slot.y * 100}%` }]}
                  >
                    <View style={[styles.markerPin, { backgroundColor: theme.background + "E6", borderColor: color, borderWidth: isSel ? 2 : StyleSheet.hairlineWidth * 2 }]}>
                      <Ionicons name={s.type === "city" ? "business" : s.type === "town" ? "home" : "leaf"} size={14} color={color} />
                    </View>
                    <View style={[styles.markerLabel, { backgroundColor: theme.background + "D9", borderColor: theme.goldBorder }]}>
                      <Text style={[styles.markerText, { color: theme.ink }]} numberOfLines={1}>{s.name}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ImageBackground>

            {selected ? (
              <View style={[styles.detail, { borderTopColor: theme.goldBorder }]}>
                <View style={styles.entryHead}>
                  <Ionicons name={selected.type === "city" ? "business" : "home"} size={iconSize.standard} color={markerColor(selected)} />
                  <Text style={[styles.entryName, { color: theme.ink }]}>{selected.name}</Text>
                  {selected.destroyed && <Text style={[styles.destroyed, { color: theme.wax }]}>DESTROYED</Text>}
                </View>
                <Text style={[styles.entryMeta, { color: theme.inkMuted }]}>
                  {selected.type}
                  {selected.controllingFactionId ? ` · ${world.factions[selected.controllingFactionId]?.name ?? "unaligned"}` : " · unaligned"}
                </Text>
                <View style={styles.metricRow}>
                  <Text style={[styles.metric, { color: theme.inkMuted }]}>Prosperity {selected.prosperity}</Text>
                  <Text style={[styles.metric, { color: theme.inkMuted }]}>Road safety {selected.roadSafety}</Text>
                </View>
              </View>
            ) : (
              <Text style={[styles.hint, { color: theme.inkMuted }]}>Tap a marker to inspect a settlement.</Text>
            )}
          </>
        )}

        {tab === "kingdoms" &&
          kingdoms.map((kingdom, i) => {
            const ruler = kingdom.rulerId ? world.npcs[kingdom.rulerId] : undefined;
            return (
              <View key={kingdom.id} style={[styles.entry, i > 0 && styles.entryDivider, { borderTopColor: theme.border }]}>
                <View style={styles.entryHead}>
                  <Ionicons name="shield" size={iconSize.standard} color={theme.gold} />
                  <Text style={[styles.entryName, { color: theme.ink }]}>{kingdom.name}</Text>
                </View>
                <Text style={[styles.entryMeta, { color: theme.inkMuted }]}>{ruler ? `Ruled by ${ruler.name}` : "The throne sits empty"}</Text>
                <View style={styles.metricRow}>
                  <Text style={[styles.metric, { color: theme.inkMuted }]}>Stability {kingdom.stability}</Text>
                  <Text style={[styles.metric, { color: theme.inkMuted }]}>Treasury {kingdom.treasury}g</Text>
                </View>
              </View>
            );
          })}

        {tab === "factions" &&
          (factions.length === 0 ? (
            <Text style={[styles.hint, { color: theme.inkMuted }]}>No factions vie for power yet.</Text>
          ) : (
            factions.map((faction, i) => {
              const home = faction.homeSettlementId ? world.settlements[faction.homeSettlementId] : undefined;
              const standing = faction.playerStanding;
              return (
                <View key={faction.id} style={[styles.entry, i > 0 && styles.entryDivider, { borderTopColor: theme.border }]}>
                  <View style={styles.entryHead}>
                    <Ionicons name="flag" size={iconSize.standard} color={factionColor[faction.id] ?? theme.gold} />
                    <Text style={[styles.entryName, { color: theme.ink }]}>{faction.name}</Text>
                  </View>
                  <Text style={[styles.entryMeta, { color: theme.inkMuted }]}>Seat of power: {home?.name ?? "unknown"}</Text>
                  <View style={styles.metricRow}>
                    <Text style={[styles.metric, { color: theme.inkMuted }]}>Power {faction.power}</Text>
                    <Text style={[styles.metric, { color: standing >= 0 ? theme.forest : theme.wax }]}>
                      Standing {standing >= 0 ? `+${standing}` : standing}
                    </Text>
                  </View>
                </View>
              );
            })
          ))}

        {tab === "locations" &&
          settlements.map((settlement, i) => (
            <View key={settlement.id} style={[styles.entry, i > 0 && styles.entryDivider, { borderTopColor: theme.border }]}>
              <View style={styles.entryHead}>
                <Ionicons name={settlement.type === "city" ? "business" : "home"} size={iconSize.standard} color={theme.gold} />
                <Text style={[styles.entryName, { color: theme.ink }]}>{settlement.name}</Text>
                {settlement.destroyed && <Text style={[styles.destroyed, { color: theme.wax }]}>DESTROYED</Text>}
              </View>
              <Text style={[styles.entryMeta, { color: theme.inkMuted }]}>
                {settlement.type} · population {settlement.population}
              </Text>
              <View style={styles.metricRow}>
                <Text style={[styles.metric, { color: theme.inkMuted }]}>Prosperity {settlement.prosperity}</Text>
                <Text style={[styles.metric, { color: theme.inkMuted }]}>Road safety {settlement.roadSafety}</Text>
              </View>
            </View>
          ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "800", marginTop: 4, marginBottom: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  segment: { flexDirection: "row", borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.sm, padding: 3, marginBottom: spacing.lg },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: radii.xs, alignItems: "center" },
  segmentLabel: { fontWeight: "700", fontSize: 12, letterSpacing: 0.3 },
  scroll: { paddingBottom: spacing.xxl },
  map: { width: "100%", aspectRatio: 0.85, marginBottom: spacing.md },
  mapImage: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth * 2 },
  marker: { position: "absolute", alignItems: "center", transform: [{ translateX: -18 }, { translateY: -18 }] },
  markerPin: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  markerLabel: { marginTop: 3, borderRadius: radii.xs, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 5, paddingVertical: 1, maxWidth: 96 },
  markerText: { fontSize: 10, fontWeight: "700" },
  hint: { fontStyle: "italic", textAlign: "center", marginTop: spacing.sm },
  detail: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md },
  entry: { paddingVertical: spacing.md },
  entryDivider: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 2 },
  entryHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  entryName: { fontWeight: "700", fontSize: 16, flex: 1, fontFamily: fontFamily.display },
  destroyed: { fontWeight: "700", fontSize: 11, letterSpacing: 1 },
  entryMeta: { marginTop: 4, textTransform: "capitalize", fontSize: 13 },
  metricRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.sm },
  metric: { fontSize: 12 },
});
