import React, { Component, type ReactNode } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Logger } from "@/utils/logger";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Wraps the whole app (see app/_layout.tsx) so a thrown error in any
 * single screen degrades to a recoverable fallback instead of a blank
 * screen. Deliberately does NOT import `useTheme` or any theme token —
 * this is the one component that must render correctly even if the crash
 * that triggered it originated inside the theme system, so its colors are
 * hardcoded here rather than sourced from the thing that might be broken.
 *
 * Must be a class component: `componentDidCatch`/`getDerivedStateFromError`
 * have no hook equivalent in React as of this writing.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    Logger.error("ErrorBoundary", `Caught an unhandled error: ${error.message}`, info.componentStack);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          Chronicle hit an unexpected error. Your progress up to the last autosave is safe.
        </Text>
        {__DEV__ && <Text style={styles.debug}>{this.state.error.message}</Text>}
        <Pressable onPress={this.reset} style={styles.button} accessibilityRole="button" accessibilityLabel="Try again">
          <Text style={styles.buttonLabel}>Try Again</Text>
        </Pressable>
      </View>
    );
  }
}

// Hardcoded, not theme tokens — see class doc comment above for why.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0D0B", alignItems: "center", justifyContent: "center", padding: 24 },
  title: { color: "#EFE8D8", fontSize: 20, fontWeight: "700", marginBottom: 12 },
  message: { color: "#9C9280", fontSize: 15, textAlign: "center", marginBottom: 16, lineHeight: 21 },
  debug: { color: "#C4544F", fontSize: 12, textAlign: "center", marginBottom: 16, fontFamily: "Courier" },
  button: { backgroundColor: "#C9A15C", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  buttonLabel: { color: "#0F0D0B", fontWeight: "700" },
});
