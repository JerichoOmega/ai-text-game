import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, radii, spacing, iconSize } from "@/presentation/theme/theme";
import { ActionButton } from "@/presentation/components/ActionButton";
import { Panel } from "@/presentation/components/Panel";
import { SectionHeader } from "@/presentation/components/SectionHeader";
import { routes } from "@/presentation/navigation/routes";
import { RACES, BACKGROUNDS, MOTIVATIONS } from "@/data/origins";

/**
 * New Adventure / character creation (Part 7): name, race, background, and
 * motivation. No classes, no point allocation — race + background apply a
 * small deterministic stat bias and grant the Level-1 Character Ability.
 */
export default function NewAdventureScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const startNewAdventure = useWorldStore((s) => s.startNewAdventure);
  const loading = useWorldStore((s) => s.loading);

  const [name, setName] = useState("");
  const [raceId, setRaceId] = useState(RACES[0]!.id);
  const [backgroundId, setBackgroundId] = useState(BACKGROUNDS[0]!.id);
  const [motivationId, setMotivationId] = useState(MOTIVATIONS[0]!.id);
  const trimmed = name.trim();

  const selectedBackground = BACKGROUNDS.find((b) => b.id === backgroundId);
  const selectedMotivation = MOTIVATIONS.find((m) => m.id === motivationId);

  const begin = async () => {
    await startNewAdventure(trimmed || "Wanderer", { raceId, backgroundId, motivation: motivationId });
    router.replace(routes.journey);
  };

  const Chip = ({ id, label, active, onPress, testID }: { id: string; label: string; active: boolean; onPress: () => void; testID: string }) => (
    <Pressable
      key={id}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      testID={testID}
      style={({ pressed }) => [
        styles.chip,
        { borderColor: active ? theme.gold : theme.goldBorder, backgroundColor: active ? theme.gold : theme.panel, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={{ color: active ? theme.background : theme.ink, fontWeight: active ? "700" : "500" }}>{label}</Text>
    </Pressable>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.display) }]} testID="new-adventure-title">
          New Adventure
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel" testID="new-adventure-cancel-button" style={[styles.closeButton, { borderColor: theme.goldBorder }]}>
          <Ionicons name="close" size={iconSize.standard} color={theme.gold} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Panel style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.inkMuted }]}>Hero name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Wanderer"
            placeholderTextColor={theme.inkMuted}
            maxLength={24}
            returnKeyType="done"
            testID="new-adventure-name-input"
            style={[styles.input, { color: theme.ink, fontFamily: fontFamily.displayBold, borderBottomColor: theme.goldBorder }]}
          />
        </Panel>

        <SectionHeader label="Ancestry" />
        <View style={styles.chipRow} testID="race-chips">
          {RACES.map((r) => (
            <Chip key={r.id} id={r.id} label={r.name} active={raceId === r.id} onPress={() => setRaceId(r.id)} testID={`race-${r.id}`} />
          ))}
        </View>

        <View style={styles.sectionGap} />
        <SectionHeader label="Background" />
        <View style={styles.chipRow} testID="background-chips">
          {BACKGROUNDS.map((b) => (
            <Chip key={b.id} id={b.id} label={b.name} active={backgroundId === b.id} onPress={() => setBackgroundId(b.id)} testID={`background-${b.id}`} />
          ))}
        </View>
        {selectedBackground && (
          <Text style={[styles.help, { color: theme.inkMuted }]} testID="background-help">
            {selectedBackground.description}
          </Text>
        )}

        <View style={styles.sectionGap} />
        <SectionHeader label="Motivation" />
        <View style={styles.chipRow} testID="motivation-chips">
          {MOTIVATIONS.map((m) => (
            <Chip key={m.id} id={m.id} label={m.name} active={motivationId === m.id} onPress={() => setMotivationId(m.id)} testID={`motivation-${m.id}`} />
          ))}
        </View>
        {selectedMotivation && <Text style={[styles.help, { color: theme.inkMuted }]}>{selectedMotivation.description}</Text>}

        <View style={[styles.warningRow, { borderColor: theme.goldBorder }]}>
          <Ionicons name="alert-circle-outline" size={iconSize.standard} color={theme.wax} />
          <Text style={[styles.warningText, { color: theme.inkMuted }]}>
            Starting a new adventure replaces your current save. Use Continue on the menu to keep playing your existing saga.
          </Text>
        </View>
      </ScrollView>

      <View testID="new-adventure-begin-wrap" style={styles.beginWrap}>
        <ActionButton
          label={loading ? "Forging your world..." : "Begin the saga"}
          onPress={begin}
          disabled={loading}
          accessibilityHint="Creates a new world and starts playing"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  title: { fontWeight: "800" },
  closeButton: { width: 32, height: 32, borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth * 2, alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: spacing.lg },
  field: { marginBottom: spacing.lg },
  fieldLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "700", marginBottom: spacing.sm },
  input: { fontSize: 24, fontWeight: "700", paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  chip: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 40, justifyContent: "center" },
  help: { fontSize: 13, lineHeight: 19, marginTop: spacing.sm, fontStyle: "italic" },
  sectionGap: { height: spacing.lg },
  warningRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md, padding: spacing.md, marginTop: spacing.xl },
  warningText: { flex: 1, fontSize: 13, lineHeight: 19 },
  beginWrap: { paddingTop: spacing.md },
});
