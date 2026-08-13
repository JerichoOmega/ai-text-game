import React from "react";
import { View, Text, StyleSheet, Image, ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/useTheme";
import { fontFamily, radii, scaledFontSize, spacing, typeScale } from "../../theme/theme";
import { GENERIC_SETTLEMENT_ART } from "./locationArtwork";

interface LocationBannerProps {
  locationName: string;
  dateLabel: string;
  weatherLabel: string;
  weatherIcon: keyof typeof Ionicons.glyphMap;
  statusLabel: string;
  statusWarning: boolean;
  height: number;
  imageWidth: number;
  /** Resolved hero artwork; falls back to the generic settlement vista. */
  artworkSource?: ImageSourcePropType;
}

/**
 * The chapter plate: a clean, unobstructed settlement illustration with the
 * place name and its quiet almanac line set BELOW the painting — like the
 * captioned plate opening a chapter of a travel chronicle. The art carries no
 * overlaid chrome so it can actually be appreciated; hierarchy for the
 * caption comes from serif type + a hairline rule, never a boxed panel.
 */
export function LocationBanner(props: LocationBannerProps) {
  const theme = useTheme();
  const frameWidth = Math.min(props.imageWidth, 760);
  return (
    <View style={styles.wrap}>
      <View style={[styles.frame, { width: frameWidth, height: props.height, borderColor: theme.goldBorder }]}>
        <Image source={props.artworkSource ?? GENERIC_SETTLEMENT_ART} style={styles.image} resizeMode="cover" />
        {/* The faintest bottom fade so the plate seats into the page, not a scrim over the scene. */}
        <View style={[styles.plateFade, { backgroundColor: theme.background }]} pointerEvents="none" />
      </View>

      <View style={styles.caption}>
        <Text
          style={[styles.name, { color: theme.gold, fontFamily: fontFamily.displayBold, fontSize: scaledFontSize(typeScale.display) }]}
          numberOfLines={1}
          allowFontScaling
          maxFontSizeMultiplier={1.3}
        >
          {props.locationName}
        </Text>

        <View style={styles.ornament}>
          <View style={[styles.ornRule, { backgroundColor: theme.goldBorder }]} />
          <View style={[styles.ornDiamond, { backgroundColor: theme.gold }]} />
          <View style={[styles.ornRule, { backgroundColor: theme.goldBorder }]} />
        </View>

        <Text style={[styles.date, { color: theme.inkMuted, fontFamily: fontFamily.display, fontSize: scaledFontSize(typeScale.caption) }]}>
          {props.dateLabel}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name={props.weatherIcon} size={13} color={theme.bronze} />
          <Text style={[styles.metaText, { color: theme.inkMuted }]}>{props.weatherLabel}</Text>
          <Text style={[styles.metaDot, { color: theme.goldBorder }]}>·</Text>
          <Ionicons
            name={props.statusWarning ? "alert-circle-outline" : "shield-checkmark-outline"}
            size={13}
            color={props.statusWarning ? theme.wax : theme.bronze}
          />
          <Text style={[styles.metaText, { color: props.statusWarning ? theme.wax : theme.inkMuted }]}>{props.statusLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  frame: { alignSelf: "center", borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md, overflow: "hidden" },
  image: { width: "100%", height: "100%" },
  plateFade: { position: "absolute", left: 0, right: 0, bottom: 0, height: "20%", opacity: 0.35 },
  caption: { alignItems: "center", paddingTop: spacing.md, paddingHorizontal: spacing.lg },
  name: { letterSpacing: 1.5, textAlign: "center" },
  ornament: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.sm },
  ornRule: { width: 26, height: StyleSheet.hairlineWidth, opacity: 0.8 },
  ornDiamond: { width: 5, height: 5, transform: [{ rotate: "45deg" }], opacity: 0.85 },
  date: { letterSpacing: 0.5, fontStyle: "italic" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap", justifyContent: "center" },
  metaText: { fontSize: 12, letterSpacing: 0.3 },
  metaDot: { fontSize: 12, marginHorizontal: 2 },
});
