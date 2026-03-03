/**
 * FOR YOU FEED COMPONENT
 * Personalized cocktail discovery feed for the Recipes screen
 * Features: Greeting, engagement badge, preferences card, AI prompt, Your Moods, AI Recommendations
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { usePersonalization } from '../store/usePersonalization';
import { ALL_COCKTAILS } from '../data/cocktails';
import RecipeCard from './RecipeCard';
import { createRecipeCardProps } from '../utils/recipeActions';
import { FlatList } from 'react-native';
import { getCocktailImage } from '../../assets/images/cocktails';
import {
  BehavioralLearning
} from '../services/behavioralLearning';
import { log } from '../lib/logger';
import { getTrendingCocktails, getCurrentSeason, getSeasonDisplayName, getSeasonEmoji } from '../services/seasonalTrendingService';
import { useUserTier } from '../store/useUserTier';
import InPageTabBar from './ui/InPageTabBar';

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
  const { tier } = useUserTier();
  const [engagementScore, setEngagementScore] = useState(0);
  const [selectedRecommendTab, setSelectedRecommendTab] = useState<'matched' | 'beginner' | 'challenge' | 'trending'>('matched');

  // Check if user has completed taste profile (must be declared before useMemo that depends on it)
  const hasProfile = profile && profile.favoriteSpirits && profile.favoriteSpirits.length > 0;

  // Get current season info for trending tab
  const currentSeason = getCurrentSeason();
  const seasonName = getSeasonDisplayName(currentSeason);
  const seasonEmoji = getSeasonEmoji(currentSeason);

  // Get recommended cocktails by category - ALL TABS USE PERSONALIZED RECOMMENDATIONS
  const recommendedCocktails = useMemo(() => {
    log.debug('ForYouFeed', 'Building recommendations with tier', { tier });

    const featured = getFeaturedCocktails();
    const hasPersonalizedContent = featured && featured.length > 0;
    // FREE tier: limit trending to 2 cocktails (to make room for feature previews)
    // PLUS/PRO tier: show 8 trending cocktails
    const trendingLimit = tier === 'FREE' ? 2 : 8;
    const trending = getTrendingCocktails(ALL_COCKTAILS, trendingLimit);

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
      // FREE tier: limit to 2 cocktails per category (to make room for feature previews)
      // PLUS/PRO tier: show 8 cocktails per category
      const limit = tier === 'FREE' ? 2 : 8;

      // Use pre-computed featured cocktails for "Matched" tab when available
      // This is the same list shown during onboarding, ensuring consistency
      if (hasPersonalizedContent) {
        matched = featured.slice(0, limit);

        log.debug('ForYouFeed', 'Using getFeaturedCocktails for matched tab', {
          matchedCount: matched.length,
          matchedNames: matched.slice(0, 5).map((c: any) => c.name),
        });
      } else {
        // Fallback to scoreCocktail if featured list not yet computed
        const scoredCocktails = actualCocktails.map(cocktail => ({
          cocktail,
          score: scoreCocktail(cocktail)
        }))
        .sort((a, b) => b.score - a.score);

        log.debug('ForYouFeed', 'Fallback: Top scored cocktails', {
          top5: scoredCocktails.slice(0, 5).map(item => ({
            name: item.cocktail.name,
            score: item.score,
            spirit: item.cocktail.base,
            difficulty: item.cocktail.difficulty
          }))
        });

        matched = scoredCocktails.slice(0, limit).map(item => item.cocktail);
      }

      // Beginner & Challenge tabs always use scoreCocktail for difficulty filtering
      const scoredForTabs = actualCocktails.map(cocktail => ({
        cocktail,
        score: scoreCocktail(cocktail)
      }))
      .sort((a, b) => b.score - a.score);

      beginner = scoredForTabs.filter(item => item.cocktail.difficulty === 'Easy').slice(0, limit).map(item => item.cocktail);
      challenge = scoredForTabs.filter(item => item.cocktail.difficulty === 'Hard' || item.cocktail.difficulty === 'Medium').slice(0, limit).map(item => item.cocktail);

      log.debug('ForYouFeed', 'Recommendation counts', {
        matchedCount: matched.length,
        beginnerCount: beginner.length,
        challengeCount: challenge.length,
      });
    } else {
      // No profile - show random selection of actual cocktails
      // FREE tier: limit to 2 cocktails per category (to make room for feature previews)
      // PLUS/PRO tier: show 8 cocktails per category
      const limit = tier === 'FREE' ? 2 : 8;
      const shuffled = [...actualCocktails].sort(() => Math.random() - 0.5);
      matched = shuffled.slice(0, limit);
      beginner = shuffled.filter(c => c.difficulty === 'Easy').slice(0, limit);
      challenge = shuffled.filter(c => c.difficulty === 'Hard' || c.difficulty === 'Medium').slice(0, limit);

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
  }, [getFeaturedCocktails, scoreCocktail, profile, hasProfile, tier]);

  // Get current time for greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 22) return 'Good evening';
    return 'Good night';
  }, []);

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
      const mockProfile = {
        id: 'current-user',
        favoriteSpirit: userProfile.favoriteSpirit,
        spiritPreferences: userProfile.spiritPreferences,
        flavorProfiles: userProfile.flavorProfiles,
        skillLevel: userProfile.skillLevel,
      };

      const score = BehavioralLearning.calculateEngagementScore(mockProfile as any);
      setEngagementScore(score);
    }
  }, [profile, userProfile, hasProfile]);

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
          <View style={styles.tabBar}>
            <InPageTabBar
              scrollable
              items={[
                { key: 'matched', label: hasProfile ? '⭐ Matched for You' : '⭐ Popular' },
                { key: 'beginner', label: '🌱 Beginner Friendly' },
                { key: 'challenge', label: '🌶️ Flavor Challenges' },
                { key: 'trending', label: `${seasonEmoji} Trending ${seasonName}` },
              ]}
              activeKey={selectedRecommendTab}
              onChange={(key) =>
                setSelectedRecommendTab(key as 'matched' | 'beginner' | 'challenge' | 'trending')
              }
            />
          </View>

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
      </ScrollView>
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
  tabBar: {
    marginHorizontal: spacing(3),
    marginBottom: spacing(2),
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
