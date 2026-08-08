import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily } from "@/presentation/theme/theme";
import { ErrorBoundary } from "@/presentation/components/ErrorBoundary";

/**
 * ErrorBoundary wraps at the outermost level — outside SafeAreaProvider,
 * outside anything that calls useTheme() — deliberately. An error boundary
 * only catches errors thrown by its children's render; if useTheme() (or
 * SafeAreaProvider itself) is what's throwing, the boundary has to be
 * rendered by something ABOVE that code, not beside or inside it. That's
 * why this file has two components instead of one.
 */
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const initialize = useWorldStore((s) => s.initialize);
  const theme = useTheme();

  useEffect(() => {
    // First-run seeds a new world; subsequent launches load the save
    // straight from SQLite. Fixed player name for the vertical slice —
    // a name-entry screen is an easy follow-up once this loop is proven.
    void initialize("Wanderer");
  }, [initialize]);

  return (
    <SafeAreaProvider>
      <StatusBar style={theme.scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.gold,
          headerTitleStyle: { fontWeight: "700", fontFamily: fontFamily.displayBold },
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        {/* The 4-tab experience lives entirely inside this one Stack.Screen;
         * everything below pushes OVER the tabs. `journal` is presented as
         * a modal (matching the mockup's overlay treatment — it slides up
         * over whatever tab was active rather than replacing it in the
         * stack), NPC detail and quest log push normally, `settings` pushes
         * from inside the journal. */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="journal" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="npc/[id]" options={{ title: "" }} />
        <Stack.Screen name="quests/index" options={{ title: "Quest Log" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
