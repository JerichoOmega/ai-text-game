import React from "react";
import { Image, StyleSheet, type ImageStyle, type StyleProp } from "react-native";

/**
 * Handcrafted antique-brass icon set (engraved manuscript style, transparent
 * PNGs) used selectively for primary navigation, major destinations, and the
 * headline Rest action. These carry their own brass coloring, so we never tint
 * them; the "active" state is a restrained opacity lift, keeping the etched
 * detail intact rather than flattening the artwork to a solid accent.
 */
const ICONS = {
  journey: require("../../../assets/images/icons/ic_journey.png"),
  chronicle: require("../../../assets/images/icons/ic_chronicle.png"),
  world: require("../../../assets/images/icons/ic_world.png"),
  character: require("../../../assets/images/icons/ic_character.png"),
  quest: require("../../../assets/images/icons/ic_quest.png"),
  rest: require("../../../assets/images/icons/ic_rest.png"),
} as const;

export type BrassIconName = keyof typeof ICONS;

interface BrassIconProps {
  name: BrassIconName;
  size?: number;
  /** Restrained active/inactive treatment via opacity (default active). */
  active?: boolean;
  style?: StyleProp<ImageStyle>;
}

export function BrassIcon({ name, size = 24, active = true, style }: BrassIconProps) {
  return (
    <Image
      source={ICONS[name]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
      style={[{ width: size, height: size, opacity: active ? 1 : 0.45 }, style]}
    />
  );
}

// (styles intentionally omitted — sizing is per-instance)
export const _brassIconStyles = StyleSheet.create({});
