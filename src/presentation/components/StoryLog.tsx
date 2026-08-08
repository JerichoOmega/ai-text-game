import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useTheme } from "../theme/useTheme";
import { scaledFontSize, typeScale } from "../theme/theme";

interface StoryLogProps {
  lines: string[];
}

export function StoryLog({ lines }: StoryLogProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.panel, borderColor: theme.goldBorder }]}>
      <FlashList
        data={lines}
        estimatedItemSize={44}
        keyExtractor={(_, index) => String(index)}
        renderItem={({ item }) => (
          <Text
            style={[styles.line, { color: theme.ink, fontSize: scaledFontSize(typeScale.body) }]}
            allowFontScaling
            maxFontSizeMultiplier={1.6}
          >
            {item}
          </Text>
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.inkMuted }]}>Your story hasn't begun yet.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  line: {
    paddingVertical: 6,
    lineHeight: 22,
  },
  empty: {
    padding: 16,
    fontStyle: "italic",
  },
});
