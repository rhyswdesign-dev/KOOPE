/**
 * STREAK CARD
 * Displays current streak with calendar visualization
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { Heading } from './ui';

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  isActiveToday: boolean;
  streakCalendar?: Array<{ date: string; hasActivity: boolean }>;
  style?: any;
}

/**
 * StreakCard Component
 *
 * Beautiful card showing streak information with fire icon and calendar
 */
export default function StreakCard({
  currentStreak,
  longestStreak,
  isActiveToday,
  streakCalendar = [],
  style,
}: StreakCardProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.flameContainer}>
            <Ionicons
              name={currentStreak > 0 ? 'flame' : 'flame-outline'}
              size={48}
              color={colors.accent}
            />
            {currentStreak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakNumber}>{currentStreak}</Text>
              </View>
            )}
          </View>

          <View style={styles.stats}>
            <Text style={styles.streakLabel}>Current Streak</Text>
            <Heading level={2} style={styles.streakValue}>
              {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
            </Heading>
            <Text style={styles.longestStreak}>
              Longest: {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>

        {/* Status Message */}
        <View style={styles.statusContainer}>
          {isActiveToday ? (
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.statusText}>Active today! Come back tomorrow to continue your streak</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.statusBadgeWarning]}>
              <Ionicons name="alert-circle" size={16} color={colors.warning} />
              <Text style={[styles.statusText, styles.statusTextWarning]}>
                Keep your streak alive! Log in today
              </Text>
            </View>
          )}
        </View>

        {/* Last 7 Days Calendar */}
        {streakCalendar.length > 0 && (
          <View style={styles.calendarContainer}>
            <Text style={styles.calendarLabel}>Last 7 Days</Text>
            <View style={styles.calendar}>
              {streakCalendar.slice(-7).map((day, index) => (
                <View
                  key={index}
                  style={[
                    styles.calendarDay,
                    day.hasActivity && styles.calendarDayActive,
                  ]}
                >
                  {day.hasActivity && (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing(2),
  },
  card: {
    padding: spacing(3),
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  flameContainer: {
    position: 'relative',
    marginRight: spacing(3),
  },
  streakBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.card,
    paddingHorizontal: spacing(0.5),
  },
  streakNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.bg,
  },
  stats: {
    flex: 1,
  },
  streakLabel: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: spacing(0.5),
  },
  streakValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(0.25),
    fontFamily: serif,
  },
  longestStreak: {
    fontSize: 12,
    color: colors.subtext,
  },
  statusContainer: {
    marginBottom: spacing(2),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    padding: spacing(1.5),
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusBadgeWarning: {
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    borderColor: 'rgba(251, 146, 60, 0.3)',
  },
  statusText: {
    fontSize: 13,
    color: colors.success,
    flex: 1,
  },
  statusTextWarning: {
    color: colors.warning,
  },
  calendarContainer: {
    marginTop: spacing(1),
  },
  calendarLabel: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: spacing(1),
  },
  calendar: {
    flexDirection: 'row',
    gap: spacing(1),
  },
  calendarDay: {
    flex: 1,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayActive: {
    backgroundColor: colors.accent,
  },
});
