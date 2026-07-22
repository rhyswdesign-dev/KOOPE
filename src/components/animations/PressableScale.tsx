/**
 * PressableScale
 * Drop-in replacement for Pressable/TouchableOpacity that adds a springy
 * press-down scale + optional haptic. The single highest-leverage
 * micro-interaction: makes every card and button feel physical.
 *
 * Usage:
 *   <PressableScale onPress={openRecipe} haptic="light">
 *     <RecipeCard ... />
 *   </PressableScale>
 */

import React, { useCallback } from 'react';
import { Pressable, type PressableProps, type ViewStyle, type StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import { triggerHaptic, type HapticType } from '../../lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends PressableProps {
  /** Scale while pressed. 0.96 for cards, 0.92 for small chips/icons */
  scaleTo?: number;
  /** Haptic fired on press-in. Pass null to disable. */
  haptic?: HapticType | null;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export default function PressableScale({
  scaleTo = 0.96,
  haptic = 'light',
  onPressIn,
  onPressOut,
  style,
  children,
  ...rest
}: PressableScaleProps) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);

  const handlePressIn = useCallback((e: any) => {
    if (!reducedMotion) {
      scale.value = withSpring(scaleTo, { damping: 20, stiffness: 400 });
    }
    if (haptic) triggerHaptic(haptic);
    onPressIn?.(e);
  }, [reducedMotion, scaleTo, haptic, onPressIn, scale]);

  const handlePressOut = useCallback((e: any) => {
    scale.value = withSpring(1, { damping: 16, stiffness: 300 });
    onPressOut?.(e);
  }, [onPressOut, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
