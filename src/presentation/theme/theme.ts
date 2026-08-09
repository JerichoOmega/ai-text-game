import { PixelRatio, Platform } from "react-native";

/**
 * ============================================================================
 * DESIGN SYSTEM — LOCKED, v3 (Chronicle UI Theme Lock)
 * ============================================================================
 * This file is the canonical source of Chronicle's visual identity. Per the
 * project's design mandate: every screen, existing or new, should read
 * these tokens rather than hardcoding colors/type/spacing. If a new screen
 * has no mockup to match, it should still look like it belongs here by
 * using only what's defined in this file.
 *
 * Official palette mapping (doc name -> token):
 *   Background (deep charcoal/obsidian)  -> background
 *   Panels (dark leather)                -> panel
 *   Text (warm parchment)                -> ink / inkMuted
 *   Primary accent (antique gold)        -> gold / goldMuted / goldBorder
 *   Secondary accent (soft bronze)       -> bronze
 *   Alerts (muted crimson)               -> wax
 *   Positive (muted emerald)             -> forest
 *   Active/"this is you" (not in doc —   -> accent
 *     see rationale below)
 *
 * Signature choice not in the source doc, kept deliberately: the warm
 * gold+bronze framework is contrasted by ONE cool accent — a teal-cyan —
 * used ONLY for "this is active / this is you" states (the active tab, the
 * primary progress bar). The doc's official palette has no cool color, but
 * without one, "which tab am I on" has to be conveyed by gold-on-gold,
 * which is a real usability problem, not a style preference. This is the
 * one deliberate deviation from the locked palette, and it's contained to
 * exactly two use sites (active tab tint, XP bar) — see `accent` below.
 */

export const palette = {
  light: {
    background: "#EDE6D6", // aged vellum
    surface: "#F7F2E7",
    surfaceRaised: "#FFFCF5",
    panel: "#F2EBDB", // "dark leather" panel, light-mode equivalent
    ink: "#22262E", // "warm parchment" text, light-mode equivalent
    inkMuted: "#5B5748",
    gold: "#A9803F", // primary accent — darker for AA contrast on light bg
    goldMuted: "#D9C79A",
    bronze: "#8A6A4A", // secondary accent
    accent: "#2E8FA6", // the cool "active" accent — see file doc
    wax: "#8C2F2F", // alerts
    forest: "#3F6B4A", // positive
    border: "#D8CBAA",
    goldBorder: "#C4A15E",
  },
  dark: {
    background: "#0A0806", // deep obsidian / near-black (Design Bible)
    surface: "#141009",
    surfaceRaised: "#241B12",
    panel: "#211913", // warm dark leather, lifted just off the background
    ink: "#EFE8D8", // warm parchment
    inkMuted: "#9C9280",
    gold: "#C9A15C", // antique gold
    goldMuted: "#8A7245",
    bronze: "#B08A5E", // soft bronze — secondary accent, warmer/duller than gold
    accent: "#4FB3C9", // the cool "active" accent — used sparingly, see file doc
    wax: "#C4544F", // muted crimson
    forest: "#6FA37D", // muted emerald
    border: "#3A3024",
    goldBorder: "#6E5A34",
  },
} as const;

// Back-compat aliases for the pre-redesign names, so any component not yet
// migrated to the new tokens still resolves to something sane rather than
// crashing on `theme.brass`. New code should use `gold`/`goldMuted` directly;
// remove these once nothing references them (grep for `.brass` to check).
export const legacyAliases = (t: { gold: string; goldMuted: string }) => ({
  brass: t.gold,
  brassMuted: t.goldMuted,
});

export const historyCategoryColor = {
  political: palette.dark.gold,
  military: "#A5453F",
  economic: "#4F8A5B",
  natural: "#5C7FA3",
  personal: "#9B7FBF",
} as const;

/** Serif display face for titles/headers (per mockup: "CHRONICLE", section
 * labels), sans for body copy. No custom font file is bundled — Georgia
 * ships on iOS and gives the right character for zero asset weight. If a
 * bespoke display face is wanted later, swap this constant and load it via
 * expo-font; every screen already reads fonts through this one place. */
export const fontFamily = {
  display: Platform.select({ ios: "Georgia", android: "serif", default: "serif" }),
  displayBold: Platform.select({ ios: "Georgia-Bold", android: "serif", default: "serif" }),
  body: Platform.select({ ios: "System", android: "sans-serif", default: "System" }),
};

export const typeScale = {
  hero: 40,
  display: 28,
  title: 20,
  body: 16,
  caption: 13,
  eyebrow: 12,
};

/** Small-caps-style tracked label used for section headers throughout the
 * mockup ("THE WORLD TODAY", "LATEST CHRONICLE") — one function so every
 * instance of that treatment stays identical as the app grows. */
export const eyebrowStyle = {
  fontSize: typeScale.eyebrow,
  fontWeight: "700" as const,
  letterSpacing: 1.5,
  textTransform: "uppercase" as const,
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radii = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

/** Standard icon sizes. Audit (polish pass) found six near-arbitrary sizes
 * in use (12/16/18/20/22) with no logic behind which screen got which —
 * collapsed to four here. `inline` for text-adjacent icons (chips, list
 * bullets), `standard` for the default row/card icon, `emphasis` for
 * primary-action or header icons, `hero` for the one-per-screen big icon
 * (character portrait fallback glyph, empty-state icon). */
export const iconSize = { inline: 14, standard: 18, emphasis: 22, hero: 28 };

/** Press-feedback timing, shared by every interactive component via
 * `usePressScale` so buttons/rows/cards all feel like the same material
 * instead of each having its own hand-tuned animation. */
export const motionTiming = { press: 120, fade: 220 };

/** Soft shadow used on raised panels — subtle by design (the mockup's cards
 * separate from the background mostly through the gold border, not heavy
 * drop shadow). iOS-only shadow props + Android elevation in one place. */
export const softShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 10,
  elevation: 4,
};

export function scaledFontSize(base: number): number {
  const scale = Math.min(PixelRatio.getFontScale(), 1.6);
  return Math.round(base * scale);
}

export function getTheme(scheme: "light" | "dark"): Theme {
  const base = palette[scheme];
  return { ...base, ...legacyAliases(base) };
}

export interface Theme {
  background: string;
  surface: string;
  surfaceRaised: string;
  panel: string;
  ink: string;
  inkMuted: string;
  gold: string;
  goldMuted: string;
  bronze: string;
  accent: string;
  wax: string;
  forest: string;
  border: string;
  goldBorder: string;
  brass: string;
  brassMuted: string;
}
