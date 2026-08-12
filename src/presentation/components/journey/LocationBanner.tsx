import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/useTheme";
import { fontFamily, radii, scaledFontSize, spacing, typeScale } from "../../theme/theme";
import { JournalTriggerButton } from "../JournalTriggerButton";

const EASTBRIDGE = require("../../../../assets/journey/eastbridge.png");

interface LocationBannerProps {
  locationName: string;
  dateLabel: string;
  weatherLabel: string;
  weatherIcon: keyof typeof Ionicons.glyphMap;
  statusLabel: string;
  statusWarning: boolean;
  height: number;
  imageWidth: number;
}

/**
 * The hero anchor: an atmospheric settlement vista with the place name set
 * large over it. Dark overlays (top + bottom) guarantee text legibility over
 * painted art without hiding the scene. A gold crest, quiet calendar line, and
 * two compact chips (weather + realm stability) round out "where am I / what's
 * the state of things" — no four equal stat cards.
 */
export function LocationBanner(props: LocationBannerProps) {
  const theme = useTheme();
  return (
    <View style={[styles.frame, { width: Math.min(props.imageWidth, 760), borderColor: theme.goldBorder, height: props.height }]}>
      <Image source={EASTBRIDGE} style={styles.bgImage} resizeMode="cover" />
      <View style={[styles.scrim, styles.scrimTop]} />
      <View style={[styles.scrim, styles.scrimBottom]} />

      <View style={styles.contentFill}>
        <View style={styles.topRow}>
          <View style={styles.identity}>
            <View style={[styles.crest, { borderColor: theme.gold }]}>
              <Ionicons name="sparkles" size={18} color={theme.gold} />
            </View>
            <View style={styles.titleBlock}>
              <Text
                style={[styles.name, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.hero) }]}
                numberOfLines={1}
              >
                {props.locationName.toUpperCase()}
              </Text>
              <Text style={[styles.date, { color: theme.ink, fontSize: scaledFontSize(typeScale.caption) }]}>{props.dateLabel}</Text>
            </View>
          </View>
          <JournalTriggerButton />
        </View>

        <View style={styles.chipRow}>
          <Chip theme={theme} icon={props.weatherIcon} label={props.weatherLabel} />
          <Chip
            theme={theme}
            icon={props.statusWarning ? "alert-circle-outline" : "shield-checkmark-outline"}
            label={props.statusLabel}
            warn={props.statusWarning}
          />
        </View>
      </View>
    </View>
  );
}

function Chip({
  theme,
  icon,
  label,
  warn,
}: {
  theme: ReturnType<typeof useTheme>;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  warn?: boolean;
}) {
  return (
    <View style={[styles.chip, { borderColor: theme.goldBorder, backgroundColor: "rgba(10,8,6,0.6)" }]}>
      <Ionicons name={icon} size={13} color={warn ? theme.wax : theme.bronze} />
      <Text style={[styles.chipText, { color: warn ? theme.wax : theme.ink, fontSize: scaledFontSize(typeScale.eyebrow) }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: "center", borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.lg, overflow: "hidden" },
  bgImage: { position: "absolute", top: -110, left: 0, width: 780, height: 530 },
  contentFill: { ...StyleSheet.absoluteFillObject, justifyContent: "space-between" },
  scrim: { position: "absolute", left: 0, right: 0 },
  scrimTop: { top: 0, height: 120, backgroundColor: "rgba(8,6,4,0.62)" },
  scrimBottom: { bottom: 0, height: 90, backgroundColor: "rgba(8,6,4,0.5)" },
  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", padding: spacing.lg },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.md, flexShrink: 1 },
  crest: { width: 40, height: 40, borderRadius: radii.sm, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(10,8,6,0.55)" },
  titleBlock: { flexShrink: 1 },
  name: { letterSpacing: 1.5 },
  date: { marginTop: 2, letterSpacing: 0.5, fontStyle: "italic" },
  chipRow: { flexDirection: "row", gap: spacing.sm, padding: spacing.lg },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, borderWidth: StyleSheet.hairlineWidth },
  chipText: { fontWeight: "600", letterSpacing: 0.3 },
});
