import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWorldStore } from "@/state/useWorldStore";
import { useTheme } from "@/presentation/theme/useTheme";
import { fontFamily, scaledFontSize, typeScale, radii, spacing, iconSize } from "@/presentation/theme/theme";
import { HapticManager } from "@/presentation/haptics/HapticManager";
import { ChronicleBackground } from "@/presentation/components/ChronicleBackground";
import { DialogueSystem } from "@/systems/DialogueSystem";
import { portraitForNpc } from "@/presentation/npc/shopkeeperPortraits";
import { roleLabel } from "@/presentation/npc/npcPortrait";
import { emotionForRelationship } from "@/data/npcRegistry";
import { routes } from "@/presentation/navigation/routes";
import type { DialogueTopic } from "@/domain/types";

/**
 * Chronicle's illustrated encounter page. A medium framed portrait, set into
 * the leather page over a faint vignette, establishes the character; below it
 * the NPC's spoken line reads as an open manuscript quote (no bubble/box), and
 * player replies are printed manuscript lines resolved from DialogueSystem.
 * Every NPC flows through this one screen and the single portraitForNpc()
 * resolver. No AI, no new gameplay — replies come from live world state only.
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
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <ChronicleBackground />
        <SafeAreaView style={styles.center}>
          <Text style={{ color: theme.inkMuted }} testID="npc-missing">This person isn't here.</Text>
        </SafeAreaView>
      </View>
    );
  }

  const portrait = portraitForNpc(npc, emotion);
  const occupation = roleLabel(npc.role);

  const onPick = (topic: DialogueTopic, _spoken: string) => {
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
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ChronicleBackground />
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        {/* Minimal header — only the way back. */}
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
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={iconSize.standard} color={theme.gold} />
          </Pressable>
        </View>

        {/* Illustrated portrait set into the page over a faint vignette. */}
        <View style={styles.identity}>
          <View style={[styles.vignette, { backgroundColor: theme.surface }]} pointerEvents="none" />
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
            style={[styles.name, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.display) }]}
            numberOfLines={1}
            allowFontScaling
            maxFontSizeMultiplier={1.3}
            testID="npc-name"
          >
            {npc.name}
          </Text>
          <Text style={[styles.role, { color: theme.inkMuted }]} numberOfLines={1}>{occupation}</Text>
        </View>

        {/* Spoken line — an open manuscript quote, not a boxed bubble. */}
        <View
          style={styles.quoteWrap}
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${npc.name} says: ${line}`}
          testID="npc-line"
        >
          <Text
            style={[styles.quote, { color: theme.ink, fontFamily: fontFamily.display, fontSize: scaledFontSize(typeScale.title) }]}
            allowFontScaling
            maxFontSizeMultiplier={1.5}
          >
            “{line}”
          </Text>
        </View>

        <View style={[styles.quoteRule, { backgroundColor: theme.goldBorder }]} />

        {/* Player choices — printed manuscript lines. */}
        <ScrollView contentContainerStyle={styles.responses} showsVerticalScrollIndicator={false}>
          {responses.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => onPick(r.topic, r.label)}
              accessibilityRole="button"
              accessibilityLabel={r.label}
              testID={`npc-response-${r.topic}`}
              style={({ pressed }) => [styles.responseRow, { borderBottomColor: theme.goldBorder + "66", opacity: pressed ? 0.55 : 1 }]}
            >
              <Text
                style={[
                  styles.responseText,
                  { color: r.topic === "leave" ? theme.inkMuted : theme.ink, fontSize: scaledFontSize(typeScale.body) },
                ]}
                allowFontScaling
                maxFontSizeMultiplier={1.5}
              >
                {r.label}
              </Text>
              {r.topic === "leave" ? (
                <Ionicons name="arrow-forward" size={iconSize.inline} color={theme.bronze} />
              ) : (
                <Text style={[styles.marker, { color: theme.bronze }]}>·</Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  backButton: { width: 38, height: 38, alignItems: "flex-start", justifyContent: "center" },
  identity: { alignItems: "center", paddingTop: spacing.sm, paddingBottom: spacing.md },
  vignette: {
    position: "absolute",
    top: -20,
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.28,
  },
  portraitFrame: {
    width: 140,
    height: 172,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: "hidden",
    padding: 3,
  },
  portrait: { width: "100%", height: "100%", borderRadius: radii.sm },
  name: { fontWeight: "800", marginTop: spacing.md, letterSpacing: 0.5, textAlign: "center" },
  role: { textTransform: "uppercase", marginTop: 2, fontSize: 12, letterSpacing: 1.2 },
  quoteWrap: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.md },
  quote: { fontStyle: "italic", lineHeight: 30, textAlign: "center" },
  quoteRule: { height: StyleSheet.hairlineWidth, marginHorizontal: spacing.xxl, opacity: 0.7, marginBottom: spacing.xs },
  responses: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  responseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 46,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  responseText: { flex: 1, fontFamily: fontFamily.display },
  marker: { fontSize: 20, fontWeight: "700", opacity: 0.7 },
});
