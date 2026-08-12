import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, radii, spacing, iconSize } from "@/presentation/theme/theme";
import { HapticManager } from "@/presentation/haptics/HapticManager";
import { DialogueSystem } from "@/systems/DialogueSystem";
import { portraitForNpc } from "@/presentation/npc/shopkeeperPortraits";
import { roleLabel } from "@/presentation/npc/npcPortrait";
import { emotionForRelationship } from "@/data/npcRegistry";
import { routes } from "@/presentation/navigation/routes";
import type { DialogueTopic } from "@/domain/types";

/**
 * Chronicle's official portrait-dominant NPC dialogue screen. The character
 * portrait is the visual focus; below it sits the NPC's current line and a
 * small set of deterministic response branches from DialogueSystem. Every
 * NPC — canonical key NPCs, shopkeepers entering conversation, and ordinary
 * generated NPCs — flows through this same screen and the single
 * portraitForNpc() resolver. No AI, no new gameplay: replies are resolved
 * from live world state only.
 */

/** Deterministic topic -> portrait emotion, so a canonical NPC's expression
 * shifts with the conversation. Non-canonical NPCs have one portrait and
 * simply ignore the emotion. Absent topics keep the relationship emotion. */
const TOPIC_EMOTION: Partial<Record<DialogueTopic, string>> = {
  news: "neutral",
  rumors: "amused",
  quest: "concerned",
};

export default function NpcDialogueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const router = useRouter();
  const world = useWorldStore((s) => s.world);
  const talkTo = useWorldStore((s) => s.talkTo);

  const npc = world && id ? world.npcs[id] : undefined;

  const baseEmotion = npc ? emotionForRelationship(npc.playerRelationship) : "neutral";
  const [emotion, setEmotion] = useState(baseEmotion);
  const [line, setLine] = useState<string>("");

  const greeting = useMemo(
    () => (npc && world ? DialogueSystem.getGreeting(npc, world) : ""),
    [npc, world]
  );
  const responses = useMemo(
    () => (npc && world ? DialogueSystem.getResponses(npc, world) : []),
    [npc, world]
  );

  // Record the conversation in NPC memory once, and seat the opening line.
  const openedRef = useRef(false);
  useEffect(() => {
    if (npc && !openedRef.current) {
      openedRef.current = true;
      setLine(greeting);
      setEmotion(baseEmotion);
      talkTo(npc.id);
    }
  }, [npc, greeting, baseEmotion, talkTo]);

  if (!world || !npc) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.inkMuted }} testID="npc-missing">This person isn't here.</Text>
      </SafeAreaView>
    );
  }

  const portrait = portraitForNpc(npc, emotion);
  const occupation = roleLabel(npc.role);

  const onPick = (topic: DialogueTopic, spoken: string) => {
    void HapticManager.light();
    if (topic === "shop") {
      router.push(routes.shop(npc.id));
      return;
    }
    if (topic === "leave") {
      void HapticManager.selection();
      router.back();
      return;
    }
    setEmotion(TOPIC_EMOTION[topic] ?? baseEmotion);
    setLine(DialogueSystem.getReply(npc, world, topic));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      {/* Compact header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            void HapticManager.selection();
            router.back();
          }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Leave the conversation"
          testID="npc-back-button"
          style={[styles.backButton, { borderColor: theme.goldBorder }]}
        >
          <Ionicons name="arrow-back" size={iconSize.standard} color={theme.gold} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.inkMuted }]}>Character</Text>
        <View style={styles.backButton} />
      </View>

      {/* Medium framed portrait bust — identity, not a full-screen hero */}
      <View style={styles.identity}>
        <View
          style={[styles.portraitFrame, { borderColor: theme.goldBorder, backgroundColor: theme.surface }]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${npc.name}, ${occupation}, looking ${emotion}`}
          testID="npc-portrait"
        >
          <Image source={portrait} style={styles.portrait} resizeMode="cover" />
        </View>
        <Text
          style={[styles.name, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.title) }]}
          numberOfLines={1}
          allowFontScaling
          maxFontSizeMultiplier={1.4}
          testID="npc-name"
        >
          {npc.name}
        </Text>
        <Text style={[styles.role, { color: theme.inkMuted }]} numberOfLines={1}>{occupation}</Text>
      </View>

      {/* NPC's spoken line — manuscript italic, distinct from player choices */}
      <View
        style={[styles.bubble, { borderColor: theme.goldBorder }]}
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${npc.name} says: ${line}`}
        testID="npc-line"
      >
        <Text
          style={[styles.bubbleText, { color: theme.ink, fontSize: scaledFontSize(typeScale.body) }]}
          allowFontScaling
          maxFontSizeMultiplier={1.6}
        >
          “{line}”
        </Text>
      </View>

      {/* Player choices — compact interface rows */}
      <ScrollView contentContainerStyle={styles.responses} showsVerticalScrollIndicator={false}>
        {responses.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => onPick(r.topic, r.label)}
            accessibilityRole="button"
            accessibilityLabel={r.label}
            testID={`npc-response-${r.topic}`}
            style={({ pressed }) => [
              styles.responseRow,
              {
                backgroundColor: r.topic === "leave" ? theme.panel : theme.surface,
                borderColor: theme.goldBorder,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons
              name={r.topic === "shop" ? "cart-outline" : r.topic === "leave" ? "exit-outline" : "chatbubble-ellipses-outline"}
              size={iconSize.inline}
              color={theme.bronze}
            />
            <Text
              style={[styles.responseText, { color: theme.ink, fontSize: scaledFontSize(typeScale.body) }]}
              allowFontScaling
              maxFontSizeMultiplier={1.5}
            >
              {r.label}
            </Text>
            <Ionicons name="chevron-forward" size={iconSize.inline} color={theme.inkMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerTitle: { fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: "700" },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  identity: { alignItems: "center", paddingTop: spacing.md, paddingBottom: spacing.sm },
  portraitFrame: {
    width: 168,
    height: 208,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
    padding: 3,
  },
  portrait: { width: "100%", height: "100%", borderRadius: radii.md },
  name: { fontWeight: "800", marginTop: spacing.md, letterSpacing: 0.5 },
  role: { textTransform: "capitalize", marginTop: 2, fontSize: 13 },
  bubble: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  bubbleText: { fontStyle: "italic", lineHeight: 23 },
  responses: { padding: spacing.lg, gap: spacing.sm + 2 },
  responseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 48,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  responseText: { flex: 1, fontWeight: "600" },
});
