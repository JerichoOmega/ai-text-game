import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, radii, spacing, iconSize } from "@/presentation/theme/theme";
import { ActionButton } from "@/presentation/components/ActionButton";
import { ChronicleBackground } from "@/presentation/components/ChronicleBackground";
import { SectionLabel } from "@/presentation/components/SectionLabel";
import { routes } from "@/presentation/navigation/routes";
import { RACES, BACKGROUNDS, MOTIVATIONS } from "@/data/origins";

/**
 * New Adventure / character creation, presented as pages of a character
 * ledger: an intro passage, a large serif name field, and compact selection
 * groups with flavor text. No boxed form fields — the manuscript is the frame.
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
      style={({ pressed }) => [styles.option, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Text
        style={[
          styles.optionText,
          {
            color: active ? theme.gold : theme.inkMuted,
            fontFamily: active ? fontFamily.displayBold : fontFamily.display,
          },
        ]}
      >
        {label}
      </Text>
      <View style={[styles.optionRule, { backgroundColor: active ? theme.gold : "transparent" }]} />
    </Pressable>
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ChronicleBackground />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.container, { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.md }]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.display) }]} testID="new-adventure-title">
            A New Saga
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Cancel" testID="new-adventure-cancel-button" style={[styles.closeButton, { borderColor: theme.goldBorder }]}>
            <Ionicons name="close" size={iconSize.standard} color={theme.gold} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={[styles.intro, { color: theme.inkMuted }]}>
            Every legend begins with a name. Shape the wanderer whose deeds the realm will remember.
          </Text>

          <SectionLabel label="Name Your Hero" tone="gold" />
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

          <View style={styles.groupGap} />
          <SectionLabel label="Ancestry" />
          <View style={styles.chipRow} testID="race-chips">
            {RACES.map((r) => (
              <Chip key={r.id} id={r.id} label={r.name} active={raceId === r.id} onPress={() => setRaceId(r.id)} testID={`race-${r.id}`} />
            ))}
          </View>

          <View style={styles.groupGap} />
          <SectionLabel label="Background" />
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

          <View style={styles.groupGap} />
          <SectionLabel label="Motivation" />
          <View style={styles.chipRow} testID="motivation-chips">
            {MOTIVATIONS.map((m) => (
              <Chip key={m.id} id={m.id} label={m.name} active={motivationId === m.id} onPress={() => setMotivationId(m.id)} testID={`motivation-${m.id}`} />
            ))}
          </View>
          {selectedMotivation && <Text style={[styles.help, { color: theme.inkMuted }]}>{selectedMotivation.description}</Text>}

          <View style={styles.warningRow}>
            <Ionicons name="alert-circle-outline" size={iconSize.inline} color={theme.wax} />
            <Text style={[styles.warningText, { color: theme.inkMuted }]}>
              Beginning a new saga replaces your current save. Choose Continue on the menu to keep your existing story.
            </Text>
          </View>
        </ScrollView>

        <View testID="new-adventure-begin-wrap" style={styles.beginWrap}>
          <ActionButton
            label={loading ? "Forging your world..." : "Begin the Saga"}
            onPress={begin}
            disabled={loading}
            accessibilityHint="Creates a new world and starts playing"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.lg },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  title: { fontWeight: "800", letterSpacing: 1 },
  closeButton: { width: 32, height: 32, borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth * 2, alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: spacing.lg },
  intro: { fontSize: 14, lineHeight: 21, fontStyle: "italic", marginBottom: spacing.xl },
  input: { fontSize: 26, fontWeight: "700", paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  groupGap: { height: spacing.xl },
  chipRow: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.xl, rowGap: spacing.md },
  option: { alignItems: "center", paddingVertical: spacing.xs },
  optionText: { fontSize: 18, letterSpacing: 0.5 },
  optionRule: { height: 2, borderRadius: 1, alignSelf: "stretch", marginTop: 4, minWidth: 24 },
  help: { fontSize: 13, lineHeight: 19, marginTop: spacing.md, fontStyle: "italic" },
  warningRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start", marginTop: spacing.xxl },
  warningText: { flex: 1, fontSize: 12, lineHeight: 18 },
  beginWrap: { paddingTop: spacing.md },
});
