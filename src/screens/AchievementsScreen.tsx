/**
 * ACHIEVEMENTS SCREEN
 * Shows user achievements, streaks, and engagement stats
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { Heading } from '../components/ui';
import { achievementService, Achievement } from '../services/achievementService';
import { streakService } from '../services/streakService';
import { useXPSystem } from '../store/useXPSystem';
import AchievementCard from '../components/AchievementCard';
import StreakCard from '../components/StreakCard';
import AchievementUnlockModal from '../components/AchievementUnlockModal';

type TabType = 'all' | 'recipe' | 'collection' | 'knowledge' | 'streak';

/**
 * AchievementsScreen Component
 *
 * Comprehensive view of user progress, achievements, and engagement
 */
export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);
  const [streakData, setStreakData] = useState(streakService.getStreakData());

  // Use useXPSystem as the single source of truth for XP/level
  const { balance: totalXP } = useXPSystem();
  const currentLevel = Math.floor(totalXP / 100) + 1;
  const xpInLevel = totalXP % 100;
  const xpForNextLevel = 100;
  const levelProgress = xpInLevel / xpForNextLevel;

  useEffect(() => {
    loadData();

    // Subscribe to achievement unlocks
    const unsubscribe = achievementService.addAchievementListener((achievement) => {
      setUnlockedAchievement(achievement);
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadData = () => {
    setAchievements(achievementService.getAchievements());
    setStreakData(streakService.getStreakData());
  };

  const filteredAchievements = activeTab === 'all'
    ? achievements
    : achievements.filter(a => a.category === activeTab);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalAchievements = achievements.length;

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'all', label: 'All', icon: 'grid-outline' },
    { key: 'recipe', label: 'Recipe', icon: 'restaurant-outline' },
    { key: 'collection', label: 'Collection', icon: 'albums-outline' },
    { key: 'knowledge', label: 'Knowledge', icon: 'school-outline' },
    { key: 'streak', label: 'Streak', icon: 'flame-outline' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Stats */}
        <View style={styles.header}>
          <Heading level={1} style={styles.headerTitle}>Your Progress</Heading>

          {/* Level Card */}
          <View style={styles.levelCard}>
            <View style={styles.levelHeader}>
              <View>
                <Text style={styles.levelLabel}>LEVEL</Text>
                <Text style={styles.levelNumber}>{currentLevel}</Text>
              </View>
              <View style={styles.xpBadge}>
                <Ionicons name="star" size={16} color={colors.gold} />
                <Text style={styles.xpText}>{totalXP} XP</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${levelProgress * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {xpInLevel} / {xpForNextLevel} XP to next level
              </Text>
            </View>
          </View>

          {/* Achievement Summary */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="trophy" size={24} color={colors.gold} />
              </View>
              <Text style={styles.summaryValue}>
                {unlockedCount}/{totalAchievements}
              </Text>
              <Text style={styles.summaryLabel}>Achievements</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="flame" size={24} color={colors.accent} />
              </View>
              <Text style={styles.summaryValue}>{streakData.currentStreak}</Text>
              <Text style={styles.summaryLabel}>Day Streak</Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="calendar" size={24} color={colors.accent} />
              </View>
              <Text style={styles.summaryValue}>{streakData.totalDaysActive}</Text>
              <Text style={styles.summaryLabel}>Total Days</Text>
            </View>
          </View>
        </View>

        {/* Streak Card */}
        <StreakCard
          currentStreak={streakData.currentStreak}
          longestStreak={streakData.longestStreak}
          isActiveToday={streakService.isActiveToday()}
          streakCalendar={streakService.getStreakCalendar(7)}
          style={styles.streakCard}
        />

        {/* Category Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabs}
          >
            {tabs.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  activeTab === tab.key && styles.tabActive,
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={18}
                  color={activeTab === tab.key ? colors.accent : colors.subtext}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab.key && styles.tabTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Achievements List */}
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
              <Text style={styles.emptyText}>No achievements in this category</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Achievement Unlock Modal */}
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
    paddingBottom: spacing(6),
  },
  header: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
    paddingBottom: spacing(3),
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(3),
    fontFamily: serif,
  },
  levelCard: {
    padding: spacing(3),
    borderRadius: radii.lg,
    marginBottom: spacing(3),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(2),
  },
  levelLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subtext,
    letterSpacing: 1,
  },
  levelNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.text,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gold,
  },
  progressContainer: {
    marginTop: spacing(1),
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.line,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing(1),
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: colors.subtext,
    textAlign: 'right',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.card,
    padding: spacing(2),
    borderRadius: radii.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(1),
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    marginBottom: spacing(0.25),
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.subtext,
    textAlign: 'center',
  },
  streakCard: {
    marginHorizontal: spacing(3),
  },
  tabsContainer: {
    marginTop: spacing(3),
    marginBottom: spacing(2),
  },
  tabs: {
    paddingHorizontal: spacing(3),
    gap: spacing(1.5),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.line,
  },
  tabActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.subtext,
  },
  tabTextActive: {
    color: colors.bg,
  },
  achievementsList: {
    paddingHorizontal: spacing(3),
    marginTop: spacing(2),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(8),
  },
  emptyText: {
    fontSize: 16,
    color: colors.muted,
    marginTop: spacing(2),
  },
});
