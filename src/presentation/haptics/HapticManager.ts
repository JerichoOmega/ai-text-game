import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { useUIStore } from "@/state/useUIStore";

/**
 * Callers never see expo-haptics or the hapticsEnabled setting — they call
 * a semantic method and the manager decides whether anything actually
 * fires. This is what let three call sites (ActionButton, MenuRow,
 * JournalTriggerButton) each independently reimplementing
 * `if (hapticsEnabled) Haptics.impactAsync(...)` collapse to one line each,
 * and it's what a fourth future call site should do too — call
 * `HapticManager.x()`, never `expo-haptics` directly.
 *
 * `useUIStore.getState()` (not the `useUIStore()` hook) is used
 * deliberately: these methods are called from event handlers, not from
 * inside a React render, so there's nothing to subscribe to — reading the
 * current value once at call time is correct and avoids forcing every
 * caller to be a component that can use a hook.
 */
function hapticsEnabled(): boolean {
  return useUIStore.getState().hapticsEnabled;
}

/**
 * expo-haptics has no web implementation and rejects on some
 * Android/simulator combinations without real haptic hardware. Neither of
 * those is a real error from the player's perspective — there's nothing
 * for them to act on — so failures are swallowed rather than surfaced.
 */
async function safeTrigger(fn: () => Promise<void>): Promise<void> {
  if (!hapticsEnabled()) return;
  if (Platform.OS === "web") return;
  try {
    await fn();
  } catch {
    // Unsupported platform/device combination — no-op.
  }
}

export const HapticManager = {
  /** Picker/segmented-control style feedback — lightest available. Not yet called from anywhere; see docs for when to use it. */
  selection(): Promise<void> {
    return safeTrigger(() => Haptics.selectionAsync());
  },
  /** Default tap feedback — buttons, rows, the journal trigger. */
  light(): Promise<void> {
    return safeTrigger(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  /** Not yet called from anywhere — reserved for a mid-weight confirmation (e.g. equipping an item) once that feature exists. */
  medium(): Promise<void> {
    return safeTrigger(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  },
  /** Destructive/high-stakes actions — currently only the danger-variant ActionButton. */
  heavy(): Promise<void> {
    return safeTrigger(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
  },
  /** Not yet called from anywhere — reserved for quest completion, level up, achievement unlock once those have UI hooks. */
  success(): Promise<void> {
    return safeTrigger(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  /** Not yet called from anywhere — reserved for e.g. low-HP warnings once combat exists. */
  warning(): Promise<void> {
    return safeTrigger(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
  },
  /** Not yet called from anywhere — reserved for e.g. combat defeat once combat has a screen. */
  error(): Promise<void> {
    return safeTrigger(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
};
