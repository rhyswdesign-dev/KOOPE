/**
 * AnimatedProgressBar
 * Progress bar whose fill springs to its new value with an amber gradient
 * and a subtle moving sheen. Use for lesson progress, XP-to-next-level,
 * challenge completion — anywhere progress should feel alive.
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii } from '../../theme/tokens';

export interface AnimatedProgressBarProps {
  /** 0..1 */
  progress: number;
  height?: number;
  trackColor?: string;
  /** Two-stop gradient for the fill */
  fillColors?: [string, string];
  /** Show the moving sheen highlight (off under Reduce Motion) */
  sheen?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function AnimatedProgressBar({
  progress,
  height = 8,
  trackColor = colors.line,
  fillColors = [colors.accent, colors.accentDark],
  sheen = true,
  style,
}: AnimatedProgressBarProps) {
  const reducedMotion = useReducedMotion();
  const animated = useSharedValue(Math.min(Math.max(progress, 0), 1));
  const sheenProgress = useSharedValue(0);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    const clamped = Math.min(Math.max(progress, 0), 1);
    if (reducedMotion) {
      animated.value = clamped;
      return;
    }
    animated.value = withSpring(clamped, { damping: 18, stiffness: 120 });
  }, [progress, reducedMotion, animated]);

  useEffect(() => {
    if (reducedMotion || !sheen) return;
    sheenProgress.value = withRepeat(
      withDelay(1200, withTiming(1, { duration: 900 })),
      -1
    );
  }, [reducedMotion, sheen, sheenProgress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${animated.value * 100}%`,
  }));

  const sheenStyle = useAnimatedStyle(() => {
    const x = interpolate(sheenProgress.value, [0, 1], [-40, trackWidth + 40]);
    return {
      opacity: sheenProgress.value === 0 ? 0 : 0.35,
      transform: [{ translateX: x }, { skewX: '-20deg' }],
    };
  });

  return (
    <View
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: trackColor }, style]}
      onLayout={e => setTrackWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.fill, { borderRadius: height / 2 }, fillStyle]}>
        <LinearGradient
          colors={fillColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      {sheen && !reducedMotion ? (
        <Animated.View style={[styles.sheen, { height }, sheenStyle]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    overflow: 'hidden',
  },
  sheen: {
    position: 'absolute',
    top: 0,
    width: 24,
    backgroundColor: colors.white,
  },
});
