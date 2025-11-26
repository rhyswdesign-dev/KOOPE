/**
 * ACHIEVEMENT CARD
 * Displays individual achievement with progress and unlock status
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii } from '../theme/tokens';
import { Achievement } from '../services/achievementService';
import { LinearGradient } from 'expo-linear-gradient';

interface AchievementCardProps {
  achievement: Achievement;
  style?: any;
}

const RARITY_COLORS = {
  common: {
    gradient: ['#6B7280', '#4B5563'],
    icon: '#9CA3AF',
    text: '#D1D5DB',
  },
  rare: {
    gradient: ['#3B82F6', '#2563EB'],
    icon: '#60A5FA',
    text: '#DBEAFE',
  },
  epic: {
    gradient: ['#8B5CF6', '#7C3AED'],
    icon: '#A78BFA',
    text: '#EDE9FE',
  },
  legendary: {
    gradient: ['#F59E0B', '#D97706'],
    icon: '#FCD34D',
    text: '#FEF3C7',
  },
};

/**
 * AchievementCard Component
 *
 * Shows achievement details with progress bar and unlock status
 */
export default function AchievementCard({ achievement, style }: AchievementCardProps) {
  const rarityColors = RARITY_COLORS[achievement.rarity];
  const progressPercentage = Math.min((achievement.progress / achievement.requirement) * 100, 100);
  const isUnlocked = achievement.unlocked;

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={isUnlocked ? rarityColors.gradient : [colors.card, colors.card]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, !isUnlocked && styles.iconContainerLocked]}>
          <Ionicons
            name={achievement.icon as any}
            size={32}
            color={isUnlocked ? rarityColors.icon : colors.muted}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.title, !isUnlocked && styles.titleLocked]}>
              {achievement.title}
            </Text>
            {isUnlocked && (
              <Ionicons name="checkmark-circle" size={20} color={rarityColors.icon} />
            )}
          </View>

          <Text style={[styles.description, !isUnlocked && styles.descriptionLocked]} numberOfLines={2}>
            {achievement.description}
          </Text>

          {/* Progress Bar */}
          {!isUnlocked && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercentage}%`, backgroundColor: colors.accent },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {achievement.progress} / {achievement.requirement}
              </Text>
            </View>
          )}

          {/* Unlock Date */}
          {isUnlocked && achievement.unlockedAt && (
            <Text style={[styles.unlockedDate, { color: rarityColors.text }]}>
              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
            </Text>
          )}

          {/* XP Reward */}
          <View style={styles.footer}>
            <View style={[styles.rarityBadge, { backgroundColor: rarityColors.gradient[0] }]}>
              <Text style={styles.rarityText}>{achievement.rarity.toUpperCase()}</Text>
            </View>
            <View style={styles.xpBadge}>
              <Ionicons name="star" size={14} color={colors.gold} />
              <Text style={styles.xpText}>+{achievement.xpReward} XP</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing(2),
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    padding: spacing(2),
    borderRadius: radii.lg,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
  },
  iconContainerLocked: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing(0.5),
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  titleLocked: {
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: spacing(1.5),
  },
  descriptionLocked: {
    color: colors.subtext,
  },
  progressContainer: {
    marginBottom: spacing(1),
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.line,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing(0.5),
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: colors.subtext,
    textAlign: 'right',
  },
  unlockedDate: {
    fontSize: 12,
    marginBottom: spacing(1),
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rarityBadge: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  xpText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gold,
  },
});
