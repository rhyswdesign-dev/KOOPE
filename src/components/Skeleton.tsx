import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/tokens';

interface SkeletonProps {
  width?: number | `${number}%` | 'auto';
  height?: number | `${number}%` | 'auto';
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Skeleton Component
 *
 * A shimmering placeholder for loading content.
 * Gradient sweep runs on the UI thread via Reanimated; falls back to a
 * gentle opacity pulse when the system Reduce Motion setting is on.
 */
export default function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style
}: SkeletonProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const [measuredWidth, setMeasuredWidth] = useState(0);

  useEffect(() => {
    if (reducedMotion) {
      progress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200 }),
          withTiming(0, { duration: 1200 })
        ),
        -1
      );
      return;
    }
    progress.value = withRepeat(withTiming(1, { duration: 1300 }), -1);
  }, [reducedMotion, progress]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: reducedMotion ? interpolate(progress.value, [0, 1], [0.4, 0.7]) : 1,
  }));

  const sweepStyle = useAnimatedStyle(() => {
    const sweepWidth = measuredWidth * 0.6;
    return {
      transform: [
        {
          translateX: interpolate(
            progress.value,
            [0, 1],
            [-sweepWidth, measuredWidth + sweepWidth]
          ),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
        pulseStyle,
        style,
      ]}
      onLayout={e => setMeasuredWidth(e.nativeEvent.layout.width)}
    >
      {!reducedMotion && measuredWidth > 0 ? (
        <Animated.View style={[styles.sweep, { width: measuredWidth * 0.6 }, sweepStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.07)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  sweep: {
    ...StyleSheet.absoluteFillObject,
    right: undefined,
  },
});
