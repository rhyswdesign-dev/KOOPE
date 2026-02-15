/**
 * Lessons Screen - Professional bartending curriculum
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, SafeAreaView, useWindowDimensions, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';
import { colors, spacing, radii, serif } from '../theme/tokens';
import { Heading } from '../components/ui';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import curriculumData from '../../curriculum-data.json';
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
import RecipeUnlockCard from '../components/RecipeUnlockCard';
import { EARNABLE_RECIPES } from '../config/recipeUnlocks';
import FeatureTooltipOverlay from '../components/FeatureTooltipOverlay';
import { useFeatureTooltip } from '../hooks/useFeatureTooltip';
import { TOOLTIP_CONFIGS } from '../config/tooltipContent';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Lazy evaluation - only compute when StyleSheet is created (after runtime ready)
const getSerifFont = () => serif;

// Challenges component - Original Design with Supabase Data
function ChallengesView() {
  const navigation = useNavigation<NavigationProp>();
  const { lives, completedLessons } = useUser();
  const { balance: totalXP } = useXPSystem();
  const engagement = useEngagement();
  const { challenges: supabaseChallenges, isLoading, claimReward } = useChallenges();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Group challenges by frequency
  const weeklyChallenges = supabaseChallenges.filter(c => c.frequency === 'weekly');
  const monthlyChallenges = supabaseChallenges.filter(c => c.frequency === 'monthly');

  // Handle claiming a challenge reward
  const handleClaimReward = async (challenge: Challenge) => {
    setClaimingId(challenge.id);
    try {
      const reward = await claimReward(challenge.id);
      if (reward) {
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
        current = engagement.currentStreak;
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

  // Handle recipe unlock
  const handleRecipeUnlock = (recipeId: string, recipeName: string) => {
    engagement.unlockRecipe(recipeId);
    Alert.alert(
      'Recipe Unlocked!',
      `You've unlocked ${recipeName}!`,
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

  // Get unlockable recipes
  const unlockableRecipes = EARNABLE_RECIPES.filter(recipe => {
    if (engagement.isRecipeUnlocked(recipe.recipeId)) return false;
    return recipe.methods.some(method => getMethodProgress(method.type, method.required) >= 100);
  });

  // Get in-progress recipes (top 3)
  const inProgressRecipes = EARNABLE_RECIPES.filter(recipe => {
    if (engagement.isRecipeUnlocked(recipe.recipeId)) return false;
    const maxProgress = Math.max(...recipe.methods.map(m => getMethodProgress(m.type, m.required)));
    return maxProgress > 0 && maxProgress < 100;
  }).sort((a, b) => {
    const aProgress = Math.max(...a.methods.map(m => getMethodProgress(m.type, m.required)));
    const bProgress = Math.max(...b.methods.map(m => getMethodProgress(m.type, m.required)));
    return bProgress - aProgress;
  }).slice(0, 3);

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Recipe Unlocks Section */}
      {(unlockableRecipes.length > 0 || inProgressRecipes.length > 0) && (
        <View style={styles.section}>
          <Heading level={2} style={styles.sectionTitle}>Recipe Unlocks</Heading>
          <Text style={styles.sectionSubtitle}>
            Earn new cocktails through engagement
          </Text>

          {/* Unlockable Recipes */}
          {unlockableRecipes.map(recipe => {
            const bestMethod = recipe.methods.reduce((best, method) => {
              const progress = getMethodProgress(method.type, method.required);
              return progress > best.progress ? { method, progress } : best;
            }, { method: recipe.methods[0], progress: 0 });

            return (
              <Pressable
                key={recipe.recipeId}
                style={[styles.challengeCard, styles.challengeCardCompleted]}
                onPress={() => handleRecipeUnlock(recipe.recipeId, recipe.recipeName)}
              >
                <View style={styles.challengeContent}>
                  <View style={styles.challengeHeader}>
                    <Heading level={3} style={[styles.challengeTitle, styles.completedText]}>
                      {recipe.recipeName}
                    </Heading>
                    <Text style={[styles.challengeDifficulty, styles.completedText]}>
                      Ready!
                    </Text>
                  </View>
                  <Text style={[styles.challengeDescription, styles.completedText]}>
                    {bestMethod.method.description}
                  </Text>
                  <Text style={[styles.challengeReward, styles.completedText]}>
                    Tap to unlock
                  </Text>
                </View>
                <View style={styles.challengeStatus}>
                  <Ionicons name="lock-open" size={24} color={colors.accent} />
                </View>
              </Pressable>
            );
          })}

          {/* In-Progress Recipes */}
          {inProgressRecipes.map(recipe => {
            const bestMethod = recipe.methods.reduce((best, method) => {
              const progress = getMethodProgress(method.type, method.required);
              return progress > best.progress ? { method, progress } : best;
            }, { method: recipe.methods[0], progress: 0 });

            return (
              <Pressable
                key={recipe.recipeId}
                style={styles.challengeCard}
              >
                <View style={styles.challengeContent}>
                  <View style={styles.challengeHeader}>
                    <Heading level={3} style={styles.challengeTitle}>
                      {recipe.recipeName}
                    </Heading>
                    <Text style={styles.challengeDifficulty}>
                      {Math.round(bestMethod.progress)}%
                    </Text>
                  </View>
                  <Text style={styles.challengeDescription}>
                    {bestMethod.method.description}
                  </Text>
                  <Text style={styles.challengeReward}>
                    {recipe.difficulty === 'easy' && '⭐ Easy Unlock'}
                    {recipe.difficulty === 'medium' && '⭐⭐ Medium Unlock'}
                    {recipe.difficulty === 'hard' && '⭐⭐⭐ Hard Unlock'}
                  </Text>
                </View>
                <View style={styles.challengeStatus}>
                  <Ionicons name="lock-closed" size={24} color={colors.subtext} />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

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
          `You received ${reward.xp} XP!`,
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
          <Heading level={3} style={[styles.challenge2Title, isCompleted && styles.challenge2Completed]}>
            {challenge.title}
          </Heading>
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
                <Heading level={2} style={styles.sectionTitle}>🍸 Recipe Unlocks</Heading>
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
            <MaterialCommunityIcons name="trophy-outline" size={64} color={colors.text.secondary} />
            <Heading level={2} style={styles.sectionTitle}>No Active Challenges</Heading>
            <Text style={styles.sectionSubtitle}>Check back soon for new challenges!</Text>
          </View>
        )}
      </ScrollView>

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
  const { balance: xpBalance } = useXPSystem();
  const [modules, setModules] = useState<any[]>([]);
  const [selectedModule, setSelectedModule] = useState<any | null>(null);
  const [moduleLessons, setModuleLessons] = useState<any[]>([]);
  const [xpBalanceModalVisible, setXpBalanceModalVisible] = useState(false);
  const streak = streakService.getCurrentStreak();

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
    // Navigate to vault
    log.nav('LessonsScreen', 'Vault');
    navigation.navigate('Vault');
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
    const isCompleted = completedLessons.includes(lesson.id);
    const isLocked = index > 0 && !completedLessons.includes(moduleLessons[index - 1]?.id);
    const outOfLives = lives <= 0;
    const isNext = !isCompleted && !isLocked;
    const isLast = index === moduleLessons.length - 1;

    // Determine status text and style
    let statusText = 'Locked';
    let subtitleStyle = styles.subtitleLocked;

    if (isCompleted) {
      statusText = 'Completed';
      subtitleStyle = styles.subtitleCompleted;
    } else if (isNext) {
      statusText = outOfLives ? 'Out of Lives' : 'In Progress';
      subtitleStyle = outOfLives ? { color: '#FF6B6B', opacity: 0.8 } : styles.subtitleNext;
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
            (isNext && outOfLives) && { borderColor: '#FF6B6B' }
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
          disabled={isLocked || (isNext && outOfLives)}
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

            <Pressable
              style={styles.vaultIconButton}
              onPress={() => {
                log.nav('LessonsScreen', 'Vault', {});
                navigation.navigate('Vault');
              }}
            >
              <MaterialCommunityIcons name="treasure-chest" size={24} color={colors.gold} />
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
  const { lives } = useUser();
  const navigation = useNavigation<NavigationProp>();
  const { showTooltip, dismissTooltip } = useFeatureTooltip('lessons');

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'lessons', title: 'Lessons' },
    { key: 'challenges', title: 'Challenges' },
  ]);

  const handleHeartsPress = () => {
    log.nav('LessonsScreen', 'Vault');
    navigation.navigate('Vault');
  };

  const renderScene = SceneMap({
    lessons: LessonsView,
    challenges: ChallengesView,
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
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
    fontFamily: getSerifFont(),
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
  vaultIconButton: {
    backgroundColor: 'rgba(212, 175, 55, 0.15)',
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