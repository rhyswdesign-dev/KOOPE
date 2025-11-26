/**
 * ACHIEVEMENT UNLOCK MODAL
 * Celebration animation when user unlocks an achievement
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { Achievement } from '../services/achievementService';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface AchievementUnlockModalProps {
  visible: boolean;
  achievement: Achievement | null;
  onClose: () => void;
}

const RARITY_COLORS = {
  common: {
    gradient: ['#6B7280', '#4B5563'],
    icon: '#9CA3AF',
  },
  rare: {
    gradient: ['#3B82F6', '#2563EB'],
    icon: '#60A5FA',
  },
  epic: {
    gradient: ['#8B5CF6', '#7C3AED'],
    icon: '#A78BFA',
  },
  legendary: {
    gradient: ['#F59E0B', '#D97706'],
    icon: '#FCD34D',
  },
};

/**
 * AchievementUnlockModal Component
 *
 * Shows an animated celebration when achievement is unlocked
 */
export default function AchievementUnlockModal({
  visible,
  achievement,
  onClose,
}: AchievementUnlockModalProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && achievement) {
      // Start animations
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(rotateAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(rotateAnim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();

      // Auto close after 3.5 seconds
      const timeout = setTimeout(() => {
        handleClose();
      }, 3500);

      return () => clearTimeout(timeout);
    } else {
      // Reset animations
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      rotateAnim.setValue(0);
    }
  }, [visible, achievement]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!achievement) return null;

  const rarityColors = RARITY_COLORS[achievement.rarity];

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={50} style={StyleSheet.absoluteFill} />

        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
            },
          ]}
        >
          {/* Rotating Glow Effect */}
          <Animated.View
            style={[
              styles.glow,
              {
                transform: [{ rotate }],
                backgroundColor: rarityColors.icon,
              },
            ]}
          />

          <LinearGradient
            colors={rarityColors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Achievement Icon */}
            <View style={styles.iconContainer}>
              <Ionicons
                name={achievement.icon as any}
                size={80}
                color="#FFFFFF"
              />
            </View>

            {/* Achievement Unlocked Text */}
            <View style={styles.headerBadge}>
              <Ionicons name="trophy" size={16} color={colors.gold} />
              <Text style={styles.headerText}>ACHIEVEMENT UNLOCKED!</Text>
            </View>

            {/* Achievement Title */}
            <Text style={styles.title}>{achievement.title}</Text>

            {/* Achievement Description */}
            <Text style={styles.description}>{achievement.description}</Text>

            {/* Rarity Badge */}
            <View style={styles.rarityBadge}>
              <Text style={styles.rarityText}>{achievement.rarity.toUpperCase()}</Text>
            </View>

            {/* XP Reward */}
            <View style={styles.xpContainer}>
              <Ionicons name="star" size={20} color={colors.gold} />
              <Text style={styles.xpText}>+{achievement.xpReward} XP</Text>
            </View>
          </LinearGradient>

          {/* Confetti Particles */}
          {[...Array(12)].map((_, i) => (
            <ConfettiParticle key={i} index={i} />
          ))}
        </Animated.View>
      </View>
    </Modal>
  );
}

/**
 * Confetti Particle Component
 */
function ConfettiParticle({ index }: { index: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 100;
    const randomX = (Math.random() - 0.5) * 200;

    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 300,
        duration: 2000,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: randomX,
        duration: 2000,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 2000,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(rotate, {
        toValue: 4,
        duration: 2000,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const colors = ['#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#10B981'];
  const color = colors[index % colors.length];
  const size = Math.random() * 8 + 4;

  const rotation = rotate.interpolate({
    inputRange: [0, 4],
    outputRange: ['0deg', '1440deg'],
  });

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          backgroundColor: color,
          width: size,
          height: size,
          opacity,
          transform: [
            { translateY },
            { translateX },
            { rotate: rotation },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  container: {
    width: width * 0.85,
    maxWidth: 400,
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.3,
  },
  card: {
    width: '100%',
    padding: spacing(4),
    borderRadius: radii.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(3),
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: radii.md,
    marginBottom: spacing(2),
  },
  headerText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing(1.5),
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: spacing(3),
  },
  rarityBadge: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1),
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: radii.md,
    marginBottom: spacing(2),
  },
  rarityText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: radii.lg,
  },
  xpText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.gold,
  },
  confetti: {
    position: 'absolute',
    top: 100,
    borderRadius: 4,
  },
});
