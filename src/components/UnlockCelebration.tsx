/**
 * Unlock Celebration Component
 * Shows a brief celebration animation when user unlocks vault content
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../theme/tokens';
import { LinearGradient } from 'expo-linear-gradient';

interface UnlockCelebrationProps {
  visible: boolean;
  itemName: string;
  onComplete: () => void;
}

export default function UnlockCelebration({
  visible,
  itemName,
  onComplete,
}: UnlockCelebrationProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Start animation
      scale.value = 0;
      opacity.value = 0;
      rotation.value = 0;

      // Animate in
      scale.value = withSequence(
        withSpring(1.2, { damping: 8, stiffness: 100 }),
        withSpring(1, { damping: 10, stiffness: 150 })
      );

      opacity.value = withTiming(1, { duration: 300 });

      rotation.value = withSequence(
        withTiming(360, { duration: 600, easing: Easing.out(Easing.quad) }),
        withTiming(360, { duration: 1000 }) // Hold
      );

      // Auto-dismiss after 2 seconds
      const timeout = setTimeout(() => {
        opacity.value = withTiming(0, { duration: 300 }, () => {
          runOnJS(onComplete)();
        });
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <LinearGradient
            colors={[colors.accent, colors.gold]}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="lock-open" size={64} color={colors.bg} />
            <Text style={styles.title}>Unlocked!</Text>
            <Text style={styles.itemName} numberOfLines={2}>
              {itemName}
            </Text>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  gradient: {
    paddingHorizontal: spacing(6),
    paddingVertical: spacing(4),
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 280,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.bg,
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.bg,
    textAlign: 'center',
    opacity: 0.9,
  },
});
