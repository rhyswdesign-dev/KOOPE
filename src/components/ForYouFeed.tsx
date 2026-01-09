/**
 * FOR YOU FEED COMPONENT
 * Personalized cocktail discovery feed matching PersonalizedHomeScreen design
 * Features: Greeting, engagement badge, preferences card, AI prompt, Your Moods, AI Recommendations
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { usePersonalization } from '../store/usePersonalization';
import AIRecommendations from './AIRecommendations';
import AICocktailPromptModal from './AICocktailPromptModal';
import {
  MOOD_CATEGORIES,
  personalizeModeCategoryOrder,
  Mood
} from '../services/moodBasedRecommendations';
import { ALL_COCKTAILS } from '../data/cocktails';
import RecipeCard from './RecipeCard';
import { createRecipeCardProps } from '../utils/recipeActions';
import { FlatList } from 'react-native';
import { getCocktailImage } from '../../assets/images/cocktails';
import {
  BehavioralLearning
} from '../services/behavioralLearning';
import {
  getRemainingPrompts,
  generateCocktailSuggestions,
} from '../services/aiPromptService';
import { log } from '../lib/logger';
import { getTrendingCocktails, getCurrentSeason, getSeasonDisplayName, getSeasonEmoji } from '../services/seasonalTrendingService';

interface ForYouFeedProps {
  onCocktailPress: (cocktail: any) => void;
  onSaveCocktail?: (cocktail: any) => void;
  onAddToCart?: (cocktail: any) => void;
  savedRecipeIds?: Set<string>;
  onRefineProfile?: () => void;
}

export default function ForYouFeed({
  onCocktailPress,
  onSaveCocktail,
  onAddToCart,
  savedRecipeIds = new Set(),
  onRefineProfile,
}: ForYouFeedProps) {
  const { profile, getFeaturedCocktails, scoreCocktail } = usePersonalization();
  const [personalizedMoods, setPersonalizedMoods] = useState(MOOD_CATEGORIES);
  const [engagementScore, setEngagementScore] = useState(0);
  const [selectedRecommendTab, setSelectedRecommendTab] = useState<'matched' | 'beginner' | 'challenge' | 'trending'>('matched');

  // Get current season info for trending tab
  const currentSeason = getCurrentSeason();
  const seasonName = getSeasonDisplayName(currentSeason);
  const seasonEmoji = getSeasonEmoji(currentSeason);

  // Get recommended cocktails by category - ALL TABS USE PERSONALIZED RECOMMENDATIONS
  const recommendedCocktails = useMemo(() => {
    const featured = getFeaturedCocktails();
    const hasPersonalizedContent = featured && featured.length > 0;
    const trending = getTrendingCocktails(ALL_COCKTAILS, 8);

    // Filter out syrups and ingredients - only show actual cocktails
    const actualCocktails = ALL_COCKTAILS.filter(cocktail =>
      cocktail.category !== 'syrup' &&
      cocktail.category !== 'ingredient' &&
      !cocktail.name?.toLowerCase().includes('syrup')
    );

    log.debug('ForYouFeed', 'Building recommended cocktails', {
      featuredCount: featured?.length || 0,
      hasPersonalizedContent,
      hasProfile,
      trendingCount: trending.length,
      actualCocktailsCount: actualCocktails.length,
      userSpirits: profile?.favoriteSpirits,
      userFlavors: profile?.flavorPreferences,
    });

    let matched, beginner, challenge;

    if (hasProfile) {
      // User has profile - use personalized scoring
      const scoredCocktails = actualCocktails.map(cocktail => ({
        cocktail,
        score: scoreCocktail(cocktail)
      }))
      .sort((a, b) => b.score - a.score);

      log.debug('ForYouFeed', 'Top scored cocktails', {
        top5: scoredCocktails.slice(0, 5).map(item => ({
          name: item.cocktail.name,
          score: item.score,
          spirit: item.cocktail.base,
          difficulty: item.cocktail.difficulty
        }))
      });

      matched = scoredCocktails.slice(0, 8).map(item => item.cocktail);
      beginner = scoredCocktails.filter(item => item.cocktail.difficulty === 'Easy').slice(0, 8).map(item => item.cocktail);
      challenge = scoredCocktails.filter(item => item.cocktail.difficulty === 'Hard' || item.cocktail.difficulty === 'Medium').slice(0, 8).map(item => item.cocktail);
    } else {
      // No profile - show random selection of actual cocktails
      const shuffled = [...actualCocktails].sort(() => Math.random() - 0.5);
      matched = shuffled.slice(0, 8);
      beginner = shuffled.filter(c => c.difficulty === 'Easy').slice(0, 8);
      challenge = shuffled.filter(c => c.difficulty === 'Hard' || c.difficulty === 'Medium').slice(0, 8);

      log.debug('ForYouFeed', 'Using random cocktails (no profile)', {
        matchedCount: matched.length,
        sampleCocktails: matched.slice(0, 3).map(c => c.name)
      });
    }

    log.debug('ForYouFeed', 'Recommended cocktails breakdown', {
      matchedCount: matched.length,
      beginnerCount: beginner.length,
      challengeCount: challenge.length,
      trendingCount: trending.length,
    });

    return {
      matched, // Top personalized matches OR random popular cocktails
      beginner, // Easy difficulty
      challenge, // Medium/Hard difficulty
      trending, // Seasonal trending cocktails
    };
  }, [getFeaturedCocktails, scoreCocktail, profile, hasProfile]);

  // AI Prompt Modal state
  const [promptModalVisible, setPromptModalVisible] = useState(false);
  const [remainingPrompts, setRemainingPrompts] = useState(1);
  const isPremium = false; // TODO: Get from user subscription status

  // Get current time for greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 22) return 'Good evening';
    return 'Good night';
  }, []);

  // Check if user has completed taste profile
  const hasProfile = profile && profile.favoriteSpirits && profile.favoriteSpirits.length > 0;

  // User profile data - only use real data, no fake defaults
  const userProfile = useMemo(() => {
    if (!hasProfile) {
      return null;
    }

    const favoriteSpirit = profile.favoriteSpirits?.[0] || 'whiskey';
    log.debug('ForYouFeed', 'User profile updated', {
      favoriteSpirit,
      allSpirits: profile.favoriteSpirits,
      profileTimestamp: profile.lastSurveyUpdate,
    });

    return {
      favoriteSpirit,
      skillLevel: profile.skillLevel || 'beginner',
      flavorProfiles: profile.flavorPreferences?.slice(0, 2) || ['citrus', 'sweet'],
      spiritPreferences: profile.favoriteSpirits || ['whiskey'],
    };
  }, [profile, hasProfile]);

  useEffect(() => {
    if (hasProfile && userProfile) {
      // Personalize mood order based on user profile
      const mockProfile = {
        id: 'current-user',
        favoriteSpirit: userProfile.favoriteSpirit,
        spiritPreferences: userProfile.spiritPreferences,
        flavorProfiles: userProfile.flavorProfiles,
        skillLevel: userProfile.skillLevel,
      };

      const moods = personalizeModeCategoryOrder(mockProfile as any);
      setPersonalizedMoods(moods);

      // Calculate engagement score
      const score = BehavioralLearning.calculateEngagementScore(mockProfile as any);
      setEngagementScore(score);

      // Load remaining prompts
      loadRemainingPrompts();
    }
  }, [profile, userProfile, hasProfile]);

  const loadRemainingPrompts = async () => {
    try {
      const remaining = await getRemainingPrompts('current-user', isPremium);
      setRemainingPrompts(remaining);
    } catch (error) {
      log.error('ForYouFeed', 'Error loading prompts', error);
      setRemainingPrompts(1);
    }
  };

  const handleAIPromptSubmit = async (prompt: string) => {
    try {
      const result = await generateCocktailSuggestions('current-user', prompt, isPremium);

      if (result.success && result.suggestions) {
        setPromptModalVisible(false);
        await loadRemainingPrompts();
        // Show success in a toast or alert
        log.info('ForYouFeed', 'AI suggestions generated', { count: result.suggestions.length, xp: result.xpEarned });
      } else {
        log.error('ForYouFeed', 'Failed to generate suggestions', { error: result.error });
      }
    } catch (error) {
      log.error('ForYouFeed', 'Error generating AI suggestions', error);
    }
  };

  const renderMoodCard = (mood: typeof MOOD_CATEGORIES[0], index: number) => {
    const isTop3 = index < 3;

    return (
      <TouchableOpacity
        key={mood.id}
        style={[styles.moodCard, isTop3 && styles.moodCardHighlight]}
        onPress={() => {
          log.info('ForYouFeed', 'Mood card pressed', { mood: mood.name });
          // TODO: Navigate to mood-filtered recipes
        }}
      >
        <View style={styles.moodHeader}>
          <Text style={styles.moodEmoji}>{mood.emoji}</Text>
          {isTop3 && (
            <View style={styles.topBadge}>
              <Text style={styles.topBadgeText}>TOP {index + 1}</Text>
            </View>
          )}
        </View>
        <Text style={styles.moodName}>{mood.name}</Text>
        <Text style={styles.moodDescription}>{mood.description}</Text>

        {/* Show why this mood was ranked here */}
        {index === 0 && hasProfile && userProfile && (
          <View style={styles.reasonBadge}>
            <Text style={styles.reasonText}>
              ⭐ Perfect for {userProfile.favoriteSpirit} lovers
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {/* Header with user info */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting} 👋</Text>
            <Text style={styles.subtitle}>
              {hasProfile && userProfile ? `${userProfile.favoriteSpirit} enthusiast` : 'Cocktail explorer'}
            </Text>
          </View>
          {hasProfile && (
            <View style={styles.engagementBadge}>
              <Text style={styles.engagementText}>{Math.round(engagementScore)}%</Text>
              <Text style={styles.engagementLabel}>Engaged</Text>
            </View>
          )}
        </View>

        {/* Onboarding State - No Profile */}
        {!hasProfile && onRefineProfile && (
          <View style={styles.onboardingCard}>
            <Text style={styles.onboardingEmoji}>🎯</Text>
            <Text style={styles.onboardingTitle}>Create Your Taste Profile</Text>
            <Text style={styles.onboardingDescription}>
              Answer 3 quick questions to get personalized cocktail recommendations tailored to your preferences
            </Text>
            <TouchableOpacity
              style={styles.onboardingButton}
              onPress={onRefineProfile}
              activeOpacity={0.7}
            >
              <Text style={styles.onboardingButtonText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Personalization Stats - Only show if profile exists */}
        {hasProfile && userProfile && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>🧠 Your Preferences</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Favorite Spirits</Text>
                {userProfile.spiritPreferences.length > 1 ? (
                  <View style={styles.spiritStack}>
                    {userProfile.spiritPreferences.map((spirit, idx) => (
                      <Text key={idx} style={styles.statValue}>
                        {spirit.charAt(0).toUpperCase() + spirit.slice(1)}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.statValue}>
                    {userProfile.favoriteSpirit.charAt(0).toUpperCase() + userProfile.favoriteSpirit.slice(1)}
                  </Text>
                )}
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Skill Level</Text>
                <Text style={styles.statValue}>
                  {userProfile.skillLevel.charAt(0).toUpperCase() + userProfile.skillLevel.slice(1)}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Flavor Match</Text>
                {userProfile.flavorProfiles.length > 1 ? (
                  <View style={styles.flavorStack}>
                    {userProfile.flavorProfiles.map((f, idx) => (
                      <Text key={idx} style={styles.statValue}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.statValue}>
                    {userProfile.flavorProfiles[0]?.charAt(0).toUpperCase() + userProfile.flavorProfiles[0]?.slice(1)}
                  </Text>
                )}
              </View>
            </View>
            <Text style={styles.statsNote}>
              💡 These update as you interact with recipes
            </Text>

            {/* Refine Taste Profile Button */}
            {onRefineProfile && (
              <TouchableOpacity
                style={styles.refineButton}
                onPress={onRefineProfile}
                activeOpacity={0.7}
              >
                <Ionicons name="settings-outline" size={18} color={colors.accent} />
                <Text style={styles.refineButtonText}>Refine Your Taste Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Recommended Cocktails Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {hasProfile ? 'Recommended Cocktails' : 'Explore Cocktails'}
          </Text>
          {!hasProfile && (
            <Text style={styles.sectionSubtitle}>
              Popular cocktails to discover
            </Text>
          )}

          {/* Tab Bar */}
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.tabBar}
            contentContainerStyle={styles.tabBarContent}
          >
            <TouchableOpacity
              style={[
                styles.tab,
                selectedRecommendTab === 'matched' && styles.tabActive,
              ]}
              onPress={() => setSelectedRecommendTab('matched')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabText,
                selectedRecommendTab === 'matched' && styles.tabTextActive,
              ]}>
                {hasProfile ? '⭐ Matched for You' : '⭐ Popular'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedRecommendTab === 'beginner' && styles.tabActive,
              ]}
              onPress={() => setSelectedRecommendTab('beginner')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabText,
                selectedRecommendTab === 'beginner' && styles.tabTextActive,
              ]}>
                🌱 Beginner Friendly
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedRecommendTab === 'challenge' && styles.tabActive,
              ]}
              onPress={() => setSelectedRecommendTab('challenge')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabText,
                selectedRecommendTab === 'challenge' && styles.tabTextActive,
              ]}>
                🌶️ Flavor Challenges
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedRecommendTab === 'trending' && styles.tabActive,
              ]}
              onPress={() => setSelectedRecommendTab('trending')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabText,
                selectedRecommendTab === 'trending' && styles.tabTextActive,
              ]}>
                {seasonEmoji} Trending {seasonName}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Horizontal Cocktail Cards */}
          <FlatList
            horizontal
            nestedScrollEnabled
            data={recommendedCocktails[selectedRecommendTab]}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cocktailList}
            renderItem={({ item }) => (
              <View style={styles.cocktailCardWrapper}>
                <RecipeCard
                  recipe={{
                    id: item.id,
                    name: item.name,
                    description: item.subtitle || item.description,
                    image: getCocktailImage(item.id, item.image),
                    difficulty: item.difficulty || 'Medium',
                    time: item.time || '5 min',
                  }}
                  onPress={() => onCocktailPress(item)}
                  onSave={onSaveCocktail}
                  onAddToCart={onAddToCart}
                  isSaved={savedRecipeIds.has(item.id)}
                />
              </View>
            )}
          />
        </View>

        {/* AI Cocktail Creator CTA */}
        <Pressable
          style={styles.aiPromptCTA}
          onPress={() => setPromptModalVisible(true)}
        >
          <View style={styles.aiPromptContent}>
            <View style={styles.aiPromptLeft}>
              <Text style={styles.aiPromptEmoji}>✨</Text>
              <View style={styles.aiPromptTextContainer}>
                <Text style={styles.aiPromptTitle}>What should I make tonight?</Text>
                <Text style={styles.aiPromptSubtitle}>
                  {remainingPrompts} {remainingPrompts === 1 ? 'prompt' : 'prompts'} remaining
                </Text>
              </View>
            </View>
            <View style={styles.aiPromptBadge}>
              <Text style={styles.aiPromptBadgeText}>+50 XP</Text>
            </View>
          </View>
        </Pressable>

        {/* Mood Categories - Personalized Order */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Moods</Text>
          {hasProfile && userProfile && (
            <Text style={styles.sectionSubtitle}>
              Ordered based on your {userProfile.favoriteSpirit} preference
            </Text>
          )}
          {!hasProfile && (
            <Text style={styles.sectionSubtitle}>
              Discover cocktails by mood and occasion
            </Text>
          )}
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.moodsList}
          >
            {personalizedMoods.map((mood, index) => renderMoodCard(mood, index))}
          </ScrollView>
        </View>

        {/* AI Recommendations - For You */}
        <View style={styles.section}>
          <AIRecommendations
            navigation={null}
          />
        </View>
      </ScrollView>

      {/* AI Prompt Modal */}
      <AICocktailPromptModal
        visible={promptModalVisible}
        onClose={() => setPromptModalVisible(false)}
        onSubmit={handleAIPromptSubmit}
        remainingPrompts={remainingPrompts}
        isPremium={isPremium}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing(3),
    paddingTop: spacing(2),
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.subtext,
    marginTop: spacing(0.5),
  },
  engagementBadge: {
    backgroundColor: colors.gold + '20',
    borderRadius: radii.md,
    padding: spacing(1.5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  engagementText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gold,
  },
  engagementLabel: {
    fontSize: 10,
    color: colors.gold,
    marginTop: spacing(0.25),
  },
  statsCard: {
    margin: spacing(3),
    marginTop: 0,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    borderWidth: 1,
    borderColor: colors.line,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(2),
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing(1.5),
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: colors.subtext,
    marginBottom: spacing(0.5),
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  flavorStack: {
    gap: spacing(0.25),
  },
  spiritStack: {
    gap: spacing(0.25),
  },
  statsNote: {
    fontSize: 12,
    color: colors.subtext,
    fontStyle: 'italic',
  },
  refineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    marginTop: spacing(2),
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(2),
    backgroundColor: colors.accent + '15',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  refineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  aiPromptCTA: {
    margin: spacing(3),
    marginTop: 0,
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    padding: spacing(2.5),
  },
  aiPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiPromptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing(1),
  },
  aiPromptEmoji: {
    fontSize: 28,
    marginRight: spacing(1.5),
  },
  aiPromptTextContainer: {
    flex: 1,
  },
  aiPromptTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.bg,
    marginBottom: spacing(0.25),
    lineHeight: 22,
  },
  aiPromptSubtitle: {
    fontSize: 12,
    color: colors.bg + 'CC',
    lineHeight: 16,
  },
  aiPromptBadge: {
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1.5),
    marginLeft: spacing(2),
  },
  aiPromptBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
  section: {
    marginBottom: spacing(3),
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginHorizontal: spacing(3),
    marginBottom: spacing(1),
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    marginHorizontal: spacing(3),
    marginBottom: spacing(2),
  },
  moodsList: {
    paddingLeft: spacing(3),
    paddingRight: spacing(3),
  },
  moodCard: {
    width: 280,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    marginRight: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  moodCardHighlight: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  moodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing(1.5),
  },
  moodEmoji: {
    fontSize: 40,
  },
  topBadge: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: spacing(0.5),
    paddingHorizontal: spacing(1),
  },
  topBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  moodName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  moodDescription: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
  },
  reasonBadge: {
    marginTop: spacing(1.5),
    backgroundColor: colors.gold + '20',
    borderRadius: radii.sm,
    padding: spacing(1),
    borderWidth: 1,
    borderColor: colors.gold,
  },
  reasonText: {
    fontSize: 12,
    color: colors.gold,
    fontWeight: '600',
  },
  tabBar: {
    marginBottom: spacing(2),
  },
  tabBarContent: {
    paddingHorizontal: spacing(3),
  },
  tab: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderRadius: 20,
    backgroundColor: colors.card,
    marginRight: spacing(1.5),
    borderWidth: 1,
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
    color: colors.white,
  },
  cocktailList: {
    gap: spacing(2),
    paddingLeft: spacing(3),
    paddingRight: spacing(3),
  },
  cocktailCardWrapper: {
    width: 280,
  },
  onboardingCard: {
    margin: spacing(3),
    marginTop: 0,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(3),
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
  },
  onboardingEmoji: {
    fontSize: 48,
    marginBottom: spacing(2),
  },
  onboardingTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
    textAlign: 'center',
  },
  onboardingDescription: {
    fontSize: 15,
    color: colors.subtext,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing(3),
  },
  onboardingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    backgroundColor: colors.accent,
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
    borderRadius: radii.md,
  },
  onboardingButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
