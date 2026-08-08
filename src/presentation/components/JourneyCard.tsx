import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/useTheme";
import { scaledFontSize, typeScale, iconSize, spacing } from "../theme/theme";
import { Panel } from "./Panel";
import { ObjectiveChecklist, type ObjectiveItem } from "./ObjectiveChecklist";

interface JourneyCardProps {
  title: string;
  detail: string;
  objectives?: ObjectiveItem[];
  onPress?: () => void;
}

/**
 * The mockup's Current Journey card also shows quest artwork, travel
 * distance, companion icons, and a difficulty indicator. Only the
 * objective checklist is backed by real data (`Quest.objectives`) — the
 * rest don't have systems behind them (no travel/companion/difficulty
 * model exists yet), so they're omitted rather than shown as decoration.
 */
export function JourneyCard({ title, detail, objectives, onPress }: JourneyCardProps) {
  const theme = useTheme();

  const content = (
    <Panel raised>
      <View style={styles.headerRow}>
        <View style={styles.iconWell}>
          <Ionicons name="compass" size={iconSize.emphasis} color={theme.gold} />
        </View>
        <View style={styles.textBlock}>
          <Text
            style={[styles.title, { color: theme.ink, fontSize: scaledFontSize(typeScale.title) }]}
            allowFontScaling
            maxFontSizeMultiplier={1.5}
          >
            {title}
          </Text>
          <Text style={[styles.detail, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.body) }]} numberOfLines={2}>
            {detail}
          </Text>
        </View>
        {onPress && <Ionicons name="chevron-forward" size={iconSize.standard} color={theme.inkMuted} />}
      </View>

      {objectives && <ObjectiveChecklist objectives={objectives} />}
    </Panel>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Current journey: ${title}`}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconWell: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  textBlock: { flex: 1 },
  title: { fontWeight: "700", marginBottom: 3 },
  detail: { lineHeight: 20 },
});
