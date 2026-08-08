import { useRef } from "react";
import { Animated } from "react-native";
import { motionTiming } from "./theme";
import { useReduceMotion } from "./useReduceMotion";

/**
 * A small, deliberately subtle scale-down on press (0.97), used instead of
 * opacity-only feedback. Reduce Motion is respected by skipping the
 * animation entirely and falling back to an instant, non-animated value —
 * the visual state still changes (so touch feedback isn't silently
 * removed) but nothing moves.
 */
export function usePressScale() {
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    if (reduceMotion) return;
    Animated.timing(scale, { toValue: 0.97, duration: motionTiming.press, useNativeDriver: true }).start();
  };

  const onPressOut = () => {
    if (reduceMotion) return;
    Animated.timing(scale, { toValue: 1, duration: motionTiming.press, useNativeDriver: true }).start();
  };

  return { scale, onPressIn, onPressOut, reduceMotion };
}
