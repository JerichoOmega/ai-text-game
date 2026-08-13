import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, ImageBackground } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, iconSize, spacing } from "@/presentation/theme/theme";
import { JournalTriggerButton } from "@/presentation/components/JournalTriggerButton";
import { PageTabs } from "@/presentation/components/PageTabs";
import { ScreenContainer } from "@/presentation/components/ScreenContainer";
import { capitalize } from "@/utils/format";
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

/** A restrained illuminated flourish used as an atlas caption rule. */
function Flourish({ color, gold }: { color: string; gold: string }) {
  return (
    <View style={styles.flourish}>
      <View style={[styles.flRule, { backgroundColor: color }]} />
      <View style={[styles.flDiamond, { backgroundColor: gold }]} />
      <View style={[styles.flRule, { backgroundColor: color }]} />
    </View>
  );
}

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

      <PageTabs tabs={TABS} active={tab} onChange={setTab} testIDPrefix="world-tab" containerTestID="world-tab-row" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === "map" && (
          <>
            {/* The atlas plate — the illustration is the centerpiece. */}
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

            {/* Atlas caption — a manuscript note beneath the plate, not a boxed card. */}
            {selected ? (
              <View style={styles.caption}>
                <Text style={[styles.captionName, { color: theme.gold, fontFamily: fontFamily.displayBold }]} numberOfLines={1}>
                  {selected.name}
                  {selected.destroyed ? " — in ruins" : ""}
                </Text>
                <Flourish color={theme.goldBorder} gold={theme.gold} />
                <Text style={[styles.captionText, { color: theme.inkMuted, fontFamily: fontFamily.display }]}>
                  {`A ${selected.type} of ${selected.population} souls, ${selected.controllingFactionId ? `held by ${world.factions[selected.controllingFactionId]?.name ?? "an unknown power"}` : "unaligned to any banner"}.`}
                </Text>
                <Text style={[styles.captionMetrics, { color: theme.bronze }]}>
                  Prosperity {selected.prosperity} · Road safety {selected.roadSafety}
                </Text>
              </View>
            ) : (
              <Text style={[styles.hint, { color: theme.inkMuted }]}>Tap a marker to read its entry in the atlas.</Text>
            )}
          </>
        )}

        {tab === "kingdoms" &&
          kingdoms.map((kingdom, i) => {
            const ruler = kingdom.rulerId ? world.npcs[kingdom.rulerId] : undefined;
            return (
              <View key={kingdom.id} style={[styles.entry, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
                <View style={styles.entryHead}>
                  <Ionicons name="shield" size={iconSize.standard} color={theme.gold} />
                  <Text style={[styles.entryName, { color: theme.ink }]}>{kingdom.name}</Text>
                </View>
                <Text style={[styles.entryMeta, { color: theme.inkMuted }]}>{ruler ? `Ruled by ${ruler.name}` : "The throne sits empty"}</Text>
                <Text style={[styles.entryMetrics, { color: theme.bronze }]}>Stability {kingdom.stability} · Treasury {kingdom.treasury}g</Text>
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
                <View key={faction.id} style={[styles.entry, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
                  <View style={styles.entryHead}>
                    <Ionicons name="flag" size={iconSize.standard} color={factionColor[faction.id] ?? theme.gold} />
                    <Text style={[styles.entryName, { color: theme.ink }]}>{faction.name}</Text>
                  </View>
                  <Text style={[styles.entryMeta, { color: theme.inkMuted }]}>Seat of power: {home?.name ?? "unknown"}</Text>
                  <Text style={[styles.entryMetrics, { color: standing >= 0 ? theme.forest : theme.wax }]}>
                    Power {faction.power} · Standing {standing >= 0 ? `+${standing}` : standing}
                  </Text>
                </View>
              );
            })
          ))}

        {tab === "locations" &&
          settlements.map((settlement, i) => (
            <View key={settlement.id} style={[styles.entry, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
              <View style={styles.entryHead}>
                <Ionicons name={settlement.type === "city" ? "business" : "home"} size={iconSize.standard} color={theme.gold} />
                <Text style={[styles.entryName, { color: theme.ink }]}>{settlement.name}</Text>
                {settlement.destroyed && <Text style={[styles.destroyed, { color: theme.wax }]}>DESTROYED</Text>}
              </View>
              <Text style={[styles.entryMeta, { color: theme.inkMuted }]}>
                {capitalize(settlement.type)} · population {settlement.population}
              </Text>
              <Text style={[styles.entryMetrics, { color: theme.bronze }]}>Prosperity {settlement.prosperity} · Road safety {settlement.roadSafety}</Text>
            </View>
          ))}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "800", marginTop: 4, marginBottom: spacing.md },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scroll: { paddingBottom: spacing.xxl },
  map: { width: "100%", aspectRatio: 0.82, marginBottom: spacing.lg },
  mapImage: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  marker: { position: "absolute", alignItems: "center", transform: [{ translateX: -18 }, { translateY: -18 }] },
  markerPin: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  markerLabel: { marginTop: 3, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 5, paddingVertical: 1, maxWidth: 96 },
  markerText: { fontSize: 10, fontWeight: "700" },
  hint: { fontStyle: "italic", textAlign: "center", marginTop: spacing.sm },

  // Atlas caption
  caption: { alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
  captionName: { fontSize: 22, fontWeight: "800", letterSpacing: 0.5, textAlign: "center" },
  captionText: { fontSize: 15, lineHeight: 23, textAlign: "center", fontStyle: "italic", marginBottom: spacing.sm },
  captionMetrics: { fontSize: 12, letterSpacing: 0.5, textAlign: "center" },
  flourish: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginVertical: spacing.sm },
  flRule: { width: 40, height: StyleSheet.hairlineWidth, opacity: 0.7 },
  flDiamond: { width: 5, height: 5, transform: [{ rotate: "45deg" }], opacity: 0.85 },

  // Manuscript list entries
  entry: { paddingVertical: spacing.md },
  entryHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  entryName: { fontWeight: "700", fontSize: 17, flex: 1, fontFamily: fontFamily.display },
  destroyed: { fontWeight: "700", fontSize: 11, letterSpacing: 1 },
  entryMeta: { marginTop: 4, textTransform: "capitalize", fontSize: 13, fontStyle: "italic" },
  entryMetrics: { marginTop: spacing.xs, fontSize: 12, letterSpacing: 0.3 },
});
