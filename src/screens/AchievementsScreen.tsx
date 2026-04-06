/**
 * ACHIEVEMENTS SCREEN
 * Shows user achievements, streaks, and engagement stats
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { achievementService, Achievement } from '../services/achievementService';
import { streakService } from '../services/streakService';
import { useXPSystem } from '../store/useXPSystem';
import AchievementCard from '../components/AchievementCard';
import StreakCard from '../components/StreakCard';
import AchievementUnlockModal from '../components/AchievementUnlockModal';
import InPageTabBar from '../components/ui/InPageTabBar';

type TabType = 'all' | 'recipe' | 'collection' | 'knowledge' | 'streak';

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);
  const [streakData, setStreakData] = useState(streakService.getStreakData());
  const barAnim = useRef(new Animated.Value(0)).current;

  const { balance: totalXP } = useXPSystem();
  const currentLevel = Math.floor(totalXP / 100) + 1;
  const xpInLevel = totalXP % 100;
  const xpForNextLevel = 100;
  const levelProgress = xpInLevel / xpForNextLevel;

  useEffect(() => {
    loadData();
    const unsubscribe = achievementService.addAchievementListener((achievement) => {
      setUnlockedAchievement(achievement);
      loadData();
    });
    return () => { unsubscribe(); };
  }, []);

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: levelProgress,
      duration: 900,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [levelProgress]);

  const loadData = () => {
    setAchievements(achievementService.getAchievements());
    setStreakData(streakService.getStreakData());
  };

  const filteredAchievements = activeTab === 'all'
    ? achievements
    : achievements.filter(a => a.category === activeTab);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalAchievements = achievements.length;
  const completionPct = totalAchievements > 0 ? Math.round((unlockedCount / totalAchievements) * 100) : 0;

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'grid-outline' },
    { key: 'recipe', label: 'Recipe', icon: 'restaurant-outline' },
    { key: 'collection', label: 'Collection', icon: 'albums-outline' },
    { key: 'knowledge', label: 'Knowledge', icon: 'school-outline' },
    { key: 'streak', label: 'Streak', icon: 'flame-outline' },
  ];

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero: Level + XP ── */}
        <View style={styles.heroSection}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroEyebrow}>YOUR LEVEL</Text>
              <Text style={styles.heroLevel}>{currentLevel}</Text>
            </View>
            <View style={styles.heroRight}>
              <View style={styles.totalXPBadge}>
                <Ionicons name="flash" size={13} color={colors.gold} />
                <Text style={styles.totalXPText}>{totalXP.toLocaleString()} XP</Text>
              </View>
              <Text style={styles.heroNextLabel}>
                {xpInLevel} / {xpForNextLevel} to next
              </Text>
            </View>
          </View>

          {/* Animated XP bar */}
          <View style={styles.heroBarTrack}>
            <Animated.View style={[styles.heroBarFill, { width: barWidth }]} />
            {/* Notch markers */}
            {[25, 50, 75].map(pct => (
              <View
                key={pct}
                style={[styles.heroBarNotch, { left: `${pct}%` as any }]}
              />
            ))}
          </View>
        </View>

        {/* ── Stat Row ── */}
        <View style={styles.statRow}>
          <View style={[styles.statCell, styles.statCellBorder]}>
            <Text style={styles.statValue}>{unlockedCount}<Text style={styles.statDenom}>/{totalAchievements}</Text></Text>
            <Text style={styles.statLabel}>Unlocked</Text>
          </View>
          <View style={[styles.statCell, styles.statCellBorder]}>
            <Text style={styles.statValue}>{streakData.currentStreak}<Text style={styles.statUnit}> d</Text></Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statCell}>
            <Text style={styles.statValue}>{completionPct}<Text style={styles.statUnit}>%</Text></Text>
            <Text style={styles.statLabel}>Complete</Text>
          </View>
        </View>

        {/* ── Streak card ── */}
        <StreakCard
          currentStreak={streakData.currentStreak}
          longestStreak={streakData.longestStreak}
          isActiveToday={streakService.isActiveToday()}
          streakCalendar={streakService.getStreakCalendar(7)}
          style={styles.streakCard}
        />

        {/* ── Category filter ── */}
        <View style={styles.tabsContainer}>
          <InPageTabBar
            items={tabs}
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabType)}
            scrollable
          />
        </View>

        {/* ── Section label ── */}
        <View style={styles.sectionLabelRow}>
          <View style={styles.sectionLabelLine} />
          <Text style={styles.sectionLabelText}>
            {activeTab === 'all' ? 'ALL ACHIEVEMENTS' : activeTab.toUpperCase()}
          </Text>
          <View style={styles.sectionLabelLine} />
        </View>

        {/* ── Achievements list ── */}
        <View style={styles.achievementsList}>
          {filteredAchievements.length > 0 ? (
            filteredAchievements.map(achievement => (
              <AchievementCard
                key={achievement.id}
                achievement={achievement}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyText}>No achievements in this category yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <AchievementUnlockModal
        visible={!!unlockedAchievement}
        achievement={unlockedAchievement}
        onClose={() => setUnlockedAchievement(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingBottom: spacing(8),
  },

  // Hero
  heroSection: {
    marginHorizontal: spacing(3),
    marginTop: spacing(2),
    marginBottom: spacing(0.5),
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.18)',
    padding: spacing(3),
    paddingBottom: spacing(2.5),
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing(2.5),
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 2,
    marginBottom: spacing(0.25),
  },
  heroLevel: {
    fontSize: 64,
    fontWeight: '900',
    color: colors.text,
    fontFamily: serif,
    lineHeight: 68,
  },
  heroRight: {
    alignItems: 'flex-end',
    gap: spacing(0.75),
    paddingTop: spacing(1),
  },
  totalXPBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(214,138,56,0.12)',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.6),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(214,138,56,0.25)',
  },
  totalXPText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.gold,
  },
  heroNextLabel: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '500',
  },
  heroBarTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  heroBarFill: {
    height: '100%',
    backgroundColor: colors.gold,
    borderRadius: 3,
  },
  heroBarNotch: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },

  // Stat row
  statRow: {
    flexDirection: 'row',
    marginHorizontal: spacing(3),
    marginTop: spacing(2),
    marginBottom: spacing(1),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing(2),
  },
  statCellBorder: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    fontFamily: serif,
  },
  statDenom: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.subtext,
    fontFamily: undefined,
  },
  statUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.subtext,
    fontFamily: undefined,
  },
  statLabel: {
    fontSize: 11,
    color: colors.subtext,
    marginTop: 2,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Streak
  streakCard: {
    marginHorizontal: spacing(3),
    marginTop: spacing(2),
  },

  // Tabs
  tabsContainer: {
    marginTop: spacing(3),
    marginBottom: spacing(0.5),
  },

  // Section label
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing(3),
    marginTop: spacing(3),
    marginBottom: spacing(2),
    gap: spacing(1.5),
  },
  sectionLabelLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sectionLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 2,
  },

  // Achievements list
  achievementsList: {
    paddingHorizontal: spacing(3),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(8),
    gap: spacing(1.5),
  },
  emptyText: {
    fontSize: 15,
    color: colors.subtext,
    textAlign: 'center',
  },
});
