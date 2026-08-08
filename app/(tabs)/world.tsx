import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, iconSize } from "@/presentation/theme/theme";
import { Panel } from "@/presentation/components/Panel";
import { SectionHeader } from "@/presentation/components/SectionHeader";
import { JournalTriggerButton } from "@/presentation/components/JournalTriggerButton";
import { ScreenContainer } from "@/presentation/components/ScreenContainer";

/**
 * The mockup's World screen has Map/Kingdoms/Factions/Settlements/Trade
 * Routes/Dungeons/Borders/Wars as tabs — an interactive map and several of
 * those categories (trade routes, dungeons, political borders as drawn
 * geography) don't have a domain model behind them yet. Rather than fake a
 * tappable map image, this shows what the simulation actually tracks today
 * (kingdoms + settlements, with their live prosperity/road-safety numbers)
 * in the same visual language. Expand tabs here as those systems get built.
 */
export default function WorldScreen() {
  const theme = useTheme();
  const world = useWorldStore((s) => s.world);

  if (!world) return <ScreenContainer loading loadingLabel="Surveying the realm..." />;

  const kingdoms = Object.values(world.kingdoms);
  const settlements = Object.values(world.settlements);

  return (
    <ScreenContainer>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.display) }]}>
          The World
        </Text>
        <JournalTriggerButton />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SectionHeader label="Kingdoms" />
        {kingdoms.map((kingdom) => {
          const ruler = kingdom.rulerId ? world.npcs[kingdom.rulerId] : undefined;
          return (
            <Panel key={kingdom.id} style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="shield" size={iconSize.standard} color={theme.gold} />
                <Text style={[styles.cardTitle, { color: theme.ink }]}>{kingdom.name}</Text>
              </View>
              <Text style={{ color: theme.inkMuted, marginTop: 4 }}>
                {ruler ? `Ruled by ${ruler.name}` : "The throne sits empty"}
              </Text>
              <View style={styles.metricRow}>
                <Text style={{ color: theme.inkMuted, fontSize: 12 }}>Stability {kingdom.stability}</Text>
                <Text style={{ color: theme.inkMuted, fontSize: 12 }}>Treasury {kingdom.treasury}g</Text>
              </View>
            </Panel>
          );
        })}

        <View style={styles.sectionGap} />
        <SectionHeader label="Settlements" />
        {settlements.map((settlement) => (
          <Panel key={settlement.id} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name={settlement.type === "city" ? "business" : "home"} size={iconSize.standard} color={theme.gold} />
              <Text style={[styles.cardTitle, { color: theme.ink }]}>{settlement.name}</Text>
              {settlement.destroyed && (
                <Text style={{ color: theme.wax, fontWeight: "700", fontSize: 12 }}>DESTROYED</Text>
              )}
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

        <View style={styles.sectionGap} />
        <Text style={{ color: theme.inkMuted, fontStyle: "italic", textAlign: "center" }}>
          Map, factions, trade routes, and dungeons are coming — the systems behind them aren't built yet.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { fontWeight: "800", marginTop: 4, marginBottom: 16 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scrollContent: { paddingBottom: 24 },
  card: { marginBottom: 12 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontWeight: "700", fontSize: 16, flex: 1 },
  metricRow: { flexDirection: "row", gap: 16, marginTop: 8 },
  sectionGap: { height: 20 },
});
