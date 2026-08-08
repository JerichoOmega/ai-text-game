import React from "react";
import { View, Text, Switch, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUIStore } from "@/state/useUIStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { SectionHeader } from "@/presentation/components/SectionHeader";

export default function SettingsScreen() {
  const theme = useTheme();
  const { themeMode, setThemeMode, hapticsEnabled, toggleHaptics } = useUIStore();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SectionHeader label="Display" />
        <View style={[styles.card, { backgroundColor: theme.panel, borderColor: theme.goldBorder }]}>
          <View style={styles.row}>
            <Text style={{ color: theme.ink }}>Theme</Text>
            <View style={styles.themeSwitchRow}>
              {(["light", "dark", "system"] as const).map((mode) => (
                <Text
                  key={mode}
                  onPress={() => setThemeMode(mode)}
                  style={[
                    styles.themeOption,
                    { color: themeMode === mode ? theme.background : theme.inkMuted, backgroundColor: themeMode === mode ? theme.gold : "transparent" },
                  ]}
                >
                  {mode[0]!.toUpperCase() + mode.slice(1)}
                </Text>
              ))}
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.row}>
            <Text style={{ color: theme.ink }}>Haptics</Text>
            <Switch value={hapticsEnabled} onValueChange={toggleHaptics} trackColor={{ true: theme.gold }} />
          </View>
        </View>

        <View style={styles.sectionGap} />
        <SectionHeader label="Save" />
        <Text style={{ color: theme.inkMuted, fontStyle: "italic" }}>
          Chronicle autosaves after every day advances — there's no manual save button by design. Your progress is
          stored locally on this device.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  scrollContent: { paddingTop: 16, paddingBottom: 24 },
  sectionGap: { height: 20 },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth * 2, paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  divider: { height: StyleSheet.hairlineWidth },
  themeSwitchRow: { flexDirection: "row", gap: 4 },
  themeOption: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, fontSize: 12, fontWeight: "700", overflow: "hidden" },
});
