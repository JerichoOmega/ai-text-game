import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/useTheme";
import { historyCategoryColor, scaledFontSize, typeScale, iconSize } from "../theme/theme";
import { Panel } from "./Panel";
import type { HistoryCategory } from "@/domain/types";

const CATEGORY_ICON: Record<HistoryCategory, keyof typeof Ionicons.glyphMap> = {
  political: "shield",
  military: "flag",
  economic: "cash",
  natural: "leaf",
  personal: "person",
};

interface ChronicleCardProps {
  headline: string;
  detail?: string;
  category: HistoryCategory;
  timeLabel?: string;
}

/**
 * The mockup uses painted-art thumbnails per event (a specific illustration
 * per headline). Generating or sourcing bespoke art per world event is out
 * of scope here — instead this uses a category emblem in a colored roundel,
 * which carries the same "at a glance, what kind of news is this" function
 * without needing an art pipeline. If per-event illustration becomes a
 * real feature, this is the one place the visual needs to change.
 *
 * Memoized: props are all primitives (strings/enum), so a shallow
 * comparison is exact here — cheap and correct, unlike memoizing a
 * component that takes object/callback props without also memoizing those.
 */
export const ChronicleCard = memo(function ChronicleCard({ headline, detail, category, timeLabel }: ChronicleCardProps) {
  const theme = useTheme();
  const emblemColor = historyCategoryColor[category];

  return (
    <Panel style={styles.card}>
      <View style={[styles.emblem, { backgroundColor: emblemColor + "26", borderColor: emblemColor }]}>
        <Ionicons name={CATEGORY_ICON[category]} size={iconSize.emphasis} color={emblemColor} />
      </View>
      <View style={styles.textBlock}>
        <Text
          style={[styles.headline, { color: theme.ink, fontSize: scaledFontSize(typeScale.title) }]}
          allowFontScaling
          maxFontSizeMultiplier={1.5}
          numberOfLines={2}
        >
          {headline}
        </Text>
        {detail && (
          <Text style={[styles.detail, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.body) }]} numberOfLines={2}>
            {detail}
          </Text>
        )}
        <Text style={[styles.time, { color: theme.inkMuted, fontSize: scaledFontSize(typeScale.caption) }]}>
          {timeLabel ?? category.charAt(0).toUpperCase() + category.slice(1)}
        </Text>
      </View>
    </Panel>
  );
});

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: 12, marginBottom: 12, alignItems: "flex-start" },
  emblem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { flex: 1 },
  headline: { fontWeight: "700", marginBottom: 3 },
  detail: { lineHeight: 20, marginBottom: 6 },
  time: {},
});
