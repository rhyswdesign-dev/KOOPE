/**
 * Streak Display Component
 * Shows current streak with flame animation and calendar
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, textStyles } from '../theme/tokens';
import { StreakData } from '../services/streakService';

interface StreakDisplayProps {
  streakData: StreakData;
  compact?: boolean;
}

export const StreakDisplay: React.FC<StreakDisplayProps> = ({
  streakData,
  compact = false,
}) => {
  const flameScale = useRef(new Animated.Value(1)).current;
  const flamePulse = useRef(new Animated.Value(0)).current;

  // Flame animation
  useEffect(() => {
    if (streakData.currentStreak > 0) {
      // Continuous pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.spring(flameScale, {
              toValue: 1.2,
              friction: 3,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.timing(flamePulse, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.spring(flameScale, {
              toValue: 1,
              friction: 3,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.timing(flamePulse, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    }
  }, [streakData.currentStreak]);

  const flameOpacity = flamePulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.7],
  });

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Animated.View
          style={[
            styles.flameIconCompact,
            {
              transform: [{ scale: flameScale }],
              opacity: flameOpacity,
            },
          ]}
        >
          <Ionicons
            name="flame"
            size={24}
            color={streakData.currentStreak > 0 ? colors.warning : colors.muted}
          />
        </Animated.View>
        <View>
          <Text style={styles.streakNumberCompact}>{streakData.currentStreak}</Text>
          <Text style={styles.streakLabelCompact}>day streak</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Streak Display */}
      <View style={styles.mainDisplay}>
        <Animated.View
          style={[
            styles.flameIcon,
            {
              transform: [{ scale: flameScale }],
              opacity: flameOpacity,
            },
          ]}
        >
          <Ionicons
            name="flame"
            size={64}
            color={streakData.currentStreak > 0 ? colors.warning : colors.muted}
          />
        </Animated.View>

        <View style={styles.streakInfo}>
          <Text style={styles.streakNumber}>{streakData.currentStreak}</Text>
          <Text style={styles.streakLabel}>Day Streak</Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{streakData.longestStreak}</Text>
          <Text style={styles.statLabel}>Longest</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{streakData.totalDaysActive}</Text>
          <Text style={styles.statLabel}>Total Days</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {Math.round((streakData.currentStreak / Math.max(streakData.longestStreak, 1)) * 100)}%
          </Text>
          <Text style={styles.statLabel}>of Best</Text>
        </View>
      </View>

      {/* Weekly Calendar */}
      <View style={styles.calendar}>
        <Text style={styles.calendarTitle}>This Week</Text>
        <View style={styles.calendarDays}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => {
            const dayOfWeek = (index + 1) % 7; // Monday = 1, Sunday = 0
            const today = new Date().getDay();
            const isToday = dayOfWeek === today;
            const hasActivity = streakData.lastActivityDate === new Date().toISOString().split('T')[0] && isToday;

            return (
              <View key={index} style={styles.calendarDay}>
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                  {day}
                </Text>
                <View
                  style={[
                    styles.dayDot,
                    hasActivity && styles.dayDotActive,
                    isToday && styles.dayDotToday,
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* Motivation Message */}
      {streakData.currentStreak === 0 && (
        <View style={styles.motivationContainer}>
          <Text style={styles.motivationText}>
            Start your streak today! Complete a lesson to begin.
          </Text>
        </View>
      )}

      {streakData.currentStreak >= 7 && (
        <View style={styles.motivationContainer}>
          <Ionicons name="trophy" size={20} color={colors.warning} />
          <Text style={styles.motivationText}>
            Amazing! You're on fire! Keep it going!
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.elevated,
    borderRadius: radii.xl,
    padding: spacing(4),
    marginVertical: spacing(2),
  },

  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },

  mainDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(4),
  },

  flameIcon: {
    marginRight: spacing(3),
  },

  flameIconCompact: {
    // No additional styles needed
  },

  streakInfo: {
    alignItems: 'flex-start',
  },

  streakNumber: {
    ...textStyles.h2,
    fontSize: 48,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 52,
  },

  streakNumberCompact: {
    ...textStyles.h3,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },

  streakLabel: {
    ...textStyles.body,
    fontSize: 16,
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  streakLabelCompact: {
    ...textStyles.caption,
    fontSize: 12,
    color: colors.subtext,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing(4),
    paddingVertical: spacing(2),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
  },

  statItem: {
    alignItems: 'center',
    flex: 1,
  },

  statValue: {
    ...textStyles.h3,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  statLabel: {
    ...textStyles.caption,
    fontSize: 12,
    color: colors.subtext,
    textTransform: 'uppercase',
  },

  statDivider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.border,
  },

  calendar: {
    marginBottom: spacing(2),
  },

  calendarTitle: {
    ...textStyles.body,
    fontSize: 14,
    fontWeight: '600',
    color: colors.subtext,
    marginBottom: spacing(2),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  calendarDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  calendarDay: {
    alignItems: 'center',
    gap: spacing(0.5),
  },

  dayLabel: {
    ...textStyles.caption,
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '600',
  },

  dayLabelToday: {
    color: colors.accent,
  },

  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },

  dayDotActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },

  dayDotToday: {
    borderColor: colors.accent,
    borderWidth: 2,
  },

  motivationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
  },

  motivationText: {
    ...textStyles.body,
    fontSize: 14,
    color: colors.subtext,
    textAlign: 'center',
  },
});
