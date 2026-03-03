/**
 * Progress Stats Component
 * Displays user's overall progress metrics
 * Including XP, level, lessons, recipes, etc.
 * Optimized with React.memo and useCallback
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';

interface ProgressStat {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
  subtitle?: string;
}

interface ProgressStatsProps {
  stats: ProgressStat[];
  columns?: 2 | 3 | 4;
}

export const ProgressStats: React.FC<ProgressStatsProps> = React.memo(({
  stats,
  columns = 3,
}) => {
  // Memoize renderStat to prevent recreation on every render
  const renderStat = useCallback((stat: ProgressStat, index: number) => {
    const statColor = stat.color || colors.accent;

    return (
      <View
        key={index}
        style={[
          styles.statCard,
          { width: `${100 / columns - 2}%` },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: statColor + '20' }]}>
          <Ionicons
            name={stat.icon as any}
            size={24}
            color={statColor}
          />
        </View>

        <Text style={styles.statValue}>{stat.value}</Text>
        <Text style={styles.statLabel}>{stat.label}</Text>

        {stat.subtitle && (
          <Text style={styles.statSubtitle}>{stat.subtitle}</Text>
        )}
      </View>
    );
  }, [columns]);

  return (
    <View style={styles.container}>
      {stats.map(renderStat)}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },

  statCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  statValue: {
    ...fonts.title,
    fontSize: 24,
    fontWeight: '700',
    color: colors.textLight,
  },

  statLabel: {
    ...fonts.caption,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  statSubtitle: {
    ...fonts.caption,
    fontSize: 10,
    color: colors.muted,
    textAlign: 'center',
  },
});
