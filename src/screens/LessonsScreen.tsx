/**
 * Lessons Screen - Professional bartending curriculum
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, SafeAreaView, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing, radii } from '../theme/tokens';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import curriculumData from '../../curriculum-data.json';
import { useUser } from '../store/useUser';
import { useXPSystem } from '../store/useXPSystem';
import { useEngagement } from '../store/useEngagement';
import { useChallenges } from '../contexts/ChallengeContext';
import { RewardClaimModal } from '../components/RewardClaimModal';
import { rewardService } from '../services/rewardService';
import { Challenge } from '../types/challenge';
import { log } from '../lib/logger';
import XPBalanceModal from '../components/XPBalanceModal';
import RecipeUnlockCard from '../components/RecipeUnlockCard';
import { EARNABLE_RECIPES } from '../config/recipeUnlocks';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Challenges component - Original Design
function ChallengesView() {
  const { lives, xp, level, streak } = useUser();

  const challenges = [
    { id: 1, title: 'Speed Mixing', description: 'Mix 5 cocktails in under 3 minutes', reward: '50 XP', difficulty: 'Easy', completed: false },
    { id: 2, title: 'Perfect Pour', description: 'Pour 10 perfect shots without spillage', reward: '75 XP', difficulty: 'Medium', completed: true },
    { id: 3, title: 'Memory Master', description: 'Recite 20 cocktail recipes from memory', reward: '100 XP', difficulty: 'Hard', completed: false },
    { id: 4, title: 'Garnish Artist', description: 'Create 15 unique garnish combinations', reward: '60 XP', difficulty: 'Medium', completed: false },
  ];

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Challenges</Text>
        <Text style={styles.sectionSubtitle}>
          Complete challenges to earn extra XP and improve your skills
        </Text>

        {challenges.map(challenge => (
          <Pressable
            key={challenge.id}
            style={[styles.challengeCard, challenge.completed && styles.challengeCardCompleted]}
          >
            <View style={styles.challengeContent}>
              <View style={styles.challengeHeader}>
                <Text style={[styles.challengeTitle, challenge.completed && styles.completedText]}>
                  {challenge.title}
                </Text>
                <Text style={[styles.challengeDifficulty, challenge.completed && styles.completedText]}>
                  {challenge.difficulty}
                </Text>
              </View>
              <Text style={[styles.challengeDescription, challenge.completed && styles.completedText]}>
                {challenge.description}
              </Text>
              <Text style={[styles.challengeReward, challenge.completed && styles.completedText]}>
                Reward: {challenge.reward}
              </Text>
            </View>
            <View style={styles.challengeStatus}>
              {challenge.completed ? (
                <MaterialCommunityIcons name="check-circle" size={24} color={colors.accent} />
              ) : (
                <Ionicons name="play-circle" size={24} color={colors.accent} />
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

// Challenges 2 - Real Supabase Data with Reward Claiming
function Challenges2View() {
  const navigation = useNavigation<NavigationProp>();
  const { challenges, isLoading, refreshChallenges, claimReward: claimChallengeReward } = useChallenges();
  const { completedLessons } = useUser();
  const { balance: totalXP } = useXPSystem();
  const engagement = useEngagement();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [claiming, setClaiming] = useState(false);

  // Group challenges by frequency
  const dailyChallenges = challenges.filter(c => c.frequency === 'daily');
  const weeklyChallenges = challenges.filter(c => c.frequency === 'weekly');
  const monthlyChallenges = challenges.filter(c => c.frequency === 'monthly');

  // Calculate progress for each unlock method
  const getMethodProgress = (type: string, required: number) => {
    let current = 0;
    switch (type) {
      case 'streak':
        current = engagement.currentStreak;
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

  // Handle method press - navigate to appropriate screen
  const handleMethodPress = (method: any) => {
    // TODO: Navigate to lessons, challenges, etc. based on method type
    log.info('Challenges2View', 'Method pressed', { type: method.type });
  };

  // Handle recipe unlock
  const handleRecipeUnlock = (recipeId: string) => {
    engagement.unlockRecipe(recipeId);
    Alert.alert(
      'Recipe Unlocked!',
      `You've unlocked a new cocktail recipe!`,
      [
        {
          text: 'View Recipe',
          style: 'default',
          onPress: () => navigation.navigate('CocktailDetail', { cocktailId: recipeId }),
        },
        {
          text: 'Later',
          style: 'cancel',
        },
      ]
    );
  };

  // Get unlockable recipes (not yet unlocked, at least one method complete)
  const unlockableRecipes = EARNABLE_RECIPES.filter(recipe => {
    if (engagement.isRecipeUnlocked(recipe.recipeId)) return false;
    return recipe.methods.some(method => getMethodProgress(method.type, method.required) >= 100);
  });

  // Get in-progress recipes (not yet unlocked, some progress made)
  const inProgressRecipes = EARNABLE_RECIPES.filter(recipe => {
    if (engagement.isRecipeUnlocked(recipe.recipeId)) return false;
    const maxProgress = Math.max(...recipe.methods.map(m => getMethodProgress(m.type, m.required)));
    return maxProgress > 0 && maxProgress < 100;
  }).sort((a, b) => {
    const aProgress = Math.max(...a.methods.map(m => getMethodProgress(m.type, m.required)));
    const bProgress = Math.max(...b.methods.map(m => getMethodProgress(m.type, m.required)));
    return bProgress - aProgress; // Highest progress first
  });

  const handleClaimReward = async () => {
    if (!selectedChallenge) return;

    setClaiming(true);
    try {
      const reward = await claimChallengeReward(selectedChallenge.id);

      if (reward) {
        log.info('Challenges2View', 'Reward claimed successfully', { challengeId: selectedChallenge.id });
        Alert.alert(
          'Reward Claimed!',
          `You received ${reward.xp} XP${reward.keys ? ` and ${reward.keys} keys` : ''}!`,
          [{ text: 'Awesome!', onPress: () => setSelectedChallenge(null) }]
        );
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
          <Text style={[styles.challenge2Title, isCompleted && styles.challenge2Completed]}>
            {challenge.title}
          </Text>
          <Text style={[styles.challenge2Description, isCompleted && styles.challenge2Completed]}>
            {challenge.description}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min(progressPercent, 100)}%`, backgroundColor: challenge.color }]} />
            </View>
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
            {challenge.keysReward && challenge.keysReward > 0 && (
              <View style={styles.rewardBadge}>
                <MaterialCommunityIcons name="key" size={16} color={colors.gold} />
                <Text style={styles.rewardText}>{challenge.keysReward} Keys</Text>
              </View>
            )}
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
        {/* Recipe Unlocks Section */}
        {(unlockableRecipes.length > 0 || inProgressRecipes.length > 0) && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>🍸 Recipe Unlocks</Text>
                <Text style={styles.sectionSubtitle}>
                  Earn new cocktails through engagement
                </Text>
              </View>
              <View style={styles.frequencyBadge}>
                <Ionicons name="restaurant" size={18} color={colors.gold} />
              </View>
            </View>

            {/* Unlockable Recipes (Ready to claim!) */}
            {unlockableRecipes.map(recipe => {
              const currentProgress: { [key: string]: number } = {};
              recipe.methods.forEach(method => {
                currentProgress[method.type] = getMethodProgress(method.type, method.required);
              });

              return (
                <RecipeUnlockCard
                  key={recipe.recipeId}
                  recipe={recipe}
                  currentProgress={currentProgress}
                  onMethodPress={handleMethodPress}
                  onUnlock={() => handleRecipeUnlock(recipe.recipeId)}
                />
              );
            })}

            {/* In-Progress Recipes (Show top 3) */}
            {inProgressRecipes.slice(0, 3).map(recipe => {
              const currentProgress: { [key: string]: number } = {};
              recipe.methods.forEach(method => {
                currentProgress[method.type] = getMethodProgress(method.type, method.required);
              });

              return (
                <RecipeUnlockCard
                  key={recipe.recipeId}
                  recipe={recipe}
                  currentProgress={currentProgress}
                  onMethodPress={handleMethodPress}
                />
              );
            })}
          </View>
        )}

        {/* Daily section */}
        {dailyChallenges.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle}>Daily Challenges</Text>
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
                <Text style={styles.sectionTitle}>Weekly Challenges</Text>
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
                <Text style={styles.sectionTitle}>Monthly Challenges</Text>
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
            <MaterialCommunityIcons name="trophy-outline" size={64} color={colors.text.secondary} />
            <Text style={styles.sectionTitle}>No Active Challenges</Text>
            <Text style={styles.sectionSubtitle}>Check back soon for new challenges!</Text>
          </View>
        )}
      </ScrollView>

      {/* Reward Claim Modal */}
      <RewardClaimModal
        visible={!!selectedChallenge}
        reward={selectedChallenge ? {
          xp: selectedChallenge.xpReward,
          keys: selectedChallenge.keysReward,
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
  const { lives, xp, level, streak, completedLessons, checkLifeRefresh } = useUser();
  const { balance: xpBalance } = useXPSystem();
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [moduleLessons, setModuleLessons] = useState<any[]>([]);
  const [xpBalanceModalVisible, setXpBalanceModalVisible] = useState(false);

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
    setSelectedModule(module);
    setModuleLessons(lessons);
  };

  const handleBackToModules = () => {
    setSelectedModule(null);
    setModuleLessons([]);
  };

  const handleHeartsPress = () => {
    // Navigate to vault store hearts section
    log.nav('LessonsScreen', 'VaultStore', { tab: 'hearts' });
    navigation.navigate('VaultStore', { tab: 'hearts' });
  };

  const handleProfilePress = () => {
    // Navigate to profile tab
    log.nav('LessonsScreen', 'Profile', {});
    navigation.navigate('Profile');
  };


  const handleLessonPress = (lesson: any) => {
    log.nav('LessonsScreen', 'LessonEngine', { lessonId: lesson.id, title: lesson.title });
    navigation.navigate('LessonEngine', {
      lessonId: lesson.id,
      isFirstLesson: false
    });
  };

  const renderModule = (module: any, index: number) => (
    <Pressable
      key={module.id}
      style={[styles.moduleCard, module.locked && styles.moduleCardLocked]}
      disabled={module.locked}
      onPress={() => handleModulePress(module)}
    >
      <View style={styles.moduleHeader}>
        <View style={styles.moduleIndex}>
          <Text style={styles.moduleIndexText}>{module.chapterIndex}</Text>
        </View>
        <View style={styles.moduleInfo}>
          <Text style={[styles.moduleTitle, module.locked && styles.lockedText]}>
            {module.title}
          </Text>
          <Text style={[styles.moduleTime, module.locked && styles.lockedText]}>
            {module.estimatedMinutes} min • {module.tags.join(', ')}
          </Text>
        </View>
        <View style={styles.moduleActions}>
          {module.locked && (
            <Ionicons name="lock-closed" size={20} color={colors.subtext} />
          )}
          {module.completed && (
            <MaterialCommunityIcons name="check-circle" size={20} color={colors.accent} />
          )}
          {!module.locked && !module.completed && (
            <Ionicons name="chevron-forward" size={20} color={colors.subtext} />
          )}
        </View>
      </View>
    </Pressable>
  );

  const renderLesson = (lesson: any, index: number) => {
    const isCompleted = completedLessons.includes(lesson.id);
    // First lesson is always unlocked, subsequent lessons unlock when previous is completed
    const isLocked = index > 0 && !completedLessons.includes(moduleLessons[index - 1]?.id);
    const outOfLives = lives <= 0;

    return (
      <Pressable
        key={lesson.id}
        style={[
          styles.lessonCard,
          isLocked && styles.lessonCardLocked,
          outOfLives && styles.lessonCardOutOfLives
        ]}
        onPress={() => {
          if (isLocked) return;
          handleLessonPress(lesson);
        }}
        disabled={isLocked}
      >
        <View style={styles.lessonContent}>
          <View style={styles.lessonHeader}>
            <Text style={[
              styles.lessonTitle,
              isLocked && styles.lockedText,
              outOfLives && styles.outOfLivesText
            ]}>
              {lesson.title}
            </Text>
            <Text style={[
              styles.lessonTime,
              isLocked && styles.lockedText,
              outOfLives && styles.outOfLivesText
            ]}>
              {lesson.estimatedMinutes} min
            </Text>
          </View>
          <View style={styles.lessonTypes}>
            {lesson.types.slice(0, 3).map((type: string, i: number) => (
              <View key={i} style={[styles.typeTag, outOfLives && styles.typeTagDisabled]}>
                <Text style={[styles.typeText, outOfLives && styles.typeTextDisabled]}>{type}</Text>
              </View>
            ))}
          </View>

          {/* Show unlock requirement for locked lessons */}
          {isLocked && index > 0 && (
            <Text style={styles.unlockRequirement}>
              Complete "{moduleLessons[index - 1]?.title}" to unlock
            </Text>
          )}

          {/* Show out of lives message */}
          {outOfLives && !isLocked && (
            <Text style={styles.outOfLivesMessage}>
              Out of lives! Tap hearts to get more
            </Text>
          )}
        </View>
        <View style={styles.lessonStatus}>
          {isCompleted && (
            <MaterialCommunityIcons name="check-circle" size={24} color={colors.accent} />
          )}
          {isLocked && (
            <Ionicons name="lock-closed" size={20} color={colors.subtext} />
          )}
          {outOfLives && !isLocked && (
            <MaterialCommunityIcons name="heart-broken" size={24} color="#FF6B6B" />
          )}
          {!isCompleted && !isLocked && !outOfLives && (
            <Ionicons name="play-circle" size={24} color={colors.accent} />
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.statsRow}>
            {/* XP Balance - Interactive */}
            <Pressable
              style={styles.statItem}
              onPress={() => setXpBalanceModalVisible(true)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`XP Balance: ${xpBalance}`}
            >
              <Text style={styles.statValue}>{xpBalance}</Text>
              <Text style={styles.statLabel}>XP</Text>
            </Pressable>

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>

            <Pressable style={styles.heartsContainer} onPress={handleHeartsPress}>
              <MaterialCommunityIcons name="heart" size={20} color="#FF6B6B" />
              <Text style={styles.heartsText}>{lives}</Text>
            </Pressable>

            <Pressable style={styles.profileContainer} onPress={handleProfilePress}>
              <Ionicons name="person-circle" size={28} color={colors.accent} />
            </Pressable>
          </View>

        </View>
      </View>

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

      {/* XP Balance Modal */}
      <XPBalanceModal
        visible={xpBalanceModalVisible}
        onClose={() => setXpBalanceModalVisible(false)}
      />
    </SafeAreaView>
  );
}

export default function LessonsScreen() {
  const layout = useWindowDimensions();
  const { lives, xp, level, streak } = useUser();
  const navigation = useNavigation<NavigationProp>();

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'lessons', title: 'Lessons' },
    { key: 'challenges', title: 'Challenges' },
    { key: 'challenges2', title: 'Challenge 2' },
  ]);

  const handleHeartsPress = () => {
    log.nav('LessonsScreen', 'VaultStore', { tab: 'hearts' });
    navigation.navigate('VaultStore', { tab: 'hearts' });
  };

  const handleProfilePress = () => {
    log.nav('LessonsScreen', 'Profile', {});
    navigation.navigate('Profile');
  };

  const renderScene = SceneMap({
    lessons: LessonsView,
    challenges: ChallengesView,
    challenges2: Challenges2View,
  });

  const renderTabBar = (props: any) => (
    <TabBar
      {...props}
      indicatorStyle={{ backgroundColor: colors.accent }}
      style={{ backgroundColor: colors.bg }}
      labelStyle={{ color: colors.text, fontWeight: '600' }}
      activeColor={colors.accent}
      inactiveColor={colors.subtext}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Shared Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
        </View>
      </View>

      {/* Tab View */}
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={renderTabBar}
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
  header: {
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(2),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: colors.bg,
  },

  headerContent: {
    alignItems: 'center',
    gap: spacing(2),
  },

  levelContainer: {
    alignItems: 'center',
  },

  levelText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },

  statItem: {
    alignItems: 'center',
    minWidth: 50,
  },

  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(0.25),
  },

  statLabel: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  heartsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.lg,
    gap: spacing(0.75),
  },

  heartsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  profileContainer: {
    backgroundColor: 'rgba(139, 103, 67, 0.15)',
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderRadius: radii.lg,
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
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing(0.75),
    letterSpacing: 0.4,
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
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
    letterSpacing: 0.2,
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
    color: '#FF6B6B',
    opacity: 0.7,
  },

  outOfLivesMessage: {
    fontSize: 11,
    color: '#FF6B6B',
    fontStyle: 'italic',
    marginTop: spacing(0.5),
    opacity: 0.8,
  },

  typeTagDisabled: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    opacity: 0.6,
  },

  typeTextDisabled: {
    color: '#FF6B6B',
    opacity: 0.7,
  },

  // Challenge styles
  challengeCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing(2.5),
    marginBottom: spacing(2),
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
    marginBottom: spacing(1),
  },

  challengeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },

  challengeDifficulty: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    backgroundColor: 'rgba(139, 103, 67, 0.15)',
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
    borderRadius: radii.sm,
    marginLeft: spacing(1),
  },

  challengeDescription: {
    fontSize: 14,
    color: colors.subtext,
    marginBottom: spacing(1),
    lineHeight: 20,
  },

  challengeReward: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },

  challengeStatus: {
    marginLeft: spacing(2),
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
    borderRadius: 20,
    backgroundColor: 'rgba(139, 103, 67, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  challenge2Card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
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
    borderRadius: radii.md,
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
});