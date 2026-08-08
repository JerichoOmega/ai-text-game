import React from "react";
import { View, StyleSheet, type ViewStyle, type ViewProps } from "react-native";
import { useTheme } from "../theme/useTheme";
import { radii, softShadow } from "../theme/theme";

interface PanelProps extends Pick<ViewProps, "accessible" | "accessibilityLabel" | "accessibilityRole"> {
  children: React.ReactNode;
  bordered?: boolean;
  raised?: boolean;
  style?: ViewStyle;
}

/**
 * The one card primitive. Every panel-like surface in the app (chronicle
 * cards, stat chips, menu rows, the journey card) should render through
 * this rather than re-declaring `backgroundColor`/`borderRadius`/`border`
 * inline — that's what keeps the "obsidian + gold border" language
 * consistent as more screens get built. Forwards a deliberately narrow set
 * of accessibility props (not all of `ViewProps`) so callers can group
 * content for VoiceOver (see StatChip) without Panel becoming a catch-all
 * pass-through that hides what's actually supported.
 */
export function Panel({ children, bordered = true, raised = false, style, accessible, accessibilityLabel, accessibilityRole }: PanelProps) {
  const theme = useTheme();

  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      style={[
        styles.base,
        { backgroundColor: theme.panel, borderColor: bordered ? theme.goldBorder : "transparent" },
        raised && softShadow,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: 16,
  },
});
