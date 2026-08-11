import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, radii, spacing, iconSize } from "@/presentation/theme/theme";
import { StatBar } from "@/presentation/components/StatBar";
import { ActionButton } from "@/presentation/components/ActionButton";
import { HapticManager } from "@/presentation/haptics/HapticManager";
import { ProgressionSystem } from "@/systems/ProgressionSystem";
import { getCombatAbility } from "@/data/abilities";
import { findShopItem } from "@/data/shopCatalog";
import type { CombatAction } from "@/domain/types";

/**
 * Chronicle's text-first interactive combat screen. Character -> Enemy ->
 * narration -> choices -> consequences. The screen only presents actions
 * and renders results; the single CombatEngine (via the store) owns every
 * rule. On victory it awards XP and runs the level-up ability choice inline.
 */
export default function CombatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const world = useWorldStore((s) => s.world);
  const combat = useWorldStore((s) => s.combat);
  const combatLog = useWorldStore((s) => s.combatLog);
  const combatSummary = useWorldStore((s) => s.combatSummary);
  const combatAct = useWorldStore((s) => s.combatAct);
  const chooseLevelUpAbility = useWorldStore((s) => s.chooseLevelUpAbility);
  const endCombat = useWorldStore((s) => s.endCombat);

  if (!combat || !world) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.inkMuted }} testID="combat-none">There is no battle here.</Text>
        <View style={{ height: spacing.md }} />
        <ActionButton label="Back" variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const player = combat.player;
  const enemy = combat.enemies.find((e) => e.hp > 0) ?? combat.enemies[0]!;
  const ongoing = combat.outcome === "ongoing";

  const act = (action: CombatAction) => {
    void HapticManager.medium();
    void combatAct(action);
  };

  const consumableId = world.player.inventoryItemIds.find((id) => findShopItem(id)?.category === "Consumable");
  const pending = ProgressionSystem.pendingAbilitySelection(world.player, world.seed);

  const onContinue = () => {
    void HapticManager.selection();
    endCombat();
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      {/* Enemy */}
      <View style={[styles.enemyCard, { borderColor: theme.goldBorder, backgroundColor: theme.panel }]} testID="combat-enemy">
        <View style={[styles.enemyIcon, { borderColor: theme.goldBorder, backgroundColor: theme.surface }]}>
          <Ionicons name="skull" size={32} color={theme.wax} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.enemyName, { color: theme.ink, fontFamily: fontFamily.displayBold }]} testID="combat-enemy-name">{enemy.name}</Text>
          <StatBar label="Enemy HP" current={enemy.hp} max={enemy.maxHp} color={theme.wax} />
        </View>
      </View>

      {/* Log */}
      <ScrollView
        style={[styles.log, { borderColor: theme.border, backgroundColor: theme.surface }]}
        contentContainerStyle={{ padding: spacing.md }}
        testID="combat-log"
      >
        {combatLog.slice(-8).map((line, i) => (
          <Text key={i} style={[styles.logLine, { color: theme.inkMuted }]}>{line}</Text>
        ))}
      </ScrollView>

      {/* Player */}
      <View style={[styles.playerCard, { borderColor: theme.goldBorder }]} testID="combat-player">
        <Text style={[styles.playerName, { color: theme.gold, fontFamily: fontFamily.displayBold }]}>{player.name}</Text>
        <StatBar label="Your HP" current={player.hp} max={player.maxHp} color={theme.forest} />
      </View>

      {/* Actions or result */}
      {ongoing ? (
        <ScrollView style={styles.actions} contentContainerStyle={styles.actionsContent} testID="combat-actions">
          <ActionButton label="Attack" onPress={() => act({ type: "attack" })} accessibilityHint="Basic weapon strike" />
          {player.combatAbilityIds.map((id) => {
            const ability = getCombatAbility(id);
            if (!ability) return null;
            return (
              <View key={id} style={styles.actionSlot} testID={`combat-ability-${id}`}>
                <ActionButton
                  label={ability.name}
                  variant="secondary"
                  onPress={() => act({ type: "ability", abilityId: id })}
                  accessibilityHint={ability.description}
                />
              </View>
            );
          })}
          <View style={styles.actionSlot}>
            <ActionButton label="Defend" variant="secondary" onPress={() => act({ type: "defend" })} accessibilityHint="Halve the next hit this round" />
          </View>
          {consumableId && (
            <View style={styles.actionSlot} testID="combat-item-action">
              <ActionButton label={`Use ${findShopItem(consumableId)?.name ?? "Item"}`} variant="secondary" onPress={() => act({ type: "item", itemId: consumableId })} accessibilityHint="Recover some HP" />
            </View>
          )}
          {combat.canFlee && (
            <View style={styles.actionSlot}>
              <ActionButton label="Flee" variant="danger" onPress={() => act({ type: "flee" })} accessibilityHint="Escape the encounter" />
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.result} testID="combat-result">
          <Text style={[styles.resultTitle, { color: combat.outcome === "victory" ? theme.gold : theme.wax, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.display) }]} testID="combat-result-title">
            {combat.outcome === "victory" ? "Victory!" : combat.outcome === "defeat" ? "Defeat" : "You escaped"}
          </Text>
          {combatSummary && combat.outcome === "victory" && (
            <Text style={{ color: theme.ink, marginTop: spacing.sm }} testID="combat-xp">
              You gained {combatSummary.xpGained} XP
              {combatSummary.leveledTo > combatSummary.leveledFrom ? ` and reached Level ${combatSummary.leveledTo}!` : "."}
            </Text>
          )}
          {combat.outcome === "defeat" && (
            <Text style={{ color: theme.inkMuted, marginTop: spacing.sm }}>You fall, but survive to fight another day. You recover with a sliver of health.</Text>
          )}

          {/* Inline level-up ability choice */}
          {combat.outcome === "victory" && pending ? (
            <View style={styles.levelUp} testID="levelup-panel">
              <Text style={[styles.levelUpLabel, { color: theme.bronze }]}>
                Choose a {pending.category === "character" ? "Character" : "Combat"} Ability (Level {pending.level})
              </Text>
              {pending.choices.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => { void HapticManager.success(); void chooseLevelUpAbility(a.id); }}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${a.name}`}
                  accessibilityHint={a.description}
                  testID={`levelup-choice-${a.id}`}
                  style={({ pressed }) => [styles.choiceCard, { borderColor: theme.goldBorder, backgroundColor: theme.panel, opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={{ color: theme.gold, fontWeight: "700" }}>{a.name}</Text>
                  <Text style={{ color: theme.inkMuted, fontSize: 13, marginTop: 2 }}>{a.description}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.continueWrap}>
              <ActionButton label="Continue" onPress={onContinue} accessibilityHint="Return to your journey" />
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  enemyCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radii.lg, padding: spacing.md },
  enemyIcon: { width: 56, height: 56, borderRadius: radii.md, borderWidth: StyleSheet.hairlineWidth * 2, alignItems: "center", justifyContent: "center" },
  enemyName: { fontSize: 18, fontWeight: "700", marginBottom: spacing.xs },
  log: { flex: 1, marginVertical: spacing.md, borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md },
  logLine: { fontSize: 14, lineHeight: 21, marginBottom: 2 },
  playerCard: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radii.lg, padding: spacing.md, marginBottom: spacing.md },
  playerName: { fontSize: 16, fontWeight: "700", marginBottom: spacing.xs },
  actions: { maxHeight: 260 },
  actionsContent: { paddingBottom: spacing.sm },
  actionSlot: { marginTop: spacing.sm },
  result: { alignItems: "center", paddingVertical: spacing.md },
  resultTitle: { fontWeight: "800" },
  levelUp: { alignSelf: "stretch", marginTop: spacing.lg },
  levelUpLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "700", marginBottom: spacing.sm, textAlign: "center" },
  choiceCard: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
  continueWrap: { alignSelf: "stretch", marginTop: spacing.xl },
});
