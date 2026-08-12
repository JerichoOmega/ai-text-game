import React from "react";
import { View, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { radii } from "../../theme/theme";

interface OrnateFrameProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  tone?: "panel" | "crimson";
}

/**
 * A brass-framed panel with subtle corner brackets — the recurring "journal
 * plate" from the reference board. Corners are drawn with thin gold rules
 * rather than heavy ornament art, so the fantasy identity reads without every
 * panel looking like a picture frame. Applied only to major sections.
 */
export function OrnateFrame({ children, style, contentStyle, tone = "panel" }: OrnateFrameProps) {
  const theme = useTheme();
  const bg = tone === "crimson" ? "rgba(122,42,40,0.28)" : theme.panel;
  const border = tone === "crimson" ? theme.wax : theme.goldBorder;

  return (
    <View style={[styles.frame, { backgroundColor: bg, borderColor: border }, style]}>
      <Corner theme={theme} pos="tl" />
      <Corner theme={theme} pos="tr" />
      <Corner theme={theme} pos="bl" />
      <Corner theme={theme} pos="br" />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

function Corner({ theme, pos }: { theme: ReturnType<typeof useTheme>; pos: "tl" | "tr" | "bl" | "br" }) {
  const base: ViewStyle = { position: "absolute", width: 14, height: 14, borderColor: theme.gold };
  const map: Record<string, ViewStyle> = {
    tl: { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: radii.md },
    tr: { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: radii.md },
    bl: { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: radii.md },
    br: { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: radii.md },
  };
  return <View pointerEvents="none" style={[base, map[pos]]} />;
}

const styles = StyleSheet.create({
  frame: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radii.md },
  content: { padding: 16 },
});
