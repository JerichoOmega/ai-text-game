import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, iconSize } from "@/presentation/theme/theme";
import { Panel } from "@/presentation/components/Panel";
import { SectionHeader } from "@/presentation/components/SectionHeader";
import { MenuRow } from "@/presentation/components/MenuRow";
import { CharacterHeader } from "@/presentation/components/CharacterHeader";
import { JourneyCard } from "@/presentation/components/JourneyCard";
import { ScreenContainer } from "@/presentation/components/ScreenContainer";
import { routes } from "@/presentation/navigation/routes";
import { capitalize } from "@/utils/format";

/**
 * The mockup's version of this screen is a literal illustrated leather
 * journal (worn cover texture, page-turn framing). No art asset exists for
 * that, so this uses the same Panel/gold-border language as every other
 * screen instead of a fake-leather background image — consistent beats
 * decorative-but-hollow. If a real journal-cover illustration gets added
 * later, this is a background-image swap, not a rebuild.
 */
export default function JournalScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { world, lastSavedAt } = useWorldStore();

  const activeQuest = useMemo(() => {
    if (!world) return undefined;
    return Object.values(world.quests).find((q) => q.status === "active" || q.status === "available");
  }, [world]);

  // Previously `return null` here — a blank modal with no feedback during
  // the loading window, the last remaining raw-null gap this audit found
  // (Character/World already had this fixed in an earlier pass).
  if (!world) return <ScreenContainer loading loadingLabel="Opening your journal..." />;
  const { player } = world;
  const settlement = world.settlements[player.currentSettlementId];

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.display) }]}>
          Adventure Journal
        </Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close journal, return to game"
          hitSlop={8}
          style={[styles.closeButton, { borderColor: theme.goldBorder }]}
        >
          <Ionicons name="close" size={iconSize.standard} color={theme.gold} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Panel>
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

        {activeQuest && (
          <>
            <View style={styles.sectionGap} />
            <SectionHeader label="Current Journey" />
            <JourneyCard
              title={activeQuest.title}
              detail={activeQuest.contextSummary}
              objectives={activeQuest.objectives.map((o) => ({ id: o.id, label: o.label, complete: o.complete }))}
              onPress={() => {
                router.back();
                router.push(routes.quests);
              }}
            />
          </>
        )}

        <View style={styles.sectionGap} />
        <SectionHeader label="Adventure" />
        <MenuRow icon="reader" title="Quest Log" subtitle="Active quests & objectives" onPress={() => { router.back(); router.push(routes.quests); }} />
        <MenuRow icon="bag" title="Inventory" subtitle="Coming soon" onPress={() => {}} disabled />
        <MenuRow icon="people" title="Companions" subtitle="Coming soon" onPress={() => {}} disabled />
        <MenuRow icon="flame" title="Camp" subtitle="Coming soon" onPress={() => {}} disabled />

        <View style={styles.sectionGap} />
        <SectionHeader label="Lore" />
        <MenuRow icon="library" title="Codex" subtitle="Coming soon" onPress={() => {}} disabled />
        <MenuRow icon="paw" title="Bestiary" subtitle="Coming soon" onPress={() => {}} disabled />

        <View style={styles.sectionGap} />
        <SectionHeader label="Game" />
        <MenuRow icon="settings" title="Settings" subtitle="Display, gameplay, and more" onPress={() => { router.back(); router.push(routes.settings); }} />
        <MenuRow icon="trophy" title="Achievements" subtitle="Coming soon" onPress={() => {}} disabled />
        <MenuRow icon="mail" title="Support" subtitle="Coming soon" onPress={() => {}} disabled />

        <View style={styles.sectionGap} />
        <View style={[styles.utilityRow, { borderColor: theme.goldBorder }]}>
          <UtilityButton icon="cloud-done" label={lastSavedAt ? "Saved locally" : "Not saved"} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

/**
 * The mockup shows "CLOUD SYNC — Up to date." There is no cloud sync — only
 * local SQLite persistence — so this says exactly that instead of claiming
 * a connected cloud service that doesn't exist. Search and Notifications
 * (also shown in the mockup's bottom utility row) aren't included at all
 * here rather than shown as disabled buttons with nothing to search or be
 * notified about yet.
 */
function UtilityButton({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.utilityItem}>
      <Ionicons name={icon} size={iconSize.inline} color={theme.inkMuted} />
      <Text style={{ color: theme.inkMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4, marginBottom: 12 },
  title: { fontWeight: "800" },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { paddingBottom: 24 },
  sectionGap: { height: 20 },
  utilityRow: {
    flexDirection: "row",
    justifyContent: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
  },
  utilityItem: { flexDirection: "row", alignItems: "center", gap: 6 },
});
