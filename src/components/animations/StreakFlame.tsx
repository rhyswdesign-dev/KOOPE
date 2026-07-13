/**
 * StreakFlame
 * A living flame for the daily streak: flickers gently, and burns bigger
 * and faster as the streak grows. A streak the user can *see* breathing
 * is much harder to abandon than a static icon.
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/tokens';

export interface StreakFlameProps {
  /** Current streak count; drives flicker speed and glow */
  streak: number;
  size?: number;
  /** Show the count next to the flame */
  showCount?: boolean;
}

/** 0 = cold ember, 1 = raging */
function intensityFor(streak: number): number {
  if (streak >= 30) return 1;
  if (streak >= 14) return 0.8;
  if (streak >= 7) return 0.6;
  if (streak >= 3) return 0.4;
  return 0.2;
}

export default function StreakFlame({ streak, size = 28, showCount = true }: StreakFlameProps) {
  const reducedMotion = useReducedMotion();
  const flicker = useSharedValue(0);
  const intensity = intensityFor(streak);

  useEffect(() => {
    if (reducedMotion) return;
    const beat = 520 - intensity * 240; // hotter streak flickers faster
    flicker.value = withRepeat(
      withSequence(
        withTiming(1, { duration: beat, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: beat * 1.15, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    );
  }, [reducedMotion, intensity, flicker]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(flicker.value, [0, 1], [1, 1 + 0.06 + intensity * 0.08]) },
      { rotate: `${interpolate(flicker.value, [0, 1], [-2, 2]) * intensity * 2}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flicker.value, [0, 1], [0.15 + intensity * 0.2, 0.35 + intensity * 0.35]),
    transform: [{ scale: interpolate(flicker.value, [0, 1], [1.3, 1.6 + intensity * 0.4]) }],
  }));

  const flameColor = streak >= 7 ? colors.accentDark : colors.warning;

  return (
    <View style={styles.row}>
      <View style={{ width: size * 1.4, height: size * 1.4, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[styles.glow, { width: size, height: size, borderRadius: size / 2, backgroundColor: flameColor }, glowStyle]} />
        <Animated.View style={flameStyle}>
          <Ionicons name="flame" size={size} color={flameColor} />
        </Animated.View>
      </View>
      {showCount ? <Text style={[styles.count, { fontSize: size * 0.6 }]}>{streak}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  glow: {
    position: 'absolute',
  },
  count: {
    fontWeight: '800',
    color: colors.text,
  },
});
