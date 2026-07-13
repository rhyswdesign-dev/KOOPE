/**
 * Completion Animation Component
 * Displays celebratory Lottie animations for various completion events
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { colors, spacing, radii } from '../../theme/tokens';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export interface CompletionAnimationProps {
  type: 'question_correct' | 'lesson_complete' | 'perfect_score' | 'first_lesson' | 'streak' | 'level_up';
  message?: string;
  score?: number;
  xpAwarded?: number;
  visible: boolean;
  onComplete?: () => void;
  duration?: number;
}

export const CompletionAnimation: React.FC<CompletionAnimationProps> = ({
  type,
  message,
  score,
  xpAwarded,
  visible,
  onComplete,
  duration = 3000
}) => {
  const animationRef = useRef<LottieView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const sparkleAnims = useRef([...Array(6)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (visible) {
      playAnimation();
    } else {
      resetAnimation();
    }
  }, [visible]);

  const playAnimation = () => {
    // Start Lottie animation
    animationRef.current?.play();

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Sparkle animations
    sparkleAnims.forEach((anim, index) => {
      Animated.sequence([
        Animated.delay(index * 200),
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Auto-complete after duration
    setTimeout(() => {
      exitAnimation();
    }, duration);
  };

  const exitAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete?.();
    });
  };

  const resetAnimation = () => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);
    sparkleAnims.forEach(anim => anim.setValue(0));
    animationRef.current?.reset();
  };

  const getAnimationConfig = () => {
    switch (type) {
      case 'question_correct':
        return {
          source: require('../../../assets/animations/celebration.json'),
          title: 'Correct!',
          subtitle: message || 'Well done!',
          color: colors.success,
          icon: 'checkmark-circle' as const
        };
      
      case 'lesson_complete':
        return {
          source: require('../../../assets/animations/celebration.json'),
          title: 'You\'ve Mixed It!',
          subtitle: message || 'Lesson completed successfully!',
          color: colors.primary,
          icon: 'trophy' as const
        };
      
      case 'perfect_score':
        return {
          source: require('../../../assets/animations/celebration.json'),
          title: 'Perfect Score!',
          subtitle: message || 'Outstanding performance!',
          color: colors.gold,
          icon: 'star' as const
        };
      
      case 'first_lesson':
        return {
          source: require('../../../assets/animations/celebration.json'),
          title: 'Welcome to Mixology!',
          subtitle: message || 'Your bartending journey begins!',
          color: colors.primary,
          icon: 'school' as const
        };
      
      case 'streak':
        return {
          source: require('../../../assets/animations/celebration.json'),
          title: 'Streak!',
          subtitle: message || 'You\'re on fire!',
          color: colors.warning,
          icon: 'flame' as const
        };
      
      case 'level_up':
        return {
          source: require('../../../assets/animations/celebration.json'),
          title: 'Level Up!',
          subtitle: message || 'Your skills are improving!',
          color: colors.secondary,
          icon: 'trending-up' as const
        };
      
      default:
        return {
          source: require('../../../assets/animations/celebration.json'),
          title: 'Celebration!',
          subtitle: message || 'Great job!',
          color: colors.primary,
          icon: 'trophy' as const
        };
    }
  };

  const config = getAnimationConfig();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      {/* Background overlay */}
      <View style={styles.overlay} />

      {/* Main content */}
      <View style={[styles.content, { borderColor: config.color }]}>
        {/* Lottie Animation */}
        <View style={[styles.animationContainer, { backgroundColor: config.color + '20' }]}>
          {config.source ? (
            <LottieView
              ref={animationRef}
              source={config.source}
              style={styles.lottieAnimation}
              loop={true}
              autoPlay={false}
              speed={1.2}
              colorFilters={[
                {
                  keypath: "**",
                  color: config.color
                }
              ]}
            />
          ) : (
            <Ionicons 
              name={config.icon} 
              size={80} 
              color={config.color}
            />
          )}
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: config.color }]}>
          {config.title}
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {config.subtitle}
        </Text>

        {/* Score and XP display */}
        {(score !== undefined || xpAwarded !== undefined) && (
          <View style={styles.statsContainer}>
            {score !== undefined && (
              <View style={styles.statItem}>
                <Ionicons name="school" size={20} color={colors.textSecondary} />
                <Text style={styles.statText}>Score: {score}%</Text>
              </View>
            )}
            {xpAwarded !== undefined && (
              <View style={styles.statItem}>
                <Ionicons name="star-outline" size={20} color={colors.gold} />
                <Text style={[styles.statText, { color: colors.gold }]}>+{xpAwarded} XP</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Sparkle effects */}
      {sparkleAnims.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.sparkle,
            {
              opacity: anim,
              transform: [
                { scale: anim },
                { 
                  translateX: (Math.random() - 0.5) * width * 0.8 
                },
                { 
                  translateY: (Math.random() - 0.5) * height * 0.6 
                }
              ]
            }
          ]}
        >
          <Ionicons name="sparkles" size={24} color={config.color} />
        </Animated.View>
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  content: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing(6),
    alignItems: 'center',
    maxWidth: width * 0.8,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  animationContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing(4),
  },
  lottieAnimation: {
    width: 100,
    height: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing(2),
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing(4),
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing(4),
    paddingTop: spacing(2),
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sparkle: {
    position: 'absolute',
  },
});

export default CompletionAnimation;
