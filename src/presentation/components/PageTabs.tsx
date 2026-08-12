import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../theme/useTheme";
import { fontFamily, scaledFontSize, spacing } from "../theme/theme";

interface PageTab<T extends string> {
  key: T;
  label: string;
}

interface PageTabsProps<T extends string> {
  tabs: PageTab<T>[];
  active: T;
  onChange: (key: T) => void;
  /** testID becomes `${testIDPrefix}-${key}` per tab (preserves existing ids). */
  testIDPrefix: string;
  containerTestID?: string;
}

/**
 * Chapter/page tabs for a book, not a modern segmented control: serif labels
 * with an underline on the active page, sitting on a single thin brass rule —
 * like the ruled tabs of a bound chronicle. No filled pills, no boxes.
 */
export function PageTabs<T extends string>({ tabs, active, onChange, testIDPrefix, containerTestID }: PageTabsProps<T>) {
  const theme = useTheme();
  return (
    <View style={styles.wrap} testID={containerTestID}>
      <View style={styles.row}>
        {tabs.map((t) => {
          const selected = t.key === active;
          return (
            <Pressable
              key={t.key}
              onPress={() => onChange(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              testID={`${testIDPrefix}-${t.key}`}
              style={styles.tab}
            >
              <Text
                style={[
                  styles.label,
                  { color: selected ? theme.gold : theme.inkMuted, fontFamily: selected ? fontFamily.displayBold : fontFamily.display },
                ]}
                allowFontScaling
                maxFontSizeMultiplier={1.3}
              >
                {t.label}
              </Text>
              <View style={[styles.underline, { backgroundColor: selected ? theme.gold : "transparent" }]} />
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.rule, { backgroundColor: theme.goldBorder }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.lg, marginBottom: spacing.lg },
  row: { flexDirection: "row", gap: spacing.xl },
  tab: { alignItems: "center", paddingBottom: spacing.sm },
  label: { fontSize: scaledFontSize(16), letterSpacing: 0.5 },
  underline: { height: 2, borderRadius: 1, alignSelf: "stretch", marginTop: spacing.sm },
  rule: { height: StyleSheet.hairlineWidth, opacity: 0.7, marginTop: -StyleSheet.hairlineWidth },
});
