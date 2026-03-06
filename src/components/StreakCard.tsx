/**
 * STREAK CARD
 * - Restores the ring+badge+pill look
 * - Day pills now reflect the full current streak (not just today)
 * - Status badge shows progress toward the next streak milestone
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, serif } from '../theme/tokens';

const PILL_W = 44;
const PILL_GAP = 8;

// Common streak milestones used across the app
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  isActiveToday: boolean;
  streakCalendar?: Array<{ date: string; hasActivity: boolean }>;
  style?: any;
}

export default function StreakCard({
  currentStreak,
  longestStreak,
  isActiveToday,
  streakCalendar = [],
  style,
}: StreakCardProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const todayStr = new Date().toISOString().split('T')[0];

  // Next milestone and distance
  const nextMilestone = STREAK_MILESTONES.find((m) => m > currentStreak) ?? null;
  const daysToNext = nextMilestone ? nextMilestone - currentStreak : 0;

  const statusMessage = React.useMemo(() => {
    if (!isActiveToday) return 'Log in today to keep your streak alive';
    if (nextMilestone && daysToNext === 1) return `1 more day to your ${nextMilestone}-day badge`;
    if (nextMilestone && daysToNext <= 3) return `${daysToNext} days away from your ${nextMilestone}-day badge`;
    if (nextMilestone) return `${daysToNext} days to your ${nextMilestone}-day badge`;
    return 'Amazing streak — keep it going';
  }, [isActiveToday, nextMilestone, daysToNext]);

  const days = React.useMemo(() => {
    const todayDate = new Date(`${todayStr}T12:00:00`);
    return streakCalendar.map((day) => {
      const parsed = new Date(`${day.date}T12:00:00`);
      const letter = parsed.toLocaleDateString(undefined, { weekday: 'narrow' });
      const isToday = day.date === todayStr;
      // Mark a day as part of the streak if it falls within the last
      // `currentStreak` days ending at today (inclusive)
      const diffDays = Math.round(
        (todayDate.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24)
      );
      const isInStreak = diffDays >= 0 && diffDays < currentStreak;
      return { ...day, letter, isToday, isInStreak };
    });
  }, [streakCalendar, todayStr, currentStreak]);

  const todayIndex = days.findIndex((d) => d.isToday);

  useEffect(() => {
    if (scrollWidth > 0 && todayIndex >= 0 && scrollRef.current) {
      const pillCentre = todayIndex * (PILL_W + PILL_GAP) + PILL_W / 2;
      scrollRef.current.scrollTo({
        x: Math.max(0, pillCentre - scrollWidth / 2),
        animated: false,
      });
    }
  }, [scrollWidth, todayIndex]);

  return (
    <View style={[styles.card, style]}>

      {/* ── Header: flame ring + stats ── */}
      <View style={styles.header}>
        <View style={styles.flameWrap}>
          <View style={styles.flameRing}>
            <Ionicons
              name={currentStreak > 0 ? 'flame' : 'flame-outline'}
              size={34}
              color={colors.accent}
            />
          </View>
          {currentStreak > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{currentStreak}</Text>
            </View>
          )}
        </View>

        <View style={styles.statsBlock}>
          <Text style={styles.eyebrow}>Current Streak</Text>
          <Text style={styles.streakValue}>
            {currentStreak}
            <Text style={styles.streakUnit}> {currentStreak === 1 ? 'day' : 'days'}</Text>
          </Text>
          <Text style={styles.longestText}>
            Longest: {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
          </Text>
        </View>
      </View>

      {/* ── Status badge — shows milestone progress ── */}
      <View style={[styles.statusBadge, !isActiveToday && styles.statusBadgeWarn]}>
        <Ionicons
          name={isActiveToday ? 'checkmark-circle' : 'alert-circle'}
          size={15}
          color={isActiveToday ? colors.success : colors.warning}
        />
        <Text style={[styles.statusText, !isActiveToday && styles.statusTextWarn]}>
          {statusMessage}
        </Text>
        {/* Milestone proximity bar */}
        {isActiveToday && nextMilestone && (
          <View style={styles.milestoneTrack}>
            <View
              style={[
                styles.milestoneFill,
                { width: `${Math.round((currentStreak / nextMilestone) * 100)}%` as any },
              ]}
            />
          </View>
        )}
      </View>

      {/* ── Day pills (scrollable, today centred) ── */}
      {days.length > 0 && (
        <View>
          <Text style={styles.calLabel}>Last 7 Days</Text>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onLayout={(e: LayoutChangeEvent) => setScrollWidth(e.nativeEvent.layout.width)}
            contentContainerStyle={[
              styles.pillsRow,
              { paddingHorizontal: Math.max(0, (scrollWidth - PILL_W) / 2) },
            ]}
          >
            {days.map((day, i) => (
              <View key={i} style={styles.pillCell}>
                <View style={[
                  styles.pill,
                  day.isInStreak && styles.pillStreak,
                  day.isToday && styles.pillToday,
                ]}>
                  {day.isInStreak ? (
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={day.isToday ? colors.bg : colors.bg}
                    />
                  ) : (
                    <View style={styles.pillEmpty} />
                  )}
                </View>
                <Text style={[styles.pillLabel, day.isToday && styles.pillLabelToday]}>
                  {day.letter}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing(3),
    paddingBottom: spacing(2.5),
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderTopWidth: 2,
    borderTopColor: colors.accent + '70',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  flameWrap: {
    position: 'relative',
    marginRight: spacing(2.5),
  },
  flameRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent + '12',
    borderWidth: 1.5,
    borderColor: colors.accent + '35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: colors.bg,
  },
  statsBlock: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: colors.subtext,
    marginBottom: 3,
  },
  streakValue: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: serif,
    color: colors.text,
    lineHeight: 36,
    marginBottom: 3,
  },
  streakUnit: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: serif,
  },
  longestText: {
    fontSize: 12,
    color: colors.subtext,
  },

  // ── Status badge ──
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingVertical: spacing(1.25),
    paddingHorizontal: spacing(1.5),
    borderRadius: radii.md,
    borderWidth: 1,
    marginBottom: spacing(2.5),
    backgroundColor: colors.successBg,
    borderColor: colors.successBorder,
  },
  statusBadgeWarn: {
    backgroundColor: colors.warningBg,
    borderColor: colors.warningBorder,
  },
  statusText: {
    fontSize: 12,
    color: colors.success,
    flex: 1,
    lineHeight: 16,
  },
  statusTextWarn: {
    color: colors.warning,
  },
  // Thin progress bar inside the badge
  milestoneTrack: {
    height: 3,
    width: 40,
    borderRadius: 2,
    backgroundColor: 'rgba(76,175,80,0.2)',
    overflow: 'hidden',
  },
  milestoneFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 2,
  },

  // ── Pills ──
  calLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.subtext,
    marginBottom: spacing(1.25),
  },
  pillsRow: {
    flexDirection: 'row',
    gap: PILL_GAP,
  },
  pillCell: {
    width: PILL_W,
    alignItems: 'center',
    gap: 5,
  },
  pill: {
    width: PILL_W,
    height: 34,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillStreak: {
    backgroundColor: colors.accent + '55',
  },
  pillToday: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  pillEmpty: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    lineHeight: 13,
  },
  pillLabelToday: {
    color: colors.accent,
  },
});
