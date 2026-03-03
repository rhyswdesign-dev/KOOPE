/**
 * Achievement Badge Component
 * Displays achievement with icon, progress, and unlock state
 * Used in achievement lists and grids
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, textStyles } from '../theme/tokens';
import { Achievement } from '../services/achievementServiceSupabase';

interface AchievementBadgeProps {
  achievement: Achievement;
  progress?: number;
  isCompleted?: boolean;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = React.memo(({
  achievement,
  progress = 0,
  isCompleted = false,
  onPress,
  size = 'medium',
}) => {
  // Memoize expensive calculations
  const progressPercent = useMemo(
    () => (progress / achievement.requirementValue) * 100,
    [progress, achievement.requirementValue]
  );

  // Memoize rarity color to avoid recalculation
  const rarityColor = useMemo(() => {
    switch (achievement.rarity) {
      case 'common':
        return colors.subtext;
      case 'rare':
        return '#3B82F6'; // Blue
      case 'epic':
        return '#A855F7'; // Purple
      case 'legendary':
        return '#F59E0B'; // Gold
      default:
        return colors.subtext;
    }
  }, [achievement.rarity]);

  // Memoize size styles to avoid recalculation
  const sizeStyles = useMemo(() => {
    switch (size) {
      case 'small':
        return {
          container: styles.containerSmall,
          icon: 32,
          title: styles.titleSmall,
          description: styles.descriptionSmall,
        };
      case 'large':
        return {
          container: styles.containerLarge,
          icon: 64,
          title: styles.titleLarge,
          description: styles.descriptionLarge,
        };
      default:
        return {
          container: styles.containerMedium,
          icon: 48,
          title: styles.titleMedium,
          description: styles.descriptionMedium,
        };
    }
  }, [size]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        sizeStyles.container,
        isCompleted && styles.containerCompleted,
        pressed && styles.containerPressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      {/* Badge Icon */}
      <View
        style={[
          styles.iconContainer,
          isCompleted && { backgroundColor: rarityColor + '20' },
          !isCompleted && styles.iconContainerLocked,
        ]}
      >
        <Ionicons
          name={achievement.badgeIcon as any || achievement.icon as any}
          size={sizeStyles.icon}
          color={isCompleted ? rarityColor : colors.muted}
        />
      </View>

      {/* Achievement Info */}
      <View style={styles.info}>
        <Text
          style={[
            styles.title,
            sizeStyles.title,
            !isCompleted && styles.titleLocked,
          ]}
          numberOfLines={1}
        >
          {achievement.title}
        </Text>

        <Text
          style={[
            styles.description,
            sizeStyles.description,
            !isCompleted && styles.descriptionLocked,
          ]}
          numberOfLines={2}
        >
          {achievement.description}
        </Text>

        {/* Progress Bar */}
        {!isCompleted && progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progressPercent, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {progress}/{achievement.requirementValue}
            </Text>
          </View>
        )}

        {/* XP Reward */}
        <View style={styles.rewardContainer}>
          <Ionicons name="flash" size={14} color={colors.accent} />
          <Text style={styles.rewardText}>+{achievement.xpReward} XP</Text>
        </View>
      </View>

      {/* Completion Badge */}
      {isCompleted && (
        <View style={[styles.completedBadge, { backgroundColor: rarityColor }]}>
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        </View>
      )}

      {/* Rarity Indicator */}
      <View style={[styles.rarityIndicator, { backgroundColor: rarityColor }]} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.elevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    position: 'relative',
  },

  containerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(1),
    gap: spacing(1),
  },

  containerMedium: {
    padding: spacing(2),
    gap: spacing(2),
  },

  containerLarge: {
    padding: spacing(3),
    gap: spacing(3),
  },

  containerCompleted: {
    borderColor: colors.success + '40',
  },

  containerPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },

  iconContainer: {
    alignSelf: 'center',
    borderRadius: radii.full,
    padding: spacing(2),
    backgroundColor: colors.card,
  },

  iconContainerLocked: {
    opacity: 0.4,
  },

  info: {
    flex: 1,
    gap: spacing(0.5),
  },

  title: {
    ...textStyles.body,
    fontWeight: '700',
    color: colors.text,
  },

  titleSmall: {
    fontSize: 14,
  },

  titleMedium: {
    fontSize: 16,
  },

  titleLarge: {
    fontSize: 20,
  },

  titleLocked: {
    color: colors.muted,
  },

  description: {
    ...textStyles.body,
    color: colors.subtext,
  },

  descriptionSmall: {
    fontSize: 11,
  },

  descriptionMedium: {
    fontSize: 13,
  },

  descriptionLarge: {
    fontSize: 15,
  },

  descriptionLocked: {
    color: colors.muted,
  },

  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginTop: spacing(0.5),
  },

  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
  },

  progressText: {
    ...textStyles.caption,
    fontSize: 11,
    color: colors.subtext,
    fontWeight: '600',
  },

  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    marginTop: spacing(0.5),
  },

  rewardText: {
    ...textStyles.caption,
    fontSize: 12,
    color: colors.accent,
    fontWeight: '700',
  },

  completedBadge: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
    width: 28,
    height: 28,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  rarityIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
});
