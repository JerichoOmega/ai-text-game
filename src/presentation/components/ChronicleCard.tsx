import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/useTheme";
import { historyCategoryColor, scaledFontSize, typeScale, iconSize, radii, spacing } from "../theme/theme";
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
 * Matches the Design Bible's chronicle card (UI-002 / UI-005): a
 * category-tinted painted thumbnail on the left, the headline + detail +
 * timestamp in the middle, and a small heraldic shield in the category
 * color on the right. Bespoke per-event illustration is still out of scope
 * (no art pipeline), so the thumbnail is a category-tinted emblem well
 * rather than unique art — the one place to swap in real thumbnails later.
 *
 * Memoized: all props are primitives, so shallow compare is exact.
 */
export const ChronicleCard = memo(function ChronicleCard({ headline, detail, category, timeLabel }: ChronicleCardProps) {
  const theme = useTheme();
  const emblemColor = historyCategoryColor[category];

  return (
    <Panel style={styles.card}>
      <View style={[styles.thumb, { backgroundColor: emblemColor + "22", borderColor: emblemColor + "80" }]}>
        <Ionicons name={CATEGORY_ICON[category]} size={iconSize.hero} color={emblemColor} />
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

      <View style={styles.shieldWrap}>
        <Ionicons name="shield" size={iconSize.hero} color={emblemColor} />
      </View>
    </Panel>
  );
});

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md, alignItems: "center" },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: radii.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: { flex: 1 },
  headline: { fontWeight: "700", marginBottom: 3 },
  detail: { lineHeight: 20, marginBottom: 6 },
  time: {},
  shieldWrap: { width: 30, alignItems: "center", justifyContent: "center" },
});
