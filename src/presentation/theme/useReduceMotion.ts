import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * iOS already exposes Reduce Motion as a system-wide accessibility setting
 * (Settings > Accessibility > Motion). Respecting it means reading that
 * setting, not adding an in-app toggle that duplicates it — a second
 * switch would just be one more thing to keep in sync with the OS and one
 * more place the user has to know to look. If product wants an in-app
 * override later, this hook is the one place that decision gets made.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
      setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
