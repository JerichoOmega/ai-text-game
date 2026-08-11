import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, radii, spacing, iconSize } from "@/presentation/theme/theme";
import { ActionButton } from "@/presentation/components/ActionButton";
import { Panel } from "@/presentation/components/Panel";
import { routes } from "@/presentation/navigation/routes";

/**
 * The "New Adventure" flow reachable from the Main Menu: name the hero,
 * then start a fresh saga. This overwrites any existing save (stated on the
 * screen, since it's destructive), seeds a brand-new world through
 * SaveManager.createNewWorld, and drops the player into the Journey tab.
 */
export default function NewAdventureScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const startNewAdventure = useWorldStore((s) => s.startNewAdventure);
  const loading = useWorldStore((s) => s.loading);

  const [name, setName] = useState("");
  const trimmed = name.trim();

  const begin = async () => {
    await startNewAdventure(trimmed || "Wanderer");
    router.replace(routes.journey);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }]}
    >
      <View style={styles.headerRow}>
        <Text
          style={[styles.title, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.display) }]}
          testID="new-adventure-title"
        >
          New Adventure
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          testID="new-adventure-cancel-button"
          style={[styles.closeButton, { borderColor: theme.goldBorder }]}
        >
          <Ionicons name="close" size={iconSize.standard} color={theme.gold} />
        </Pressable>
      </View>

      <Text style={[styles.subtitle, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.body) }]}>
        Name your hero and begin a fresh saga. The world will remember everything from here on.
      </Text>

      <Panel style={styles.field}>
        <Text style={[styles.fieldLabel, { color: theme.inkMuted }]}>Hero name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Wanderer"
          placeholderTextColor={theme.inkMuted}
          maxLength={24}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={begin}
          testID="new-adventure-name-input"
          style={[styles.input, { color: theme.ink, fontFamily: fontFamily.displayBold, borderBottomColor: theme.goldBorder }]}
        />
      </Panel>

      <View style={[styles.warningRow, { borderColor: theme.goldBorder }]}>
        <Ionicons name="alert-circle-outline" size={iconSize.standard} color={theme.wax} />
        <Text style={[styles.warningText, { color: theme.inkMuted }]}>
          Starting a new adventure replaces your current save. Use Continue on the menu to keep playing your existing saga.
        </Text>
      </View>

      <View style={styles.spacer} />

      <View testID="new-adventure-begin-wrap">
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
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: { lineHeight: 22, marginBottom: spacing.xl },
  field: { marginBottom: spacing.lg },
  fieldLabel: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "700", marginBottom: spacing.sm },
  input: {
    fontSize: 24,
    fontWeight: "700",
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  warningRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  warningText: { flex: 1, fontSize: 13, lineHeight: 19 },
  spacer: { flex: 1 },
});
