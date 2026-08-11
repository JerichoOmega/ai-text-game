import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ImageBackground } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, iconSize, radii, spacing } from "@/presentation/theme/theme";
import { Panel } from "@/presentation/components/Panel";
import { SectionHeader } from "@/presentation/components/SectionHeader";
import { JournalTriggerButton } from "@/presentation/components/JournalTriggerButton";
import { ScreenContainer } from "@/presentation/components/ScreenContainer";
import type { Settlement } from "@/domain/types";

const MAP_IMAGE = require("../../assets/images/world-map.jpg");

type WorldTab = "map" | "kingdoms" | "factions" | "locations";
const TABS: Array<{ key: WorldTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "map", label: "Map", icon: "map" },
  { key: "kingdoms", label: "Kingdoms", icon: "shield" },
  { key: "factions", label: "Factions", icon: "flag" },
  { key: "locations", label: "Locations", icon: "location" },
];

/** Deterministic marker layout across the painted map (normalized 0-1),
 * assigned by settlement order so placement is stable across renders.
 * Marker position is purely presentational — the simulation has no map
 * coordinates, so this is a fixed spread rather than fabricated geodata. */
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

      <View style={styles.tabRow} testID="world-tab-row">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              testID={`world-tab-${t.key}`}
              style={[styles.tabChip, { borderColor: active ? theme.accent : theme.goldBorder, backgroundColor: active ? theme.surfaceRaised : theme.panel }]}
            >
              <Ionicons name={t.icon} size={iconSize.inline} color={active ? theme.accent : theme.gold} />
              <Text style={[styles.tabLabel, { color: active ? theme.accent : theme.inkMuted }]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
              <Panel style={styles.detailCard}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name={selected.type === "city" ? "business" : "home"} size={iconSize.standard} color={markerColor(selected)} />
                  <Text style={[styles.cardTitle, { color: theme.ink }]}>{selected.name}</Text>
                  {selected.destroyed && <Text style={{ color: theme.wax, fontWeight: "700", fontSize: 12 }}>DESTROYED</Text>}
                </View>
                <Text style={{ color: theme.inkMuted, marginTop: 4, textTransform: "capitalize" }}>
                  {selected.type}
                  {selected.controllingFactionId ? ` · ${world.factions[selected.controllingFactionId]?.name ?? "unaligned"}` : " · unaligned"}
                </Text>
                <View style={styles.metricRow}>
                  <Text style={{ color: theme.inkMuted, fontSize: 12 }}>Prosperity {selected.prosperity}</Text>
                  <Text style={{ color: theme.inkMuted, fontSize: 12 }}>Road safety {selected.roadSafety}</Text>
                </View>
              </Panel>
            ) : (
              <Text style={[styles.hint, { color: theme.inkMuted }]}>Tap a marker to inspect a settlement.</Text>
            )}
          </>
        )}

        {tab === "kingdoms" &&
          kingdoms.map((kingdom) => {
            const ruler = kingdom.rulerId ? world.npcs[kingdom.rulerId] : undefined;
            return (
              <Panel key={kingdom.id} style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Ionicons name="shield" size={iconSize.standard} color={theme.gold} />
                  <Text style={[styles.cardTitle, { color: theme.ink }]}>{kingdom.name}</Text>
                </View>
                <Text style={{ color: theme.inkMuted, marginTop: 4 }}>{ruler ? `Ruled by ${ruler.name}` : "The throne sits empty"}</Text>
                <View style={styles.metricRow}>
                  <Text style={{ color: theme.inkMuted, fontSize: 12 }}>Stability {kingdom.stability}</Text>
                  <Text style={{ color: theme.inkMuted, fontSize: 12 }}>Treasury {kingdom.treasury}g</Text>
                </View>
              </Panel>
            );
          })}

        {tab === "factions" &&
          (factions.length === 0 ? (
            <Text style={[styles.hint, { color: theme.inkMuted }]}>No factions vie for power yet.</Text>
          ) : (
            factions.map((faction) => {
              const home = faction.homeSettlementId ? world.settlements[faction.homeSettlementId] : undefined;
              const standing = faction.playerStanding;
              return (
                <Panel key={faction.id} style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Ionicons name="flag" size={iconSize.standard} color={factionColor[faction.id] ?? theme.gold} />
                    <Text style={[styles.cardTitle, { color: theme.ink }]}>{faction.name}</Text>
                  </View>
                  <Text style={{ color: theme.inkMuted, marginTop: 4 }}>Seat of power: {home?.name ?? "unknown"}</Text>
                  <View style={styles.metricRow}>
                    <Text style={{ color: theme.inkMuted, fontSize: 12 }}>Power {faction.power}</Text>
                    <Text style={{ color: standing >= 0 ? theme.forest : theme.wax, fontSize: 12 }}>
                      Standing {standing >= 0 ? `+${standing}` : standing}
                    </Text>
                  </View>
                </Panel>
              );
            })
          ))}

        {tab === "locations" &&
          settlements.map((settlement) => (
            <Panel key={settlement.id} style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name={settlement.type === "city" ? "business" : "home"} size={iconSize.standard} color={theme.gold} />
                <Text style={[styles.cardTitle, { color: theme.ink }]}>{settlement.name}</Text>
                {settlement.destroyed && <Text style={{ color: theme.wax, fontWeight: "700", fontSize: 12 }}>DESTROYED</Text>}
              </View>
              <Text style={{ color: theme.inkMuted, marginTop: 4, textTransform: "capitalize" }}>
                {settlement.type} · population {settlement.population}
              </Text>
              <View style={styles.metricRow}>
                <Text style={{ color: theme.inkMuted, fontSize: 12 }}>Prosperity {settlement.prosperity}</Text>
                <Text style={{ color: theme.inkMuted, fontSize: 12 }}>Road safety {settlement.roadSafety}</Text>
              </View>
            </Panel>
          ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "800", marginTop: 4, marginBottom: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tabRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  tabChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.pill,
    paddingVertical: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: "700" },
  scrollContent: { paddingBottom: 24 },
  map: { width: "100%", aspectRatio: 0.8, marginBottom: spacing.md },
  mapImage: { borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth * 2 },
  marker: { position: "absolute", alignItems: "center", transform: [{ translateX: -18 }, { translateY: -18 }] },
  markerPin: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  markerLabel: { marginTop: 3, borderRadius: radii.xs, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 5, paddingVertical: 1, maxWidth: 96 },
  markerText: { fontSize: 10, fontWeight: "700" },
  detailCard: { marginBottom: 12 },
  hint: { fontStyle: "italic", textAlign: "center", marginTop: 8 },
  card: { marginBottom: 12 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontWeight: "700", fontSize: 16, flex: 1 },
  metricRow: { flexDirection: "row", gap: 16, marginTop: 8 },
});
