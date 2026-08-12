import React, { useEffect } from "react";
import { Tabs } from "expo-router";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/presentation/theme/useTheme";
import { MusicDirector } from "@/presentation/audio/MusicDirector";

/**
 * The official four-tab structure (Chronicle UI Theme Lock): Journey,
 * Character, Chronicle, World. Everything else lives in the Adventure
 * Journal overlay (app/journal.tsx), opened via the compass button each tab
 * screen renders in its header — see JournalTriggerButton. Icon choice is
 * deliberately literal (compass for the active journey, an open book for
 * the chronicle) rather than abstract, matching the "handcrafted, not
 * generic app" direction. Active-tab color uses `theme.accent` — the one
 * cool color in an otherwise warm-gold system — never gold itself, so
 * "this is where I am" reads as a distinct signal from "this is
 * important/valuable" (which gold means everywhere else in the app).
 */
export default function TabsLayout() {
  const theme = useTheme();

  // Entering the four-tab gameplay experience starts the default background
  // music ("The First Page"), which loops and respects the existing
  // music/master volume + mute state (AudioManager). Leaving gameplay (back
  // to the main menu, which unmounts this layout) stops it; returning
  // re-starts it. Requests the semantic cue only — never the file directly.
  // If the track fails to load, AudioManager logs and returns false; the
  // game keeps running silently.
  useEffect(() => {
    MusicDirector.playExploration();
    return () => MusicDirector.stop();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.inkMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.goldBorder,
          borderTopWidth: StyleSheet.hairlineWidth * 2,
          height: 62,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
        tabBarItemStyle: { paddingTop: 2 },
      }}
    >
      <Tabs.Screen
        name="journey"
        options={{
          title: "Journey",
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="character"
        options={{
          title: "Character",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chronicle"
        options={{
          title: "Chronicle",
          tabBarIcon: ({ color, size }) => <Ionicons name="book" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="world"
        options={{
          title: "World",
          tabBarIcon: ({ color, size }) => <Ionicons name="globe" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
