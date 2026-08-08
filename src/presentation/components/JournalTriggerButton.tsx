import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/useTheme";
import { HapticManager } from "../haptics/HapticManager";
import { routes } from "../navigation/routes";

/**
 * Present on every tab screen (top-right) so the Adventure Journal is
 * reachable from anywhere in one tap, matching "no duplicated navigation" —
 * this is the single entry point, not a per-screen menu button that
 * happens to do the same thing differently on each screen.
 */
export function JournalTriggerButton() {
  const theme = useTheme();
  const router = useRouter();

  const handlePress = () => {
    void HapticManager.light();
    router.push(routes.journal);
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Open Adventure Journal"
      hitSlop={8}
      style={[styles.button, { borderColor: theme.goldBorder, backgroundColor: theme.panel }]}
    >
      <Ionicons name="book" size={18} color={theme.gold} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
