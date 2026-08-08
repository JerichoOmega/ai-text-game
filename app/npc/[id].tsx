import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { scaledFontSize, typeScale, fontFamily, eyebrowStyle } from "@/presentation/theme/theme";
import { ActionButton } from "@/presentation/components/ActionButton";
import { NPCMemorySystem } from "@/systems/NPCMemorySystem";
import { describeDaysAgo } from "@/domain/types";

export default function NpcScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { world, manager, talkTo } = useWorldStore();

  const npc = world && id ? world.npcs[id] : undefined;
  const recentMemories = useMemo(() => {
    if (!npc) return [];
    return NPCMemorySystem.getProminentMemories(npc, 5);
  }, [npc]);

  if (!world || !npc) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.inkMuted }}>This person isn't here.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["bottom"]}>
      <Text style={[styles.name, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.display) }]} allowFontScaling maxFontSizeMultiplier={1.6}>
        {npc.name}
      </Text>
      <Text style={[styles.role, { color: theme.inkMuted }]}>{npc.role}</Text>

      <ActionButton label="Talk" onPress={() => talkTo(npc.id)} />

      <ScrollView style={styles.memorySection}>
        <Text style={[eyebrowStyle, { color: theme.inkMuted, marginBottom: 8 }]}>What They Remember</Text>
        {recentMemories.length === 0 && (
          <Text style={{ color: theme.inkMuted, fontStyle: "italic" }}>No history together yet.</Text>
        )}
        {recentMemories.map((memory) => (
          <View key={memory.id} style={[styles.memoryRow, { borderColor: theme.border }]}>
            <Text style={{ color: theme.ink }}>{memory.summary}</Text>
            <Text style={[styles.memoryTime, { color: theme.inkMuted }]}>
              {describeDaysAgo(memory.timestamp, world.currentDate)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  name: { fontWeight: "800" },
  role: { textTransform: "capitalize", marginBottom: 16 },
  memorySection: { flex: 1, marginTop: 20 },
  sectionLabel: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  memoryRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  memoryTime: { fontSize: 12, marginTop: 2 },
});
