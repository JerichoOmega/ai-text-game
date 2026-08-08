import { useColorScheme } from "react-native";
import { useUIStore } from "@/state/useUIStore";
import { getTheme, type Theme } from "./theme";

export interface ResolvedTheme extends Theme {
  /** Exposed so screens/layout can key native-component theming (StatusBar
   * style, tab bar background) off the resolved scheme directly, instead
   * of string-comparing a color value against a hex constant that will
   * silently break the moment the palette changes. */
  scheme: "light" | "dark";
}

export function useTheme(): ResolvedTheme {
  const themeMode = useUIStore((s) => s.themeMode);
  const systemScheme = useColorScheme();
  const scheme = themeMode === "system" ? (systemScheme === "dark" ? "dark" : "light") : themeMode;
  return { ...getTheme(scheme), scheme };
}
