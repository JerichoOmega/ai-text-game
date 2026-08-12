import React, { type ReactNode } from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useTheme } from "../theme/useTheme";
import { spacing } from "../theme/theme";
import { LoadingState } from "./LoadingState";
import { ChronicleBackground } from "./ChronicleBackground";

interface ScreenContainerProps {
  children?: ReactNode;
  /** When true, renders LoadingState instead of children. Every top-level
   * screen was independently writing `if (!world) return <LoadingState/>`
   * (or, on two screens, `return null` — a real inconsistency the polish
   * audit found and fixed screen-by-screen; this is the systemic fix that
   * makes that inconsistency structurally impossible to reintroduce). */
  loading?: boolean;
  loadingLabel?: string;
  edges?: Edge[];
  style?: ViewStyle;
}

export function ScreenContainer({ children, loading, loadingLabel, edges = ["top", "bottom"], style }: ScreenContainerProps) {
  const theme = useTheme();

  if (loading) {
    return <LoadingState label={loadingLabel} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ChronicleBackground />
      <SafeAreaView style={[styles.base, style]} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  base: { flex: 1, paddingHorizontal: spacing.lg, backgroundColor: "transparent" },
});
