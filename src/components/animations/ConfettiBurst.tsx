/**
 * ConfettiBurst
 * Dependency-free confetti explosion built on Reanimated (runs entirely on
 * the UI thread — no Lottie asset, no extra package). Fire it behind
 * unlock / level-up / perfect-score moments.
 *
 * Usage:
 *   <ConfettiBurst trigger={celebrating} onDone={() => setCelebrating(false)} />
 *
 * Renders nothing when idle. Skipped under Reduce Motion.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useReducedMotion,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import { colors } from '../../theme/tokens';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const PALETTE = [
  colors.gold,
  colors.accentDark,
  colors.text,        // soft cream
  colors.rarityRare,
  colors.rarityPrestige,
  colors.success,
];

interface ParticleSpec {
  angle: number;      // radians
  velocity: number;   // px over full flight
  spin: number;       // total degrees of rotation
  color: string;
  width: number;
  height: number;
  delay: number;      // 0..1 fraction of progress before appearing
}

function makeParticles(count: number): ParticleSpec[] {
  return Array.from({ length: count }, () => ({
    angle: -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1,
    velocity: 180 + Math.random() * 240,
    spin: (Math.random() - 0.5) * 1440,
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    width: 6 + Math.random() * 5,
    height: 10 + Math.random() * 6,
    delay: Math.random() * 0.12,
  }));
}

function Particle({
  spec,
  progress,
  originX,
  originY,
}: {
  spec: ParticleSpec;
  progress: SharedValue<number>;
  originX: number;
  originY: number;
}) {
  const style = useAnimatedStyle(() => {
    const t = Math.max(0, (progress.value - spec.delay) / (1 - spec.delay));
    const gravity = 420 * t * t;
    const x = Math.cos(spec.angle) * spec.velocity * t;
    const y = Math.sin(spec.angle) * spec.velocity * t + gravity;
    return {
      opacity: t === 0 ? 0 : t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25,
      transform: [
        { translateX: originX + x },
        { translateY: originY + y },
        { rotate: `${spec.spin * t}deg` },
        { rotateX: `${spec.spin * 1.4 * t}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: spec.color,
          width: spec.width,
          height: spec.height,
          borderRadius: spec.width / 3,
        },
        style,
      ]}
    />
  );
}

export interface ConfettiBurstProps {
  /** Flip to true to fire the burst */
  trigger: boolean;
  /** Called when the burst finishes (also called immediately under Reduce Motion) */
  onDone?: () => void;
  count?: number;
  durationMs?: number;
  /** Burst origin, defaults to upper-center of screen */
  originX?: number;
  originY?: number;
}

export default function ConfettiBurst({
  trigger,
  onDone,
  count = 28,
  durationMs = 1600,
  originX = SCREEN_W / 2,
  originY = SCREEN_H * 0.35,
}: ConfettiBurstProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const [active, setActive] = useState(false);
  const particles = useMemo(() => makeParticles(count), [count, active]);

  useEffect(() => {
    if (!trigger) return;
    if (reducedMotion) {
      onDone?.();
      return;
    }
    setActive(true);
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration: durationMs, easing: Easing.out(Easing.quad) },
      finished => {
        if (finished) {
          runOnJS(setActive)(false);
          if (onDone) runOnJS(onDone)();
        }
      }
    );
  }, [trigger]);

  if (!active) return null;

  return (
    <Animated.View style={styles.overlay} pointerEvents="none">
      {particles.map((spec, i) => (
        <Particle
          key={i}
          spec={spec}
          progress={progress}
          originX={originX}
          originY={originY}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1001,
  },
  particle: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
