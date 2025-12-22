/**
 * Achievement Badge Component
 * Displays achievement with icon, progress, and unlock state
 * Used in achievement lists and grids
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { Achievement } from '../services/achievementServiceSupabase';

interface AchievementBadgeProps {
  achievement: Achievement;
  progress?: number;
  isCompleted?: boolean;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  progress = 0,
  isCompleted = false,
  onPress,
  size = 'medium',
}) => {
  const progressPercent = (progress / achievement.requirementValue) * 100;

  // Get rarity color
  const getRarityColor = () => {
    switch (achievement.rarity) {
      case 'common':
        return colors.text.secondary;
      case 'rare':
        return '#3B82F6'; // Blue
      case 'epic':
        return '#A855F7'; // Purple
      case 'legendary':
        return '#F59E0B'; // Gold
      default:
        return colors.text.secondary;
    }
  };

  // Get size styles
  const getSizeStyles = () => {
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
  };

  const sizeStyles = getSizeStyles();
  const rarityColor = getRarityColor();

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
          color={isCompleted ? rarityColor : colors.text.disabled}
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
};

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
    padding: spacing.sm,
    gap: spacing.sm,
  },

  containerMedium: {
    padding: spacing.md,
    gap: spacing.md,
  },

  containerLarge: {
    padding: spacing.lg,
    gap: spacing.lg,
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
    padding: spacing.md,
    backgroundColor: colors.background.default,
  },

  iconContainerLocked: {
    opacity: 0.4,
  },

  info: {
    flex: 1,
    gap: spacing.xs,
  },

  title: {
    ...fonts.body,
    fontWeight: '700',
    color: colors.text.primary,
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
    color: colors.text.disabled,
  },

  description: {
    ...fonts.body,
    color: colors.text.secondary,
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
    color: colors.text.disabled,
  },

  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },

  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.background.default,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
  },

  progressText: {
    ...fonts.caption,
    fontSize: 11,
    color: colors.text.secondary,
    fontWeight: '600',
  },

  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },

  rewardText: {
    ...fonts.caption,
    fontSize: 12,
    color: colors.accent,
    fontWeight: '700',
  },

  completedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
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
