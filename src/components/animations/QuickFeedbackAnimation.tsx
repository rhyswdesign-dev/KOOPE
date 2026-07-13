/**
 * Quick Feedback Animation Component
 * Brief animations for immediate feedback on answers
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export interface QuickFeedbackAnimationProps {
  type: 'correct' | 'incorrect' | 'streak';
  visible: boolean;
  onComplete?: () => void;
  streakCount?: number;
  duration?: number;
}

export const QuickFeedbackAnimation: React.FC<QuickFeedbackAnimationProps> = ({
  type,
  visible,
  onComplete,
  streakCount,
  duration = 1500
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      playAnimation();
    } else {
      resetAnimation();
    }
  }, [visible]);

  const playAnimation = () => {
    // Reset animations
    scaleAnim.setValue(0);
    opacityAnim.setValue(0);
    translateYAnim.setValue(30);
    rotateAnim.setValue(0);

    // Entrance animation
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      type === 'streak' ? Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }) : Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      })
    ]).start();

    // Exit animation
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: -20,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete?.();
      });
    }, duration - 500);
  };

  const resetAnimation = () => {
    scaleAnim.setValue(0);
    opacityAnim.setValue(0);
    translateYAnim.setValue(30);
    rotateAnim.setValue(0);
  };

  const getConfig = () => {
    switch (type) {
      case 'correct':
        return {
          icon: 'checkmark-circle' as const,
          color: colors.success,
          text: 'Correct!',
          backgroundColor: colors.success + '20'
        };
      case 'incorrect':
        return {
          icon: 'close-circle' as const,
          color: colors.error,
          text: 'Keep trying!',
          backgroundColor: colors.error + '20'
        };
      case 'streak':
        return {
          icon: 'flame' as const,
          color: colors.warning,
          text: `${streakCount || 2} in a row!`,
          backgroundColor: colors.warning + '20'
        };
      default:
        return {
          icon: 'thumbs-up' as const,
          color: colors.primary,
          text: 'Nice!',
          backgroundColor: colors.primary + '20'
        };
    }
  };

  const config = getConfig();

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.content,
          {
            backgroundColor: config.backgroundColor,
            borderColor: config.color,
            opacity: opacityAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
              {
                rotate: rotateAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg'],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.color + '30' }]}>
          <Ionicons name={config.icon} size={24} color={config.color} />
        </View>
        <Text style={[styles.text, { color: config.color }]}>{config.text}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
    pointerEvents: 'none',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2),
    borderRadius: 25,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing(2),
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QuickFeedbackAnimation;
