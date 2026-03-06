/**
 * Lessons Screen - Professional bartending curriculum
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, SafeAreaView, useWindowDimensions, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { Heading, MainPageHeader } from '../components/ui';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TabView, SceneMap } from 'react-native-tab-view';
import { curriculumData } from '../utils/curriculumAdapter';
import { useUser } from '../store/useUser';
import { useXPSystem } from '../store/useXPSystem';
import { useEngagement } from '../store/useEngagement';
import { streakService } from '../services/streakService';
import { useChallenges } from '../contexts/ChallengeContext';
import { RewardClaimModal } from '../components/RewardClaimModal';
import { rewardService } from '../services/rewardService';
import { Challenge } from '../types/challenge';
import { log } from '../lib/logger';
import XPBalanceModal from '../components/XPBalanceModal';
import FeatureTooltipOverlay from '../components/FeatureTooltipOverlay';
import { useFeatureTooltip } from '../hooks/useFeatureTooltip';
import { TOOLTIP_CONFIGS } from '../config/tooltipContent';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useAuth } from '../contexts/AuthContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Lazy evaluation - only compute when StyleSheet is created (after runtime ready)
const getSerifFont = () => serif;

// Stable renderScene reference — must live OUTSIDE the component.
// Defining SceneMap inside the component body creates a new function reference
// on every render, causing TabView to re-mount both scenes each time.
const renderScene = SceneMap({
  lessons: LessonsView,
  challenges: ChallengesView,
});

// Challenges component - Original Design with Supabase Data
function ChallengesView() {
  const { user } = useAuth();
  const { lives, completedLessons } = useUser();
  const { balance: totalXP } = useXPSystem();
  const engagement = useEngagement();
  const { challenges: supabaseChallenges, isLoading, claimReward, refreshChallenges } = useChallenges();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [liveStreak, setLiveStreak] = useState(streakService.getCurrentStreak());

  useEffect(() => {
    const unsubscribe = streakService.addStreakListener((next) => setLiveStreak(next));
    setLiveStreak(streakService.getCurrentStreak());
    return unsubscribe;
  }, []);

  // Group challenges by frequency
  const weeklyChallenges = supabaseChallenges.filter(c => c.frequency === 'weekly');
  const monthlyChallenges = supabaseChallenges.filter(c => c.frequency === 'monthly');

  // Handle claiming a challenge reward
  const handleClaimReward = async (challenge: Challenge) => {
    setClaimingId(challenge.id);
    try {
      const reward = await claimReward(challenge.id);
      if (reward) {
        await streakService.recordActivity('challenge_completed', user?.id);
        setLiveStreak(streakService.getCurrentStreak());
        await refreshChallenges();
        Alert.alert(
          'Reward Claimed!',
          `You received ${reward.xp} XP!`
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to claim reward');
    } finally {
      setClaimingId(null);
    }
  };

  // Calculate progress for unlock methods
  const getMethodProgress = (type: string, required: number) => {
    let current = 0;
    switch (type) {
      case 'streak':
        current = liveStreak;
        break;
      case 'lessons':
        current = completedLessons.length;
        break;
      case 'xp':
        current = totalXP;
        break;
      case 'app-opens':
        current = engagement.appOpenDates.length;
        break;
      case 'saved-recipes':
        current = engagement.savedRecipeIds.length;
        break;
      case 'shares':
        current = engagement.sharedRecipeIds.length;
        break;
      case 'ratings':
        current = engagement.ratedRecipeIds.length;
        break;
      case 'invites':
        current = engagement.invitedFriends;
        break;
      default:
        current = 0;
    }
    return Math.min((current / required) * 100, 100);
  };

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionSubtitle}>Challenge completion updates your streak and XP progress.</Text>
      </View>

      {/* Weekly Challenges */}
      {weeklyChallenges.length > 0 && (
        <View style={styles.section}>
          <Heading level={2} style={styles.sectionTitle}>Weekly Challenges</Heading>
          <Text style={styles.sectionSubtitle}>
            Complete challenges to earn extra XP and improve your skills
          </Text>

          {weeklyChallenges.map(challenge => {
            const progressPercent = ((challenge.currentProgress || 0) / challenge.requirementCount) * 100;
            return (
              <Pressable
                key={challenge.id}
                style={[styles.challengeCard, challenge.isCompleted && styles.challengeCardCompleted]}
                onPress={() => challenge.isCompleted && handleClaimReward(challenge)}
              >
                <View style={styles.challengeContent}>
                  <View style={styles.challengeHeader}>
                    <Heading level={3} style={[styles.challengeTitle, challenge.isCompleted && styles.completedText]}>
                      {challenge.title}
                    </Heading>
                    <Text style={[styles.challengeDifficulty, challenge.isCompleted && styles.completedText]}>
                      {challenge.difficulty}
                    </Text>
                  </View>
                  <Text style={[styles.challengeDescription, challenge.isCompleted && styles.completedText]}>
                    {challenge.description}
                  </Text>
                  <View style={styles.challengeProgressRow}>
                    <Text style={[styles.challengeReward, challenge.isCompleted && styles.completedText]}>
                      Reward: {challenge.xpReward} XP
                    </Text>
                    <Text style={styles.progressLabel}>
                      {challenge.currentProgress || 0}/{challenge.requirementCount}
                    </Text>
                  </View>
                </View>
                <View style={styles.challengeStatus}>
                  {challenge.isCompleted ? (
                    <MaterialCommunityIcons name="check-circle" size={24} color={colors.accent} />
                  ) : (
                    <Ionicons name={challenge.icon as any || 'trophy-outline'} size={24} color={colors.accent} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Monthly Challenges */}
      {monthlyChallenges.length > 0 && (
        <View style={styles.section}>
          <Heading level={2} style={styles.sectionTitle}>Monthly Challenges</Heading>
          <Text style={styles.sectionSubtitle}>
            Bigger goals with bigger rewards
          </Text>

          {monthlyChallenges.map(challenge => (
            <Pressable
              key={challenge.id}
              style={[styles.challengeCard, challenge.isCompleted && styles.challengeCardCompleted]}
              onPress={() => challenge.isCompleted && handleClaimReward(challenge)}
            >
              <View style={styles.challengeContent}>
                <View style={styles.challengeHeader}>
                  <Heading level={3} style={[styles.challengeTitle, challenge.isCompleted && styles.completedText]}>
                    {challenge.title}
                  </Heading>
                  <Text style={[styles.challengeDifficulty, challenge.isCompleted && styles.completedText]}>
                    {challenge.difficulty}
                  </Text>
                </View>
                <Text style={[styles.challengeDescription, challenge.isCompleted && styles.completedText]}>
                  {challenge.description}
                </Text>
                <View style={styles.challengeProgressRow}>
                  <Text style={[styles.challengeReward, challenge.isCompleted && styles.completedText]}>
                    Reward: {challenge.xpReward} XP
                  </Text>
                  <Text style={styles.progressLabel}>
                    {challenge.currentProgress || 0}/{challenge.requirementCount}
                  </Text>
                </View>
              </View>
              <View style={styles.challengeStatus}>
                {challenge.isCompleted ? (
                  <MaterialCommunityIcons name="check-circle" size={24} color={colors.accent} />
                ) : (
                  <Ionicons name={challenge.icon as any || 'medal-outline'} size={24} color={colors.accent} />
                )}
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Loading or Empty State */}
      {isLoading && (
        <View style={[styles.section, styles.centered]}>
          <Text style={styles.sectionSubtitle}>Loading challenges...</Text>
        </View>
      )}

      {!isLoading && supabaseChallenges.length === 0 && (
        <View style={[styles.section, styles.centered]}>
          <MaterialCommunityIcons name="trophy-outline" size={48} color={colors.subtext} />
          <Text style={styles.sectionSubtitle}>No active challenges</Text>
        </View>
      )}
    </ScrollView>
  );
}

function ChallengeProgressBar({ progressPercent, color }: { progressPercent: number; color: string }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.min(progressPercent, 100),
      duration: 600,
      delay: 120,
      useNativeDriver: false,
    }).start();
  }, [progressPercent]);

  return (
    <View style={styles.progressBarBg}>
      <Animated.View
        style={[
          styles.progressBarFill,
          {
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ['0%', '100%'],
            }),
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

// Challenges 2 - Real Supabase Data with Reward Claiming
function Challenges2View() {
  const { user } = useAuth();
  const { challenges, isLoading, refreshChallenges, claimReward: claimChallengeReward } = useChallenges();
  const { completedLessons } = useUser();
  const { balance: totalXP } = useXPSystem();
  const engagement = useEngagement();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [liveStreak, setLiveStreak] = useState(streakService.getCurrentStreak());
  const [claimedXP, setClaimedXP] = useState<number | null>(null);
  const toastAnim = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    const unsubscribe = streakService.addStreakListener((next) => setLiveStreak(next));
    setLiveStreak(streakService.getCurrentStreak());
    return unsubscribe;
  }, []);

  // Group challenges by frequency
  const dailyChallenges = challenges.filter(c => c.frequency === 'daily');
  const weeklyChallenges = challenges.filter(c => c.frequency === 'weekly');
  const monthlyChallenges = challenges.filter(c => c.frequency === 'monthly');

  // Calculate progress for each unlock method
  const getMethodProgress = (type: string, required: number) => {
    let current = 0;
    switch (type) {
      case 'streak':
        current = liveStreak;
        break;
      case 'lessons':
        current = completedLessons.length;
        break;
      case 'challenges':
        current = challenges.filter(c => c.isCompleted).length;
        break;
      case 'xp':
        current = totalXP;
        break;
      case 'app-opens':
        current = engagement.appOpenDates.length;
        break;
      case 'saved-recipes':
        current = engagement.savedRecipeIds.length;
        break;
      case 'shares':
        current = engagement.sharedRecipeIds.length;
        break;
      case 'ratings':
        current = engagement.ratedRecipeIds.length;
        break;
      case 'invites':
        current = engagement.invitedFriends;
        break;
      default:
        current = 0;
    }
    return Math.min((current / required) * 100, 100);
  };

  const handleClaimReward = async () => {
    if (!selectedChallenge) return;

    setClaiming(true);
    try {
      const reward = await claimChallengeReward(selectedChallenge.id);

      if (reward) {
        await streakService.recordActivity('challenge_completed', user?.id);
        setLiveStreak(streakService.getCurrentStreak());
        log.info('Challenges2View', 'Reward claimed successfully', { challengeId: selectedChallenge.id });
        setSelectedChallenge(null);
        setClaimedXP(reward.xp);
        Animated.sequence([
          Animated.spring(toastAnim, { toValue: 0, tension: 100, friction: 8, useNativeDriver: true }),
          Animated.delay(2200),
          Animated.timing(toastAnim, { toValue: -80, duration: 300, useNativeDriver: true }),
        ]).start(() => setClaimedXP(null));
        await refreshChallenges();
      } else {
        Alert.alert('Error', 'Failed to claim reward. Please try again.');
      }
    } catch (error) {
      log.error('Challenges2View', 'Error claiming reward', error);
      Alert.alert('Error', 'Failed to claim reward. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  const renderChallenge = (challenge: Challenge) => {
    const progressPercent = ((challenge.currentProgress || 0) / challenge.requirementCount) * 100;
    const isCompleted = challenge.isCompleted || false;

    return (
      <View key={challenge.id} style={[styles.challenge2Card, isCompleted && styles.challenge2CardCompleted]}>
        {/* Icon badge */}
        <View style={[styles.challenge2Icon, { backgroundColor: challenge.color }]}>
          <Ionicons name={challenge.icon as any} size={28} color="#FFF" />
        </View>

        {/* Content */}
        <View style={styles.challenge2Content}>
          <Heading level={3} style={[styles.challenge2Title, isCompleted && styles.challenge2Completed]}>
            {challenge.title}
          </Heading>
          <Text style={[styles.challenge2Description, isCompleted && styles.challenge2Completed]}>
            {challenge.description}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <ChallengeProgressBar progressPercent={progressPercent} color={challenge.color} />
            <Text style={styles.progressText}>
              {challenge.currentProgress || 0}/{challenge.requirementCount}
            </Text>
          </View>

          {/* Rewards */}
          <View style={styles.rewardRow}>
            <View style={styles.rewardBadge}>
              <MaterialCommunityIcons name="star-four-points" size={16} color={colors.gold} />
              <Text style={styles.rewardText}>{challenge.xpReward} XP</Text>
            </View>
          </View>

          {/* Claim Button */}
          {isCompleted && (
            <Pressable
              style={styles.claimButton}
              onPress={() => setSelectedChallenge(challenge)}
            >
              <MaterialCommunityIcons name="gift" size={20} color="#FFF" />
              <Text style={styles.claimButtonText}>Claim Reward</Text>
            </Pressable>
          )}
        </View>

        {/* Status indicator */}
        {isCompleted && (
          <View style={styles.challenge2Check}>
            <MaterialCommunityIcons name="check-circle" size={32} color={colors.accent} />
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.content, styles.centered]}>
        <Text style={styles.sectionSubtitle}>Loading challenges...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionSubtitle}>Challenge completion updates your streak and XP progress.</Text>
        </View>

        {/* Daily section */}
        {dailyChallenges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Heading level={2} style={styles.sectionTitle}>Daily Challenges</Heading>
                <Text style={styles.sectionSubtitle}>Resets daily at midnight</Text>
              </View>
              <View style={styles.frequencyBadge}>
                <Ionicons name="today-outline" size={18} color={colors.accent} />
              </View>
            </View>
            {dailyChallenges.map(renderChallenge)}
          </View>
        )}

        {/* Weekly section */}
        {weeklyChallenges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Heading level={2} style={styles.sectionTitle}>Weekly Challenges</Heading>
                <Text style={styles.sectionSubtitle}>Resets every Monday</Text>
              </View>
              <View style={styles.frequencyBadge}>
                <Ionicons name="calendar-outline" size={18} color={colors.accent} />
              </View>
            </View>
            {weeklyChallenges.map(renderChallenge)}
          </View>
        )}

        {/* Monthly section */}
        {monthlyChallenges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Heading level={2} style={styles.sectionTitle}>Monthly Challenges</Heading>
                <Text style={styles.sectionSubtitle}>Resets on the 1st</Text>
              </View>
              <View style={styles.frequencyBadge}>
                <MaterialCommunityIcons name="trophy-variant" size={18} color={colors.gold} />
              </View>
            </View>
            {monthlyChallenges.map(renderChallenge)}
          </View>
        )}

        {challenges.length === 0 && (
          <View style={[styles.section, styles.centered]}>
            <MaterialCommunityIcons name="trophy-outline" size={64} color={colors.textMuted} />
            <Heading level={2} style={styles.sectionTitle}>No Active Challenges</Heading>
            <Text style={styles.sectionSubtitle}>Check back soon for new challenges!</Text>
          </View>
        )}
      </ScrollView>

      {/* XP Celebration Toast */}
      {claimedXP !== null && (
        <Animated.View
          pointerEvents="none"
          style={[styles.celebrationToast, { transform: [{ translateY: toastAnim }] }]}
        >
          <MaterialCommunityIcons name="star-four-points" size={20} color={colors.gold} />
          <Text style={styles.celebrationToastText}>+{claimedXP} XP Claimed!</Text>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
        </Animated.View>
      )}

      {/* Reward Claim Modal */}
      <RewardClaimModal
        visible={!!selectedChallenge}
        reward={selectedChallenge ? {
          xp: selectedChallenge.xpReward,
          badge: selectedChallenge.badgeReward
        } : null}
        challengeTitle={selectedChallenge?.title || ''}
        onClaim={handleClaimReward}
        onClose={() => setSelectedChallenge(null)}
        claiming={claiming}
      />
    </>
  );
}

// Lessons component (extracted from main component)
function LessonsView() {
  const navigation = useNavigation<NavigationProp>();
  const { lives, completedLessons, checkLifeRefresh } = useUser();
  const { gateWithTrigger: masteryGate } = useFeatureAccess('mastery_lessons');
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [moduleLessons, setModuleLessons] = useState<any[]>([]);

  useEffect(() => {
    // Check for life refresh on screen load
    checkLifeRefresh();

    // Load actual curriculum modules
    const sortedModules = curriculumData.modules
      .sort((a, b) => a.chapterIndex - b.chapterIndex)
      .map(module => ({
        ...module,
        completed: false, // Calculate based on completed lessons
        locked: module.chapterIndex > 1 // Lock modules after first
      }));

    setModules(sortedModules);
  }, [checkLifeRefresh]);

  const handleModulePress = (module: any) => {
    if (module.locked) return;

    // Load lessons for selected module
    const lessons = curriculumData.lessons.filter(lesson => lesson.moduleId === module.id);
    const availableLessons = lessons.filter(lesson => (lesson.itemIds?.length || 0) > 0);
    setSelectedModule(module);
    setModuleLessons(availableLessons.length > 0 ? availableLessons : lessons);
  };

  const handleBackToModules = () => {
    setSelectedModule(null);
    setModuleLessons([]);
  };

  const handleLessonPress = (lesson: any) => {
    masteryGate('T10', () => {
      log.nav('LessonsScreen', 'LessonEngine', { lessonId: lesson.id, title: lesson.title });
      navigation.navigate('LessonEngine', {
        lessonId: lesson.id,
        isFirstLesson: false
      });
    });
  };

  const renderModule = (module: any, index: number) => {
    const isNext = !module.completed && !module.locked;
    const isCompleted = module.completed;
    const isLocked = module.locked;
    const isLast = index === modules.length - 1;

    return (
      <View key={module.id} style={styles.timelineRow}>
        {/* Timeline Container */}
        <View style={styles.timelineColumn}>
          <View style={[
            styles.timelineNode,
            isCompleted && styles.nodeCompleted,
            isNext && styles.nodeNext,
            isLocked && styles.nodeLocked
          ]}>
            {isCompleted && <MaterialCommunityIcons name="check" size={16} color="#FFF" />}
            {isNext && <MaterialCommunityIcons name="star-outline" size={16} color="#FFF" />}
            {isLocked && <MaterialCommunityIcons name="lock-outline" size={14} color="#FFF" />}
          </View>
          {!isLast && <View style={[styles.timelineLine, (isCompleted || isNext) && styles.lineActive]} />}
        </View>

        {/* Content Container */}
        <Pressable
          style={styles.timelineContent}
          disabled={module.locked}
          onPress={() => handleModulePress(module)}
        >
          <Text style={[styles.timelineTitle, isLocked && styles.timelineTitleLocked]}>
            {module.title}
          </Text>
          <Text style={[
            styles.timelineSubtitle,
            isCompleted && styles.subtitleCompleted,
            isNext && styles.subtitleNext,
            isLocked && styles.subtitleLocked
          ]}>
            {isCompleted ? 'Completed' : isNext ? 'In Progress' : 'Locked'}
          </Text>
        </Pressable>
      </View>
    );
  };

  const renderLesson = (lesson: any, index: number) => {
    const hasContent = (lesson.itemIds?.length || 0) > 0;
    const isCompleted = completedLessons.includes(lesson.id);
    const isLocked = !hasContent || (index > 0 && !completedLessons.includes(moduleLessons[index - 1]?.id));
    const outOfLives = lives <= 0;
    const isNext = !isCompleted && !isLocked;
    const isLast = index === moduleLessons.length - 1;

    // Determine status text and style
    let statusText = 'Locked';
    let subtitleStyle: any = styles.subtitleLocked;

    if (!hasContent) {
      statusText = 'Coming Soon';
      subtitleStyle = styles.subtitleLocked;
    } else
    if (isCompleted) {
      statusText = 'Completed';
      subtitleStyle = styles.subtitleCompleted;
    } else if (isNext) {
      statusText = outOfLives ? 'Out of Lives' : 'In Progress';
      subtitleStyle = outOfLives ? { color: colors.error, opacity: 0.8 } : styles.subtitleNext;
    }

    return (
      <View key={lesson.id} style={styles.timelineRow}>
        {/* Timeline Container */}
        <View style={styles.timelineColumn}>
          <View style={[
            styles.timelineNode,
            isCompleted && styles.nodeCompleted,
            isNext && styles.nodeNext,
            isLocked && styles.nodeLocked,
            (isNext && outOfLives) && { borderColor: colors.error }
          ]}>
            {isCompleted && <MaterialCommunityIcons name="check" size={16} color="#FFF" />}
            {isNext && !outOfLives && <MaterialCommunityIcons name="star-outline" size={16} color="#FFF" />}
            {isNext && outOfLives && <MaterialCommunityIcons name="heart-broken" size={16} color="#FF6B6B" />}
            {isLocked && <MaterialCommunityIcons name="lock-outline" size={14} color="#FFF" />}
          </View>
          {!isLast && <View style={[styles.timelineLine, (isCompleted || isNext) && styles.lineActive]} />}
        </View>

        {/* Content Container */}
        <Pressable
          style={styles.timelineContent}
          disabled={!hasContent || isLocked || (isNext && outOfLives)}
          onPress={() => handleLessonPress(lesson)}
        >
          <Text style={[styles.timelineTitle, isLocked && styles.timelineTitleLocked]}>
            {lesson.title}
          </Text>
          <Text style={[styles.timelineSubtitle, subtitleStyle]}>
            {statusText}
          </Text>

          {/* Optional: Show Duration if not locked */}
          {!isLocked && (
            <Text style={{ fontSize: 12, color: colors.subtext, marginTop: 2, opacity: 0.6 }}>
              {lesson.estimatedMinutes} min • {lesson.types[0]}
            </Text>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!selectedModule ? (
          /* Show Chapters */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bartending Curriculum</Text>
            <Text style={styles.sectionSubtitle}>
              Professional bartending course designed by industry experts
            </Text>
            {modules.map(renderModule)}
          </View>
        ) : (
          /* Show Lessons for Selected Chapter */
          <View style={styles.section}>
            <Pressable onPress={handleBackToModules} style={styles.backButton}>
              <Ionicons name="arrow-back" size={20} color={colors.accent} />
              <Text style={styles.backButtonText}>Back to Chapters</Text>
            </Pressable>

            <Text style={styles.sectionTitle}>{selectedModule.title}</Text>
            <Text style={styles.sectionSubtitle}>
              Chapter {selectedModule.chapterIndex} • {moduleLessons.length} lessons • {selectedModule.estimatedMinutes} min
            </Text>
            {moduleLessons.map(renderLesson)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function LessonsScreen() {
  const layout = useWindowDimensions();
  const { lives } = useUser();
  const { balance: xpBalance } = useXPSystem();
  const navigation = useNavigation<NavigationProp>();
  const { showTooltip, dismissTooltip } = useFeatureTooltip('lessons');
  const [liveStreak, setLiveStreak] = useState(streakService.getCurrentStreak());
  const [xpBalanceModalVisible, setXpBalanceModalVisible] = useState(false);

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'lessons', title: 'Lessons' },
    { key: 'challenges', title: 'Challenges' },
  ]);

  useEffect(() => {
    const unsubscribe = streakService.addStreakListener((next) => setLiveStreak(next));
    setLiveStreak(streakService.getCurrentStreak());
    return unsubscribe;
  }, []);

  const handleLivesPress = () => {
    Alert.alert(
      'Lives',
      `You currently have ${lives} ${lives === 1 ? 'life' : 'lives'}.`,
      [{ text: 'OK' }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <MainPageHeader
        title="Lessons"
        leftContent={
          <View style={styles.headerMetrics}>
            <Pressable
              style={styles.headerMetric}
              onPress={() => setXpBalanceModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={`XP balance ${xpBalance}`}
            >
              <Text style={styles.headerMetricValue}>{xpBalance}</Text>
              <Text style={styles.headerMetricLabel}>XP</Text>
            </Pressable>
            <View style={styles.headerMetric}>
              <Text style={styles.headerMetricValue}>{liveStreak}</Text>
              <Text style={styles.headerMetricLabel}>Streak</Text>
            </View>
          </View>
        }
        rightContent={
          <View style={styles.headerIcons}>
            <Pressable
              style={styles.headerIconButton}
              onPress={handleLivesPress}
              accessibilityRole="button"
              accessibilityLabel={`Lives ${lives}`}
            >
              <MaterialCommunityIcons name="heart" size={18} color="#FF6B6B" />
              <Text style={styles.headerIconText}>{lives}</Text>
            </Pressable>
            <Pressable
              style={styles.headerIconButton}
              onPress={() => {
                log.nav('LessonsScreen', 'Vault', {});
                navigation.navigate('Vault');
              }}
              accessibilityRole="button"
              accessibilityLabel="Open vault"
            >
              <MaterialCommunityIcons name="treasure-chest" size={18} color={colors.gold} />
            </Pressable>
          </View>
        }
      />

      <View style={styles.segmentedTabs}>
        <Pressable
          onPress={() => setIndex(0)}
          style={[
            styles.segmentedTabButton,
            index === 0 && styles.segmentedTabButtonActive,
          ]}
        >
          <Text style={[
            styles.segmentedTabText,
            index === 0 && styles.segmentedTabTextActive,
          ]}>
            Lessons
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setIndex(1)}
          style={[
            styles.segmentedTabButton,
            index === 1 && styles.segmentedTabButtonActive,
          ]}
        >
          <Text style={[
            styles.segmentedTabText,
            index === 1 && styles.segmentedTabTextActive,
          ]}>
            Challenges
          </Text>
        </Pressable>
      </View>

      {/* Tab View */}
      <TabView
        lazy
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={() => null}
      />

      {/* Educational Tooltip Overlay */}
      <FeatureTooltipOverlay
        visible={showTooltip}
        onDismiss={dismissTooltip}
        title={TOOLTIP_CONFIGS.lessons.title}
        steps={TOOLTIP_CONFIGS.lessons.steps}
        arrows={[
          {
            from: { x: layout.width / 2, y: layout.height * 0.5 },
            to: { x: layout.width - 60, y: 100 },
            label: '❤️ Lives'
          },
          {
            from: { x: layout.width / 2 - 60, y: layout.height * 0.5 },
            to: { x: layout.width / 2 + 20, y: 100 },
            label: '🔥 Streak'
          },
          {
            from: { x: layout.width / 2 + 80, y: layout.height * 0.5 },
            to: { x: layout.width - 20, y: 100 },
            label: '👤 Profile'
          },
        ]}
      />

      <XPBalanceModal
        visible={xpBalanceModalVisible}
        onClose={() => setXpBalanceModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Header
  headerMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.25),
  },
  headerMetric: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  headerMetricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 18,
  },
  headerMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    lineHeight: 12,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  headerIconButton: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(1),
    gap: spacing(0.5),
  },
  headerIconText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  segmentedTabs: {
    marginHorizontal: spacing(2),
    marginTop: spacing(2),
    marginBottom: spacing(1.5),
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 4,
  },
  segmentedTabButton: {
    flex: 1,
    paddingVertical: spacing(1),
    borderRadius: radii.md,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  segmentedTabButtonActive: {
    backgroundColor: colors.accent,
  },
  segmentedTabText: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 15,
  },
  segmentedTabTextActive: {
    color: colors.bg,
    fontWeight: '700',
  },

  levelContainer: {
    alignItems: 'center',
  },

  levelText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
    fontFamily: getSerifFont(),
  },

  // Content
  content: {
    flex: 1,
  },

  section: {
    paddingHorizontal: spacing(2.5),
    paddingTop: spacing(3),
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
    letterSpacing: 0.4,
    fontFamily: getSerifFont(),
  },

  sectionSubtitle: {
    fontSize: 15,
    color: colors.subtext,
    marginBottom: spacing(3),
    lineHeight: 22,
    opacity: 0.8,
  },

  // Module Cards
  moduleCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  moduleCardLocked: {
    opacity: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },

  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(2.5),
  },

  moduleIndex: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing(2),
  },

  moduleIndexText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
  },

  moduleInfo: {
    flex: 1,
  },

  moduleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
    letterSpacing: 0.2,
    fontFamily: getSerifFont(),
  },

  moduleTime: {
    fontSize: 13,
    color: colors.subtext,
    opacity: 0.8,
  },

  moduleActions: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Back Button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing(3),
    gap: spacing(1),
  },

  backButtonText: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: '600',
  },

  // Lesson Cards
  lessonCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginBottom: spacing(1.5),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(2),
  },

  lessonCardLocked: {
    opacity: 0.4,
  },

  lessonCardOutOfLives: {
    opacity: 0.6,
    backgroundColor: 'rgba(255, 107, 107, 0.05)',
    borderColor: 'rgba(255, 107, 107, 0.15)',
  },

  lessonContent: {
    flex: 1,
  },

  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing(1),
  },

  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing(2),
    letterSpacing: 0.1,
  },

  lessonTime: {
    fontSize: 12,
    color: colors.subtext,
    opacity: 0.7,
  },

  lessonTypes: {
    flexDirection: 'row',
    gap: spacing(1),
    flexWrap: 'wrap',
  },

  typeTag: {
    backgroundColor: `${colors.accent}15`,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
  },

  typeText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  lessonStatus: {
    marginLeft: spacing(2),
  },

  lockedText: {
    color: colors.subtext,
    opacity: 0.5,
  },

  unlockRequirement: {
    fontSize: 11,
    color: colors.subtext,
    fontStyle: 'italic',
    marginTop: spacing(0.5),
    opacity: 0.7,
  },

  outOfLivesText: {
    color: colors.error,
    opacity: 0.7,
  },

  outOfLivesMessage: {
    fontSize: 11,
    color: colors.error,
    fontStyle: 'italic',
    marginTop: spacing(0.5),
    opacity: 0.8,
  },

  typeTagDisabled: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    opacity: 0.6,
  },

  typeTextDisabled: {
    color: colors.error,
    opacity: 0.7,
  },

  // Challenge styles
  challengeCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(1.5),
    marginBottom: spacing(1.5),
    flexDirection: 'row',
    alignItems: 'center',
  },

  challengeCardCompleted: {
    backgroundColor: 'rgba(139, 103, 67, 0.1)',
    borderColor: colors.accent,
  },

  challengeContent: {
    flex: 1,
  },

  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(0.5),
  },

  challengeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },

  challengeDifficulty: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
    backgroundColor: 'rgba(139, 103, 67, 0.15)',
    paddingHorizontal: spacing(0.75),
    paddingVertical: spacing(0.4),
    borderRadius: radii.sm,
    marginLeft: spacing(1),
  },

  challengeDescription: {
    fontSize: 13,
    color: colors.subtext,
    marginBottom: spacing(0.5),
    lineHeight: 18,
  },

  challengeReward: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },

  challengeStatus: {
    marginLeft: spacing(1.5),
  },

  challengeProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  progressLabel: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '600',
  },

  completedText: {
    opacity: 0.7,
  },

  // Challenge 2 styles
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing(2.5),
  },

  frequencyBadge: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    backgroundColor: 'rgba(139, 103, 67, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  challenge2Card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginBottom: spacing(2),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    padding: spacing(2.5),
    position: 'relative',
    overflow: 'hidden',
  },

  challenge2CardCompleted: {
    borderColor: 'rgba(139, 103, 67, 0.3)',
    backgroundColor: 'rgba(139, 103, 67, 0.05)',
  },

  challenge2Icon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing(2),
  },

  challenge2Content: {
    flex: 1,
  },

  challenge2Title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },

  challenge2Description: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(1.5),
    lineHeight: 20,
  },

  challenge2Completed: {
    opacity: 0.7,
  },

  progressContainer: {
    marginBottom: spacing(1.5),
  },

  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing(0.5),
  },

  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },

  progressText: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '600',
  },

  rewardRow: {
    flexDirection: 'row',
    gap: spacing(1.5),
  },

  rewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.md,
    gap: spacing(0.5),
  },

  rewardText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.gold,
  },

  challenge2Check: {
    position: 'absolute',
    top: spacing(1),
    right: spacing(1),
  },

  claimButton: {
    marginTop: spacing(1.5),
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    alignSelf: 'flex-start',
  },

  claimButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing(4),
  },

  celebrationToast: {
    position: 'absolute',
    top: 0,
    left: spacing(3),
    right: spacing(3),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1.5),
    backgroundColor: colors.card,
    borderRadius: radii.pill,
    paddingVertical: spacing(1.75),
    paddingHorizontal: spacing(3),
    borderWidth: 1,
    borderColor: colors.gold + '50',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },

  celebrationToastText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.gold,
    flex: 1,
    textAlign: 'center',
  },

  // Timeline Styles
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 0, // Timeline flows continuously
    minHeight: 80,
  },
  timelineColumn: {
    alignItems: 'center',
    width: 40,
    marginRight: spacing(2),
  },
  timelineNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#3E3E3E',
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  nodeCompleted: {
    backgroundColor: colors.bg,
    borderColor: '#FFF',
  },
  nodeNext: {
    borderColor: '#FFF',
  },
  nodeLocked: {
    borderColor: colors.subtext,
    opacity: 0.5,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 4,
  },
  lineActive: {
    backgroundColor: colors.gold,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
    paddingBottom: spacing(3),
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
    fontFamily: getSerifFont(),
  },
  timelineTitleLocked: {
    color: colors.subtext,
    opacity: 0.7,
  },
  timelineSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  subtitleCompleted: {
    color: colors.gold,
  },
  subtitleNext: {
    color: colors.gold,
    opacity: 0.9,
  },
  subtitleLocked: {
    color: '#D4C5A9', // Beige-ish
    opacity: 0.6,
  },
});
