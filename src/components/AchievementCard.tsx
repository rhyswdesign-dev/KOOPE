/**
 * ACHIEVEMENT CARD
 * Displays individual achievement with progress and unlock status
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { Heading } from './ui';
import { Achievement } from '../services/achievementService';

interface AchievementCardProps {
  achievement: Achievement;
  style?: any;
}

/**
 * AchievementCard Component
 *
 * Shows achievement details with progress bar and unlock status
 */
export default function AchievementCard({ achievement, style }: AchievementCardProps) {
  const progressPercentage = Math.min((achievement.progress / achievement.requirement) * 100, 100);
  const isUnlocked = achievement.unlocked;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.card}>
        {/* Icon */}
        <View style={[styles.iconContainer, !isUnlocked && styles.iconContainerLocked]}>
          <Ionicons
            name={achievement.icon as any}
            size={32}
            color={isUnlocked ? colors.accent : colors.muted}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <Heading level={3} style={styles.title}>
              {achievement.title}
            </Heading>
            {isUnlocked && (
              <Ionicons name="checkmark-circle" size={20} color={colors.accent} />
            )}
          </View>

          <Text style={styles.description} numberOfLines={2}>
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
            <Text style={styles.unlockedDate}>
              Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
            </Text>
          )}

          {/* XP Reward */}
          <View style={styles.footer}>
            <View style={styles.rarityBadge}>
              <Text style={styles.rarityText}>{achievement.rarity.toUpperCase()}</Text>
            </View>
            <View style={styles.xpBadge}>
              <Ionicons name="star" size={14} color={colors.gold} />
              <Text style={styles.xpText}>+{achievement.xpReward} XP</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing(2),
  },
  card: {
    flexDirection: 'row',
    padding: spacing(2),
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: radii.full,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  iconContainerLocked: {
    opacity: 0.5,
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
    color: colors.text,
    flex: 1,
    fontFamily: serif,
  },
  description: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(1.5),
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
    color: colors.subtext,
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
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
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
