// @ts-nocheck
/**
 * FOR YOU FEED COMPONENT
 * Personalized cocktail discovery feed for the Recipes screen
 * Features: Greeting, engagement badge, preferences card, AI prompt, Your Moods, AI Recommendations
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Alert, View, Text, StyleSheet, TouchableOpacity, FlatList, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, serif } from '../theme/tokens';
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';
import { usePersonalization, type OccasionProfile } from '../store/usePersonalization';
import { ALL_COCKTAILS } from '../data/cocktails';
import RecipeCard from './RecipeCard';
import { getCocktailImage } from '../../assets/images/cocktails';
import { log } from '../lib/logger';
import {
  getTrendingCocktails,
  getCurrentSeason,
  getSeasonDisplayName,
} from '../services/seasonalTrendingService';
import { useUserTier } from '../store/useUserTier';
import InPageTabBar from './ui/InPageTabBar';
import { withHaptic } from '../lib/haptics';
import { useAuth } from '../contexts/AuthContext';
import { loadUserProfile, saveRecipeToProfile } from '../services/userProfileService';
import {
  generateRadarChart,
  initializeTasteGraph,
  hydrateTasteGraph,
} from '../services/tasteGraphService';
import {
  getPredictiveRecommendations,
  detectTimeOfDay,
  detectSeason,
} from '../services/predictiveEngine';
import { InventoryService } from '../services/inventoryService';
import { toBottle } from '../types/database';
import { RecipesRepository } from '../repos/supabase';
import { getWeeklyDropsForProfile } from '../config/weeklyForYouDrops';
import { getWeeklyForYouDropRecipe } from '../data/weeklyForYouDropRecipes';
import { useSavedItems } from '../hooks/useSavedItems';

const FLAVOR_ORDER = ['Citrus', 'Herbal', 'Bitter', 'Sweet', 'Smoky', 'Floral', 'Spiced'];
const RADAR_SIZE = 220;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_MAX_RADIUS = 76;

function polarPoint(index: number, total: number, radius: number) {
  const angle = -Math.PI / 2 + (index / total) * Math.PI * 2;
  return {
    x: RADAR_CENTER + Math.cos(angle) * radius,
    y: RADAR_CENTER + Math.sin(angle) * radius,
  };
}

function formatLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildTasteSummary(radar: any) {
  const flavors = [...(radar?.flavorPoints || [])].sort((a, b) => b.value - a.value);
  const spirits = [...(radar?.spiritPoints || [])].sort((a, b) => b.value - a.value);

  const topFlavor = flavors[0]?.label || 'balanced';
  const secondFlavor = flavors[1]?.label || 'rounded';
  const topSpirit = spirits[0]?.label || 'mixed';
  const secondSpirit = spirits[1]?.label || 'spirits';

  return {
    headline: `${topFlavor} and ${secondFlavor} are leading your palate right now.`,
    support: `${topSpirit} and ${secondSpirit} are the strongest spirit signals shaping your For You feed.`,
    flavorHighlights: flavors
      .slice(0, 3)
      .map((item) => ({ label: item.label, value: Math.round(item.value * 100) })),
  };
}

function isZeroProofPreference(profile: any) {
  return profile?.preferredABV === 'zero-proof';
}

function TasteRadar({ radar }: { radar: any }) {
  const points = FLAVOR_ORDER.map(
    (label) =>
      radar?.flavorPoints?.find((item: any) => item.label === label) || { label, value: 0 },
  );
  const polygonPoints = points
    .map((point, index) => {
      const coords = polarPoint(index, points.length, RADAR_MAX_RADIUS * point.value);
      return `${coords.x},${coords.y}`;
    })
    .join(' ');

  return (
    <View style={styles.radarWrap}>
      <Svg width={RADAR_SIZE} height={RADAR_SIZE}>
        <G>
          {[0.25, 0.5, 0.75, 1].map((scale) => (
            <Polygon
              key={`grid-${scale}`}
              points={points
                .map((_, index) => {
                  const coords = polarPoint(index, points.length, RADAR_MAX_RADIUS * scale);
                  return `${coords.x},${coords.y}`;
                })
                .join(' ')}
              fill="none"
              stroke="rgba(216, 203, 185, 0.12)"
              strokeWidth={1}
            />
          ))}

          {points.map((point, index) => {
            const end = polarPoint(index, points.length, RADAR_MAX_RADIUS);
            const labelPoint = polarPoint(index, points.length, RADAR_MAX_RADIUS + 22);
            return (
              <G key={point.label}>
                <Line
                  x1={RADAR_CENTER}
                  y1={RADAR_CENTER}
                  x2={end.x}
                  y2={end.y}
                  stroke="rgba(216, 203, 185, 0.15)"
                  strokeWidth={1}
                />
                <SvgText
                  x={labelPoint.x}
                  y={labelPoint.y}
                  fill="rgba(242, 230, 216, 0.78)"
                  fontSize="11"
                  fontWeight="700"
                  textAnchor="middle"
                >
                  {point.label}
                </SvgText>
              </G>
            );
          })}

          <Polygon
            points={polygonPoints}
            fill="rgba(216, 154, 70, 0.24)"
            stroke="#D89A46"
            strokeWidth={2}
          />

          {points.map((point, index) => {
            const coords = polarPoint(index, points.length, RADAR_MAX_RADIUS * point.value);
            return (
              <Circle key={`dot-${point.label}`} cx={coords.x} cy={coords.y} r={4} fill="#F6EBDD" />
            );
          })}

          <Circle cx={RADAR_CENTER} cy={RADAR_CENTER} r={3} fill="rgba(242, 230, 216, 0.7)" />
        </G>
      </Svg>
    </View>
  );
}

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
  const {
    profile,
    getFeaturedCocktails,
    scoreCocktail,
    occasionMode,
    setOccasionMode,
    savedOccasionProfiles,
    saveOccasionProfile,
    loadOccasionProfile,
    deleteOccasionProfile,
  } = usePersonalization();
  const { tier } = useUserTier();
  const { user } = useAuth();
  const { toggleSavedCocktail, isCocktailSaved } = useSavedItems();
  const [selectedRecommendTab, setSelectedRecommendTab] = useState<
    'matched' | 'beginner' | 'challenge' | 'trending'
  >('matched');
  const [tasteIdentity, setTasteIdentity] = useState<{
    occasionMode: string;
    confidence: number;
    engagement: number;
    radar: any;
  } | null>(null);
  const [predictiveMatches, setPredictiveMatches] = useState<any[]>([]);
  const [showProfileList, setShowProfileList] = useState(false);
  const tabTransitionAnim = useRef(new Animated.Value(1)).current;

  // Check if user has completed taste profile (must be declared before useMemo that depends on it)
  const hasProfile = profile && profile.favoriteSpirits && profile.favoriteSpirits.length > 0;
  const isFree = tier === 'FREE';
  const isPlus = tier === 'PLUS';
  const isPro = tier === 'PRO';

  // Get current season info for trending tab
  const currentSeason = getCurrentSeason();
  const seasonName = getSeasonDisplayName(currentSeason);

  // Get recommended cocktails by category - ALL TABS USE PERSONALIZED RECOMMENDATIONS
  const recommendedCocktails = useMemo(() => {
    log.debug('ForYouFeed', 'Building recommendations with tier', { tier });

    const featured = getFeaturedCocktails();
    const hasPersonalizedContent = featured && featured.length > 0;
    // Filter out syrups and ingredient-only entries from all recommendation tabs.
    const actualCocktails = ALL_COCKTAILS.filter((cocktail) => {
      const category = String(cocktail.category || '').toLowerCase();
      const name = String(cocktail.name || '').toLowerCase();
      return (
        !category.includes('syrup') && !category.includes('ingredient') && !name.includes('syrup')
      );
    });
    // FREE tier: limit trending to 2 cocktails (to make room for feature previews)
    // PLUS/PRO tier: show 8 trending cocktails
    const trendingLimit = tier === 'FREE' ? 2 : 8;
    const trending = getTrendingCocktails(actualCocktails, trendingLimit);

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
        const scoredCocktails = actualCocktails
          .map((cocktail) => ({
            cocktail,
            score: scoreCocktail(cocktail),
          }))
          .sort((a, b) => b.score - a.score);

        log.debug('ForYouFeed', 'Fallback: Top scored cocktails', {
          top5: scoredCocktails.slice(0, 5).map((item) => ({
            name: item.cocktail.name,
            score: item.score,
            spirit: item.cocktail.base,
            difficulty: item.cocktail.difficulty,
          })),
        });

        matched = scoredCocktails.slice(0, limit).map((item) => item.cocktail);
      }

      // Beginner & Challenge tabs always use scoreCocktail for difficulty filtering
      const scoredForTabs = actualCocktails
        .map((cocktail) => ({
          cocktail,
          score: scoreCocktail(cocktail),
        }))
        .sort((a, b) => b.score - a.score);

      beginner = scoredForTabs
        .filter((item) => item.cocktail.difficulty === 'Easy')
        .slice(0, limit)
        .map((item) => item.cocktail);
      challenge = scoredForTabs
        .filter(
          (item) => item.cocktail.difficulty === 'Hard' || item.cocktail.difficulty === 'Medium',
        )
        .slice(0, limit)
        .map((item) => item.cocktail);

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
      beginner = shuffled.filter((c) => c.difficulty === 'Easy').slice(0, limit);
      challenge = shuffled
        .filter((c) => c.difficulty === 'Hard' || c.difficulty === 'Medium')
        .slice(0, limit);

      log.debug('ForYouFeed', 'Using random cocktails (no profile)', {
        matchedCount: matched.length,
        sampleCocktails: matched.slice(0, 3).map((c) => c.name),
      });
    }

    log.debug('ForYouFeed', 'Recommended cocktails breakdown', {
      matchedCount: matched.length,
      beginnerCount: beginner.length,
      challengeCount: challenge.length,
      trendingCount: trending.length,
    });

    // PRO: swap matched tab to predictive engine results when available
    if (isPro && predictiveMatches.length > 0) {
      matched = predictiveMatches;
    }

    // Apply occasion mode filtering for PLUS/PRO users
    if (tier !== 'FREE' && occasionMode !== 'casual') {
      if (occasionMode === 'hosting') {
        // Hosting: prefer crowd-pleaser, batch-friendly, classic, easy/medium
        const hostingTags = new Set([
          'batch',
          'crowd-pleaser',
          'party',
          'classic',
          'simple',
          'refreshing',
        ]);
        const hostingFirst = matched.filter((c: any) => {
          const tags = Array.isArray(c.tags) ? c.tags.map((t: string) => t.toLowerCase()) : [];
          const diff = (c.difficulty || '').toLowerCase();
          return tags.some((t: string) => hostingTags.has(t)) || diff === 'easy';
        });
        if (hostingFirst.length >= 3) matched = hostingFirst;
      } else if (occasionMode === 'adventurous') {
        // Adventurous: prefer Hard/Medium, unusual spirit combos, high complexity
        const adventurousFirst = matched.filter((c: any) => {
          const diff = (c.difficulty || '').toLowerCase();
          const tags = Array.isArray(c.tags) ? c.tags.map((t: string) => t.toLowerCase()) : [];
          return (
            diff === 'hard' ||
            diff === 'medium' ||
            tags.includes('technique') ||
            tags.includes('advanced') ||
            tags.includes('rare')
          );
        });
        if (adventurousFirst.length >= 3) matched = adventurousFirst;
      }
    }

    return {
      matched, // Top personalized matches OR random popular cocktails
      beginner, // Easy difficulty
      challenge, // Medium/Hard difficulty
      trending, // Seasonal trending cocktails
    };
  }, [
    getFeaturedCocktails,
    scoreCocktail,
    profile,
    hasProfile,
    tier,
    isPro,
    predictiveMatches,
    occasionMode,
  ]);

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
    let mounted = true;

    (async () => {
      try {
        if (!mounted) return;

        if (user?.id) {
          const dbProfile = await loadUserProfile(user.id).catch(() => null);
          if (dbProfile?.tasteProfile) {
            // Hydrate the persisted graph — initializeTasteGraph() would re-stamp
            // every timestamp as "now" and zero the interaction counts, which is
            // what made decay and confidence permanent no-ops.
            const tasteGraph = hydrateTasteGraph(dbProfile.tasteProfile)!;
            const radar = generateRadarChart(tasteGraph);
            if (!mounted) return;
            setTasteIdentity({
              occasionMode: dbProfile?.moodPreferences?.forYouOccasionMode || 'casual',
              confidence: Math.round(radar.dataConfidence * 100),
              engagement: radar.engagementScore,
              radar,
            });

            // PRO only: run predictive engine to power the matched tab
            if (tier === 'PRO') {
              try {
                const [userInventory, recipes] = await Promise.all([
                  InventoryService.getUserInventory(user.id),
                  RecipesRepository.getInitialRecipes(150),
                ]);
                if (!mounted) return;

                const inventory = (userInventory || []).map((item: any) =>
                  toBottle(item, { subcategory: item.subcategory || undefined }),
                );

                const enhancedProfile = {
                  id: user.id,
                  createdAt: new Date(),
                  lastActiveAt: new Date(),
                  experienceLevel: 'regularly',
                  techniqueConfidence: 'somewhat',
                  skillLevel: dbProfile.skillLevel || 'intermediate',
                  makingFrequency: 'weekly',
                  outingFrequency: 'monthly',
                  savedRecipes: dbProfile.savedRecipes || [],
                  favoriteRecipes: dbProfile.favoriteRecipes || [],
                  dislikedRecipes: dbProfile.dislikedRecipes || [],
                  interactionHistory: {
                    savedRecipes: dbProfile.savedRecipes || [],
                  },
                };

                const context = {
                  timeOfDay: detectTimeOfDay(),
                  season: detectSeason(),
                  inventory,
                };

                const predictions = getPredictiveRecommendations(
                  recipes as any,
                  enhancedProfile as any,
                  tasteGraph,
                  context,
                  8,
                );
                if (mounted) setPredictiveMatches(predictions);
              } catch {
                // Predictive engine failure is non-fatal; feed falls back to standard personalization
              }
            }
            return;
          }
        }

        if (hasProfile) {
          const radar = generateRadarChart(
            initializeTasteGraph({
              flavorWeights: {
                citrus: (profile?.flavorScores?.citrus || 35) / 100,
                herbal: (profile?.flavorScores?.herbal || 35) / 100,
                bitter: (profile?.flavorScores?.bitter || 35) / 100,
                sweet: (profile?.flavorScores?.sweet || 35) / 100,
                smoky: (profile?.flavorScores?.smoky || 35) / 100,
                floral: (profile?.flavorScores?.floral || 35) / 100,
                spiced: (profile?.flavorScores?.spiced || 35) / 100,
              },
              spiritWeights: {
                tequila: (profile?.spiritScores?.tequila || 25) / 100,
                whiskey: (profile?.spiritScores?.whiskey || 25) / 100,
                rum: (profile?.spiritScores?.rum || 25) / 100,
                gin: (profile?.spiritScores?.gin || 25) / 100,
                vodka: (profile?.spiritScores?.vodka || 25) / 100,
                brandy: (profile?.spiritScores?.brandy || 25) / 100,
                liqueurs: (profile?.spiritScores?.liqueurs || 25) / 100,
                'gin-alternative': 0,
                'rum-alternative': 0,
                none: 0,
              },
              preferredABV: { min: 0, max: 40 },
              preferredComplexity: (profile?.complexityScore || 55) / 100,
            }),
          );
          setTasteIdentity({
            occasionMode: 'casual',
            confidence: Math.round(radar.dataConfidence * 100),
            engagement: radar.engagementScore,
            radar,
          });
          return;
        }

        setTasteIdentity(null);
      } catch {
        if (mounted) setTasteIdentity(null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.id, hasProfile, profile]);

  const proSummary = useMemo(
    () => (tasteIdentity?.radar ? buildTasteSummary(tasteIdentity.radar) : null),
    [tasteIdentity],
  );
  const weeklyDrop = recommendedCocktails.matched[0] || null;
  const weeklyDropProfileTags = useMemo(() => {
    if (!hasProfile || !profile) return [];
    return [
      ...(profile.favoriteSpirits || []),
      ...(profile.flavorPreferences || []),
      ...(isZeroProofPreference(profile) ? ['zero-proof'] : []),
      ...(tasteIdentity?.occasionMode ? [tasteIdentity.occasionMode] : []),
    ].filter(Boolean);
  }, [hasProfile, profile, tasteIdentity?.occasionMode]);
  const weeklyDrops = useMemo(() => {
    if (!isPro || !hasProfile) return [];
    return getWeeklyDropsForProfile(weeklyDropProfileTags, new Date(), 'PRO')
      .map((drop) => {
        const recipe = getWeeklyForYouDropRecipe(drop.recipeId);
        return recipe ? { drop, recipe } : null;
      })
      .filter(Boolean);
  }, [isPro, hasProfile, weeklyDropProfileTags]);
  const preferenceSummary = useMemo(() => {
    if (!userProfile) return null;
    const spirits = userProfile.spiritPreferences
      .slice(0, 2)
      .map((s) => formatLabel(s))
      .join(' + ');
    const flavors = userProfile.flavorProfiles
      .slice(0, 3)
      .map((f) => formatLabel(f))
      .join(', ');

    return {
      eyebrow: isPlus ? 'Personalized for plus' : 'Taste profile',
      title: isPlus ? 'Your For You profile is active.' : 'Your preferences are shaping the feed.',
      body: `Recommendations are leaning into ${spirits || 'your saved spirits'} with ${flavors || 'your strongest flavor signals'} in the lead.`,
    };
  }, [userProfile, isPlus]);

  useEffect(() => {
    tabTransitionAnim.setValue(0);
    Animated.timing(tabTransitionAnim, {
      toValue: 1,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [selectedRecommendTab]);

  const handleClaimWeeklyDrop = async (recipe: any) => {
    const result = toggleSavedCocktail({
      id: recipe.id,
      name: recipe.name,
      subtitle: recipe.subtitle || recipe.description || '',
      image: recipe.image,
    });

    if (result === 'success' && user?.id) {
      try {
        await saveRecipeToProfile(user.id, recipe.id);
      } catch {
        // Local collection save is the primary UX path here.
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with user info */}
      <View style={styles.header}>
        <View>
          <View style={styles.inlineHeading}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Ionicons name="hand-left-outline" size={22} color={colors.text} />
          </View>
          <Text style={styles.subtitle}>
            {hasProfile && userProfile
              ? `${userProfile.favoriteSpirit} enthusiast`
              : 'Cocktail explorer'}
          </Text>
        </View>
        <View
          style={[
            styles.tierPill,
            tier === 'PRO' && styles.tierPillPro,
            tier === 'PLUS' && styles.tierPillPlus,
          ]}
        >
          <Ionicons
            name={tier === 'PRO' ? 'diamond' : tier === 'PLUS' ? 'star' : 'person-outline'}
            size={12}
            color={tier === 'PRO' ? colors.accent : tier === 'PLUS' ? colors.gold : colors.subtext}
          />
          <Text
            style={[
              styles.tierPillText,
              tier === 'PRO' && styles.tierPillTextPro,
              tier === 'PLUS' && styles.tierPillTextPlus,
            ]}
          >
            {tier}
          </Text>
        </View>
      </View>

      {/* Occasion Mode Toggle — PLUS/PRO only */}
      {tier !== 'FREE' && (
        <View>
          <View style={styles.occasionToggleRow}>
            {(['casual', 'hosting', 'adventurous'] as const).map((mode) => {
              const isActive = occasionMode === mode;
              const labels = { casual: 'Casual', hosting: 'Hosting', adventurous: 'Adventurous' };
              const icons = {
                casual: 'wine-outline',
                hosting: 'people-outline',
                adventurous: 'flask-outline',
              };
              return (
                <TouchableOpacity
                  key={mode}
                  style={[styles.occasionChip, isActive && styles.occasionChipActive]}
                  activeOpacity={0.75}
                  onPress={withHaptic(() => setOccasionMode(mode), 'selection')}
                >
                  <Ionicons
                    name={icons[mode] as any}
                    size={13}
                    color={isActive ? colors.gold : colors.subtext}
                  />
                  <Text
                    style={[styles.occasionChipText, isActive && styles.occasionChipTextActive]}
                  >
                    {labels[mode]}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.occasionSaveBtn}
              activeOpacity={0.7}
              onPress={() => {
                Alert.prompt(
                  'Save Profile',
                  `Save "${occasionMode}" mode as a named profile?`,
                  (name) => {
                    if (name?.trim()) saveOccasionProfile(name.trim());
                  },
                  'plain-text',
                  '',
                  'default',
                );
              }}
            >
              <Ionicons name="bookmark-outline" size={15} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          {/* Saved profiles row */}
          {savedOccasionProfiles.length > 0 && (
            <View style={styles.savedProfilesRow}>
              <Text style={styles.savedProfilesLabel}>Saved:</Text>
              {savedOccasionProfiles.map((p: OccasionProfile) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.savedProfileChip,
                    occasionMode === p.mode && styles.savedProfileChipActive,
                  ]}
                  activeOpacity={0.75}
                  onPress={withHaptic(() => loadOccasionProfile(p.id), 'selection')}
                  onLongPress={() =>
                    Alert.alert('Remove Profile', `Remove "${p.name}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: () => deleteOccasionProfile(p.id),
                      },
                    ])
                  }
                >
                  <Text style={styles.savedProfileChipText}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Onboarding State - No Profile */}
      {!hasProfile && onRefineProfile && (
        <View style={styles.onboardingCard}>
          <Ionicons name="compass-outline" size={26} color={colors.accent} />
          <Text style={styles.onboardingTitle}>Create Your Taste Profile</Text>
          <Text style={styles.onboardingDescription}>
            Answer 3 quick questions to get personalized cocktail recommendations tailored to your
            preferences
          </Text>
          <TouchableOpacity
            style={styles.onboardingButton}
            onPress={withHaptic(onRefineProfile, 'selection')}
            activeOpacity={0.7}
          >
            <Text style={styles.onboardingButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {hasProfile && userProfile && !isPro && preferenceSummary && (
        <View style={styles.statsCard}>
          <Text style={styles.statsEyebrow}>{preferenceSummary.eyebrow}</Text>
          <Text style={styles.statsTitle}>{preferenceSummary.title}</Text>
          <Text style={styles.statsNarrative}>{preferenceSummary.body}</Text>

          <View style={styles.preferenceChipRow}>
            {userProfile.spiritPreferences.slice(0, 2).map((item) => (
              <View key={`spirit-${item}`} style={styles.preferenceChip}>
                <Text style={styles.preferenceChipText}>{formatLabel(item)}</Text>
              </View>
            ))}
            {userProfile.flavorProfiles.slice(0, 2).map((item) => (
              <View key={`flavor-${item}`} style={styles.preferenceChipAlt}>
                <Text style={styles.preferenceChipText}>{formatLabel(item)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.inlineHeading}>
            <Ionicons name="sparkles-outline" size={14} color={colors.subtext} />
            <Text style={styles.statsNote}>
              Learns from what you save, open, make, and keep stocked.
            </Text>
          </View>

          {isPlus && weeklyDrop && (
            <View style={styles.plusDropCard}>
              <Text style={styles.plusDropEyebrow}>For You right now</Text>
              <Text style={styles.plusDropTitle}>{weeklyDrop.name}</Text>
              <Text style={styles.plusDropBody} numberOfLines={2}>
                {weeklyDrop.subtitle ||
                  weeklyDrop.description ||
                  'A strong match based on your recent taste signals.'}
              </Text>
            </View>
          )}

          {onRefineProfile && (
            <TouchableOpacity
              style={styles.refineButton}
              onPress={withHaptic(onRefineProfile, 'selection')}
              activeOpacity={0.7}
            >
              <Ionicons name="options-outline" size={18} color={colors.accent} />
              <Text style={styles.refineButtonText}>
                {isPlus ? 'Refine Preferences' : 'Update Taste Profile'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {hasProfile && isPro && tasteIdentity && proSummary && (
        <View style={styles.proIdentityCard}>
          <View style={styles.inlineHeading}>
            <Ionicons name="pulse-outline" size={18} color={colors.accent} />
            <Text style={styles.proIdentityTitle}>Taste Graph</Text>
          </View>
          <Text style={styles.proIdentityEyebrow}>Live preference map</Text>

          <View style={styles.proIdentityTopRow}>
            <TasteRadar radar={tasteIdentity.radar} />

            <View style={styles.proIdentityNarrativeColumn}>
              <Text style={styles.proIdentityHeadline}>{proSummary.headline}</Text>
              <Text style={styles.proIdentityBody}>{proSummary.support}</Text>

              <View style={styles.proFlavorChipGroup}>
                {proSummary.flavorHighlights.map((item) => (
                  <View key={item.label} style={styles.proFlavorChip}>
                    <Text style={styles.proFlavorChipLabel}>{item.label}</Text>
                    <Text style={styles.proFlavorChipValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.proMetricsRow}>
            <View style={styles.proMetricCard}>
              <Text style={styles.proMetricLabel}>Mode</Text>
              <Text style={styles.proMetricValue}>{formatLabel(tasteIdentity.occasionMode)}</Text>
            </View>
            <View style={styles.proMetricCard}>
              <Text style={styles.proMetricLabel}>Confidence</Text>
              <Text style={styles.proMetricValue}>{tasteIdentity.confidence}%</Text>
            </View>
            <View style={styles.proMetricCard}>
              <Text style={styles.proMetricLabel}>Signals</Text>
              <Text style={styles.proMetricValue}>{tasteIdentity.engagement}</Text>
            </View>
          </View>

          <Text style={styles.proIdentityMicrocopy}>
            Your recommendations are being shaped by the strongest flavor axes above. Confidence
            grows as you save, view, make, and tune more drinks.
          </Text>

          {onRefineProfile && (
            <TouchableOpacity
              style={styles.proIdentityButton}
              onPress={withHaptic(onRefineProfile, 'selection')}
              activeOpacity={0.7}
            >
              <Text style={styles.proIdentityButtonText}>Adjust Taste Graph</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.bg} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {isPro && weeklyDrops.length > 0 && (
        <View style={styles.weeklyDropsSection}>
          <View style={styles.inlineHeading}>
            <Ionicons name="gift-outline" size={18} color={colors.accent} />
            <Text style={styles.weeklyDropsTitle}>This Week&apos;s For You Drops</Text>
          </View>
          <Text style={styles.weeklyDropsSubtitle}>
            Two editorial drops each week, ranked against your current taste signals.
          </Text>

          {weeklyDrops.slice(0, 2).map(({ drop, recipe }: any) => (
            <View key={drop.id} style={styles.weeklyDropCard}>
              <View style={styles.weeklyDropHeader}>
                <View style={styles.weeklyDropPill}>
                  <Text style={styles.weeklyDropPillText}>{drop.eyebrow}</Text>
                </View>
                <Text style={styles.weeklyDropSlot}>{formatLabel(drop.slot)}</Text>
              </View>

              <Text style={styles.weeklyDropName}>{drop.title}</Text>
              <Text style={styles.weeklyDropRecipe}>{recipe.name}</Text>
              <Text style={styles.weeklyDropReason}>{drop.reason}</Text>

              <View style={styles.weeklyDropTags}>
                {drop.profileTags.slice(0, 4).map((tag: string) => (
                  <View key={`${drop.id}-${tag}`} style={styles.weeklyDropTag}>
                    <Text style={styles.weeklyDropTagText}>{formatLabel(tag)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.weeklyDropActions}>
                <TouchableOpacity
                  style={styles.weeklyDropOpenButton}
                  activeOpacity={0.85}
                  onPress={withHaptic(() => onCocktailPress(recipe))}
                >
                  <Text style={styles.weeklyDropOpenText}>Open Drop</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.weeklyDropClaimButton,
                    isCocktailSaved(recipe.id) && styles.weeklyDropClaimedButton,
                  ]}
                  activeOpacity={0.85}
                  onPress={withHaptic(() => handleClaimWeeklyDrop(recipe), 'medium')}
                >
                  <Ionicons
                    name={isCocktailSaved(recipe.id) ? 'checkmark-circle' : 'download-outline'}
                    size={16}
                    color={isCocktailSaved(recipe.id) ? colors.success : colors.bg}
                  />
                  <Text
                    style={[
                      styles.weeklyDropClaimText,
                      isCocktailSaved(recipe.id) && styles.weeklyDropClaimedText,
                    ]}
                  >
                    {isCocktailSaved(recipe.id) ? 'Saved To My Collection' : 'Claim Drop'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Recommended Cocktails Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {hasProfile ? 'Recommended Cocktails' : 'Explore Cocktails'}
        </Text>
        {!hasProfile && <Text style={styles.sectionSubtitle}>Popular cocktails to discover</Text>}

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <InPageTabBar
            scrollable
            items={[
              {
                key: 'matched',
                label: hasProfile ? 'Matched for You' : 'Popular',
                icon: 'star-outline',
              },
              { key: 'beginner', label: 'Beginner Friendly', icon: 'leaf-outline' },
              { key: 'challenge', label: 'Flavor Challenges', icon: 'flame-outline' },
              { key: 'trending', label: `Trending ${seasonName}`, icon: 'trending-up-outline' },
            ]}
            activeKey={selectedRecommendTab}
            onChange={(key) =>
              setSelectedRecommendTab(key as 'matched' | 'beginner' | 'challenge' | 'trending')
            }
          />
        </View>

        {/* Horizontal Cocktail Cards */}
        <Animated.View
          style={{
            opacity: tabTransitionAnim,
            transform: [
              {
                translateX: tabTransitionAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          }}
        >
          <FlatList
            horizontal
            nestedScrollEnabled
            data={recommendedCocktails[selectedRecommendTab]}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cocktailList}
            renderItem={({ item }) => {
              const showPredictiveReason =
                isPro && selectedRecommendTab === 'matched' && !!item.predictionReason;
              return (
                <View style={styles.cocktailCardWrapper}>
                  <RecipeCard
                    recipe={{
                      id: item.id,
                      name: item.name,
                      description: showPredictiveReason
                        ? item.predictionReason
                        : item.subtitle || item.description,
                      image: getCocktailImage(item.id, item.image),
                      difficulty: item.difficulty || 'Medium',
                      time: item.time || '5 min',
                    }}
                    onPress={withHaptic(() => onCocktailPress(item))}
                    onSave={onSaveCocktail}
                    onAddToCart={onAddToCart}
                    isSaved={savedRecipeIds.has(item.id)}
                  />
                </View>
              );
            }}
          />
        </Animated.View>
      </View>
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
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    fontFamily: serif,
    letterSpacing: -0.3,
  },
  inlineHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
  },
  occasionToggleRow: {
    flexDirection: 'row',
    gap: spacing(1),
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(1.5),
  },
  occasionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  occasionChipActive: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(201,161,90,0.12)',
  },
  occasionChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.subtext,
  },
  occasionChipTextActive: {
    color: colors.gold,
    fontWeight: '600',
  },
  occasionSaveBtn: {
    padding: spacing(0.75),
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  savedProfilesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(1.5),
    flexWrap: 'wrap',
  },
  savedProfilesLabel: {
    fontSize: 11,
    color: colors.subtext,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  savedProfileChip: {
    paddingHorizontal: spacing(1.25),
    paddingVertical: spacing(0.5),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  savedProfileChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '15',
  },
  savedProfileChipText: {
    fontSize: 12,
    color: colors.subtext,
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 16,
    color: colors.subtext,
    marginTop: spacing(0.5),
  },
  tierPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1.25),
    borderRadius: radii.pill,
    backgroundColor: colors.line,
    borderWidth: 1,
    borderColor: colors.line,
  },
  tierPillPlus: {
    backgroundColor: colors.gold + '20',
    borderColor: colors.gold + '60',
  },
  tierPillPro: {
    backgroundColor: colors.accent + '20',
    borderColor: colors.accent + '60',
  },
  tierPillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.subtext,
  },
  tierPillTextPlus: {
    color: colors.gold,
  },
  tierPillTextPro: {
    color: colors.accent,
  },
  statsCard: {
    margin: spacing(3),
    marginTop: 0,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    borderWidth: 1,
    borderColor: colors.line,
    gap: spacing(1.2),
  },
  statsEyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    fontFamily: serif,
    letterSpacing: -0.2,
  },
  statsNarrative: {
    fontSize: 15,
    color: colors.subtext,
    lineHeight: 22,
  },
  statsHighlight: {
    color: colors.text,
    fontWeight: '700',
  },
  statsNote: {
    fontSize: 12,
    color: colors.subtext,
    fontStyle: 'italic',
  },
  preferenceChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.75),
  },
  preferenceChip: {
    paddingVertical: spacing(0.7),
    paddingHorizontal: spacing(1.15),
    borderRadius: radii.pill,
    backgroundColor: colors.accent + '15',
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  preferenceChipAlt: {
    paddingVertical: spacing(0.7),
    paddingHorizontal: spacing(1.15),
    borderRadius: radii.pill,
    backgroundColor: colors.line,
    borderWidth: 1,
    borderColor: colors.line,
  },
  preferenceChipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  plusDropCard: {
    backgroundColor: 'rgba(216, 154, 70, 0.08)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(216, 154, 70, 0.22)',
    padding: spacing(1.5),
    gap: spacing(0.4),
  },
  plusDropEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.accent,
  },
  plusDropTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    fontFamily: serif,
  },
  plusDropBody: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.subtext,
  },
  refineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    marginTop: spacing(2),
    paddingVertical: spacing(1.5),
    paddingHorizontal: spacing(3),
    backgroundColor: colors.accent + '15',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    alignSelf: 'center',
  },
  refineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  proIdentityCard: {
    marginHorizontal: spacing(3),
    marginTop: 0,
    marginBottom: spacing(3),
    backgroundColor: '#1E1410',
    borderRadius: radii.xl,
    padding: spacing(2.5),
    borderWidth: 1,
    borderColor: 'rgba(216, 154, 70, 0.26)',
    gap: spacing(1.4),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  proIdentityTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    fontFamily: serif,
    letterSpacing: -0.2,
  },
  proIdentityEyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  proIdentityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  radarWrap: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.015)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(242, 230, 216, 0.06)',
  },
  proIdentityNarrativeColumn: {
    flex: 1,
    gap: spacing(1.25),
  },
  proIdentityHeadline: {
    fontSize: 18,
    lineHeight: 24,
    color: colors.text,
    fontWeight: '800',
  },
  proIdentityBody: {
    fontSize: 14,
    color: colors.subtext,
    lineHeight: 20,
  },
  proFlavorChipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.75),
  },
  proFlavorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
    paddingVertical: spacing(0.75),
    paddingHorizontal: spacing(1),
    borderRadius: radii.pill,
    backgroundColor: 'rgba(216, 154, 70, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(216, 154, 70, 0.22)',
  },
  proFlavorChipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  proFlavorChipValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
  },
  proMetricsRow: {
    flexDirection: 'row',
    gap: spacing(1),
  },
  proMetricCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(242, 230, 216, 0.06)',
    padding: spacing(1.2),
  },
  proMetricLabel: {
    color: colors.subtext,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing(0.4),
  },
  proMetricValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  proIdentityMicrocopy: {
    color: colors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
  proIdentityButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(1.5),
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  proIdentityButtonText: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: '800',
  },
  weeklyDropsSection: {
    marginHorizontal: spacing(3),
    marginBottom: spacing(3),
    gap: spacing(1),
  },
  weeklyDropsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    fontFamily: serif,
    letterSpacing: -0.2,
  },
  weeklyDropsSubtitle: {
    color: colors.subtext,
    fontSize: 13,
    lineHeight: 18,
  },
  weeklyDropCard: {
    backgroundColor: '#1B120F',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(216, 154, 70, 0.24)',
    padding: spacing(2),
    gap: spacing(0.8),
  },
  weeklyDropHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weeklyDropPill: {
    paddingVertical: spacing(0.55),
    paddingHorizontal: spacing(1),
    borderRadius: radii.pill,
    backgroundColor: 'rgba(216, 154, 70, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(216, 154, 70, 0.24)',
  },
  weeklyDropPillText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  weeklyDropSlot: {
    color: colors.subtext,
    fontSize: 12,
    fontWeight: '700',
  },
  weeklyDropName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    fontFamily: serif,
  },
  weeklyDropRecipe: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  weeklyDropReason: {
    color: colors.subtext,
    fontSize: 14,
    lineHeight: 20,
  },
  weeklyDropTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(0.6),
  },
  weeklyDropTag: {
    paddingVertical: spacing(0.55),
    paddingHorizontal: spacing(0.9),
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(242, 230, 216, 0.08)',
  },
  weeklyDropTagText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  weeklyDropActions: {
    marginTop: spacing(0.5),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.8),
  },
  weeklyDropOpenButton: {
    paddingVertical: spacing(0.9),
    paddingHorizontal: spacing(1.2),
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(242, 230, 216, 0.12)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  weeklyDropOpenText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  weeklyDropClaimButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.75),
    paddingVertical: spacing(0.9),
    paddingHorizontal: spacing(1.25),
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  weeklyDropClaimedButton: {
    backgroundColor: colors.success + '16',
    borderWidth: 1,
    borderColor: colors.success + '55',
  },
  weeklyDropClaimText: {
    color: colors.bg,
    fontSize: 13,
    fontWeight: '800',
  },
  weeklyDropClaimedText: {
    color: colors.success,
  },
  section: {
    marginBottom: spacing(3),
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    fontFamily: serif,
    letterSpacing: -0.2,
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
