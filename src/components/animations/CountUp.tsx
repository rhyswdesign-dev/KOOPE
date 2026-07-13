/**
 * CountUp
 * Animated number ticker for XP, streaks, and stats — the value rolls up
 * on the UI thread instead of snapping. Numbers that visibly grow are one
 * of the strongest "progress is happening" retention cues.
 *
 * Usage:
 *   <CountUp value={xpBalance} style={styles.xpText} prefix="+" suffix=" XP" />
 */

import React, { useEffect } from 'react';
import { TextInput, StyleSheet, type TextStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { durations } from '../../theme/tokens';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export interface CountUpProps {
  value: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
  /** Round displayed value to this many decimals (default 0) */
  decimals?: number;
  style?: StyleProp<TextStyle>;
}

export default function CountUp({
  value,
  durationMs = durations.slow,
  prefix = '',
  suffix = '',
  decimals = 0,
  style,
}: CountUpProps) {
  const reducedMotion = useReducedMotion();
  const animatedValue = useSharedValue(value);

  useEffect(() => {
    if (reducedMotion) {
      animatedValue.value = value;
      return;
    }
    animatedValue.value = withTiming(value, {
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, durationMs, reducedMotion, animatedValue]);

  const animatedProps = useAnimatedProps(() => {
    const display = animatedValue.value.toFixed(decimals);
    return { text: `${prefix}${display}${suffix}` } as any;
  });

  return (
    <AnimatedTextInput
      editable={false}
      defaultValue={`${prefix}${value.toFixed(decimals)}${suffix}`}
      animatedProps={animatedProps}
      style={[styles.text, style]}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    padding: 0,           // TextInput adds platform padding; strip it
    includeFontPadding: false,
  } as TextStyle,
});
