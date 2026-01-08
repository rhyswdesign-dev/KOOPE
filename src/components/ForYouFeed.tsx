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
import {
  BehavioralLearning
} from '../services/behavioralLearning';
import {
  getRemainingPrompts,
  generateCocktailSuggestions,
} from '../services/aiPromptService';
import { log } from '../lib/logger';

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
  const { profile } = usePersonalization();
  const [personalizedMoods, setPersonalizedMoods] = useState(MOOD_CATEGORIES);
  const [engagementScore, setEngagementScore] = useState(0);

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

  // User profile data with safe defaults
  const userProfile = useMemo(() => {
    if (!profile) {
      return {
        favoriteSpirit: 'tequila',
        skillLevel: 'beginner',
        flavorProfiles: ['citrus', 'sweet'],
        spiritPreferences: ['tequila'],
      };
    }

    return {
      favoriteSpirit: profile.favoriteSpirits?.[0] || 'whiskey',
      skillLevel: profile.skillLevel || 'beginner',
      flavorProfiles: profile.flavorPreferences?.slice(0, 2) || ['citrus', 'sweet'],
      spiritPreferences: profile.favoriteSpirits || ['whiskey'],
    };
  }, [profile]);

  useEffect(() => {
    if (profile) {
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
  }, [profile, userProfile]);

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
        {index === 0 && (
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
              {userProfile.favoriteSpirit} enthusiast
            </Text>
          </View>
          <View style={styles.engagementBadge}>
            <Text style={styles.engagementText}>{Math.round(engagementScore)}%</Text>
            <Text style={styles.engagementLabel}>Engaged</Text>
          </View>
        </View>

        {/* Personalization Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>🧠 Your Preferences</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Favorite Spirit</Text>
              <Text style={styles.statValue}>
                {userProfile.favoriteSpirit.charAt(0).toUpperCase() + userProfile.favoriteSpirit.slice(1)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Skill Level</Text>
              <Text style={styles.statValue}>
                {userProfile.skillLevel.charAt(0).toUpperCase() + userProfile.skillLevel.slice(1)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Flavor Match</Text>
              <Text style={styles.statValue}>
                {userProfile.flavorProfiles.map(f => f.charAt(0).toUpperCase() + f.slice(1)).join(', ')}
              </Text>
            </View>
          </View>
          <Text style={styles.statsNote}>
            💡 These update as you interact with recipes
          </Text>
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
                  AI-powered suggestions • {remainingPrompts} {remainingPrompts === 1 ? 'prompt' : 'prompts'} left
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
          <Text style={styles.sectionSubtitle}>
            Ordered based on your {userProfile.favoriteSpirit} preference
          </Text>
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
  statsNote: {
    fontSize: 12,
    color: colors.subtext,
    fontStyle: 'italic',
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
  },
  aiPromptEmoji: {
    fontSize: 32,
    marginRight: spacing(2),
  },
  aiPromptTextContainer: {
    flex: 1,
  },
  aiPromptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.bg,
    marginBottom: spacing(0.5),
  },
  aiPromptSubtitle: {
    fontSize: 13,
    color: colors.bg + 'CC',
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
});
