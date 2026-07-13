/**
 * ShakerLoader
 * KOOPE's signature branded loading animation: a cocktail shaker that
 * rocks side-to-side in a bartender's shake rhythm, with three "drip"
 * dots pulsing below. Replaces generic spinners so even waiting feels
 * on-brand.
 *
 * Respects the system Reduce Motion setting (falls back to a gentle
 * opacity pulse).
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  useReducedMotion,
  interpolate,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing } from '../../theme/tokens';

export interface ShakerLoaderProps {
  size?: number;
  color?: string;
  message?: string;
  subMessage?: string;
}

const SHAKE_TILT = 16; // degrees

function Dot({ index, reduced }: { index: number; reduced: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * 180,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) })
        ),
        -1
      )
    );
  }, [index, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.25, 1]),
    transform: [{ scale: reduced ? 1 : interpolate(progress.value, [0, 1], [0.7, 1.15]) }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

export default function ShakerLoader({
  size = 56,
  color = colors.accent,
  message,
  subMessage,
}: ShakerLoaderProps) {
  const reducedMotion = useReducedMotion();
  const tilt = useSharedValue(0);
  const lift = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 900 }),
          withTiming(1, { duration: 900 })
        ),
        -1
      );
      return;
    }

    // Bartender rhythm: four quick shakes, brief rest, repeat.
    const quick = { duration: 110, easing: Easing.inOut(Easing.quad) };
    tilt.value = withRepeat(
      withSequence(
        withTiming(-SHAKE_TILT, quick),
        withTiming(SHAKE_TILT, quick),
        withTiming(-SHAKE_TILT, quick),
        withTiming(SHAKE_TILT, quick),
        withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) }),
        withDelay(520, withTiming(0, { duration: 1 }))
      ),
      -1
    );

    lift.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 220 }),
        withTiming(0, { duration: 220 }),
        withDelay(660, withTiming(0, { duration: 1 }))
      ),
      -1
    );
  }, [reducedMotion, tilt, lift, pulse]);

  const shakerStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [
      { translateY: lift.value },
      { rotate: `${tilt.value}deg` },
    ],
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={shakerStyle}>
        <MaterialCommunityIcons name="shaker-outline" size={size} color={color} />
      </Animated.View>

      <View style={styles.dots}>
        {[0, 1, 2].map(i => (
          <Dot key={i} index={i} reduced={reducedMotion} />
        ))}
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}
      {subMessage ? <Text style={styles.subMessage}>{subMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: spacing(1),
    marginTop: spacing(1.5),
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  message: {
    marginTop: spacing(2),
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subMessage: {
    marginTop: spacing(0.5),
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
  },
});
