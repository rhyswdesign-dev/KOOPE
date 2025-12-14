/**
 * Personalized Home Screen
 * Shows mood-based organization with real-time learning
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Image,
} from 'react-native';
import { colors, spacing, radii, fonts } from '../theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../types/recipe';
import { EnhancedUserProfile } from '../types/userProfile';
import { log } from '../lib/logger';
import {
  MOOD_CATEGORIES,
  personalizeModeCategoryOrder,
  getRecipesForMood,
  Mood
} from '../services/moodBasedRecommendations';
import {
  trackRecipeView,
  trackRecipeLike,
  BehavioralLearning
} from '../services/behavioralLearning';
import AICocktailPromptModal from '../components/AICocktailPromptModal';
import AIRecommendations from '../components/AIRecommendations';
import {
  getRemainingPrompts,
  generateCocktailSuggestions,
  awardLifeForSavingAISuggestion,
  AICocktailSuggestion
} from '../services/aiPromptService';

// Mock data for demo
const MOCK_RECIPES: Recipe[] = [
  {
    id: '1',
    title: 'Classic Margarita',
    description: 'Refreshing tequila cocktail with lime and orange liqueur',
    createdAt: new Date(),
    updatedAt: new Date(),
    ingredients: [
      { name: 'Tequila', amount: '2 oz' },
      { name: 'Lime juice', amount: '1 oz' },
      { name: 'Triple sec', amount: '0.5 oz' },
    ],
    instructions: ['Shake all ingredients with ice', 'Strain into glass', 'Garnish with lime'],
    glassware: 'rocks',
    category: 'classic',
    difficulty: 'beginner',
    recipeType: 'cocktail',
    baseSpirit: 'tequila',
    spiritsUsed: ['tequila'],
    flavorProfiles: ['citrus', 'sweet'],
    abv: 25,
    complexity: 0.3,
    preparationTime: 5,
    servings: 1,
    tools: ['shaker', 'jigger'],
    tags: ['classic', 'easy', 'popular'],
    isPublic: true,
    imageUrl: 'https://via.placeholder.com/300x200/FFB84D/FFFFFF?text=Margarita',
  },
  {
    id: '2',
    title: 'Old Fashioned',
    description: 'Classic whiskey cocktail with bitters and sugar',
    createdAt: new Date(),
    updatedAt: new Date(),
    ingredients: [
      { name: 'Whiskey', amount: '2 oz' },
      { name: 'Simple syrup', amount: '0.25 oz' },
      { name: 'Angostura bitters', amount: '2 dashes' },
    ],
    instructions: ['Stir ingredients with ice', 'Strain into glass', 'Garnish with orange peel'],
    glassware: 'rocks',
    category: 'classic',
    difficulty: 'intermediate',
    recipeType: 'spirit-forward',
    baseSpirit: 'whiskey',
    spiritsUsed: ['whiskey'],
    flavorProfiles: ['bitter', 'sweet'],
    abv: 35,
    complexity: 0.6,
    preparationTime: 7,
    servings: 1,
    tools: ['barspoon', 'jigger'],
    tags: ['classic', 'spirit-forward'],
    isPublic: true,
    imageUrl: 'https://via.placeholder.com/300x200/D4A574/FFFFFF?text=Old+Fashioned',
  },
  {
    id: '3',
    title: 'Mojito',
    description: 'Refreshing rum cocktail with mint and lime',
    createdAt: new Date(),
    updatedAt: new Date(),
    ingredients: [
      { name: 'White rum', amount: '2 oz' },
      { name: 'Lime juice', amount: '1 oz' },
      { name: 'Mint leaves', amount: '8-10' },
      { name: 'Simple syrup', amount: '0.75 oz' },
      { name: 'Soda water', amount: 'Top' },
    ],
    instructions: ['Muddle mint with syrup', 'Add rum and lime', 'Fill with ice and soda', 'Garnish with mint'],
    glassware: 'highball',
    category: 'classic',
    difficulty: 'beginner',
    recipeType: 'highball',
    baseSpirit: 'rum',
    spiritsUsed: ['rum'],
    flavorProfiles: ['citrus', 'herbal', 'sweet'],
    abv: 12,
    complexity: 0.4,
    preparationTime: 5,
    servings: 1,
    tools: ['muddler', 'jigger'],
    tags: ['refreshing', 'easy', 'summer'],
    isPublic: true,
    imageUrl: 'https://via.placeholder.com/300x200/7FD858/FFFFFF?text=Mojito',
  },
  {
    id: '4',
    title: 'Espresso Martini',
    description: 'Energizing vodka cocktail with coffee',
    createdAt: new Date(),
    updatedAt: new Date(),
    ingredients: [
      { name: 'Vodka', amount: '2 oz' },
      { name: 'Coffee liqueur', amount: '0.5 oz' },
      { name: 'Espresso', amount: '1 oz' },
      { name: 'Simple syrup', amount: '0.25 oz' },
    ],
    instructions: ['Shake all ingredients with ice', 'Double strain into glass', 'Garnish with coffee beans'],
    glassware: 'martini',
    category: 'modern',
    difficulty: 'intermediate',
    recipeType: 'shaken',
    baseSpirit: 'vodka',
    spiritsUsed: ['vodka', 'liqueurs'],
    flavorProfiles: ['bitter', 'sweet'],
    abv: 20,
    complexity: 0.5,
    preparationTime: 8,
    servings: 1,
    tools: ['shaker', 'jigger', 'fine-strainer'],
    tags: ['modern', 'coffee', 'energizing'],
    isPublic: true,
    imageUrl: 'https://via.placeholder.com/300x200/6B4423/FFFFFF?text=Espresso+Martini',
  },
];

// Mock user profile for demo
const MOCK_USER_PROFILE: EnhancedUserProfile = {
  id: 'demo-user',
  email: 'demo@example.com',
  createdAt: new Date(),
  lastActiveAt: new Date(),
  experienceLevel: 'occasionally',
  techniqueConfidence: 'somewhat',
  skillLevel: 'beginner',
  makingFrequency: 'monthly',
  outingFrequency: 'weekly',
  outingPriorities: ['drinks', 'atmosphere'],
  spiritPreferences: ['tequila', 'rum'],
  favoriteSpirit: 'tequila',
  alcoholPreference: 'alcoholic',
  avoidsAlcohol: false,
  flavorProfiles: ['citrus', 'sweet', 'herbal'],
  learningGoals: ['host', 'classics'],
  availableTools: ['shaker', 'jigger'],
  preferredSessionMinutes: 5,
  preferredABVRange: { min: 15, max: 40 },
  track: 'alcoholic',
  level: 1,
  xp: 0,
  streak: 0,
  longestStreak: 0,
  lives: 5,
  badges: [],
  savedRecipes: [],
  createdRecipes: [],
  favoriteRecipes: [],
  dislikedRecipes: [],
  consent: {
    analytics: true,
    personalization: true,
    date: Date.now(),
  },
  tasteProfile: {
    flavorWeights: {
      citrus: 0.8,
      herbal: 0.6,
      bitter: 0.2,
      sweet: 0.7,
      smoky: 0.1,
      floral: 0.3,
      spiced: 0.4,
    },
    spiritWeights: {
      tequila: 0.9,
      whiskey: 0.3,
      rum: 0.6,
      gin: 0.4,
      vodka: 0.2,
      brandy: 0.1,
      liqueurs: 0.3,
      'gin-alternative': 0,
      'rum-alternative': 0,
      none: 0,
    },
    preferredABV: { min: 15, max: 40 },
    preferredComplexity: 0.4,
  },
};

export default function PersonalizedHomeScreen() {
  const [userProfile, setUserProfile] = useState<EnhancedUserProfile>(MOCK_USER_PROFILE);
  const [personalizedMoods, setPersonalizedMoods] = useState(MOOD_CATEGORIES);
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [engagementScore, setEngagementScore] = useState(0);

  // AI Prompt Modal state
  const [promptModalVisible, setPromptModalVisible] = useState(false);
  const [remainingPrompts, setRemainingPrompts] = useState(1);
  const [aiSuggestions, setAiSuggestions] = useState<AICocktailSuggestion[]>([]);
  const isPremium = false; // TODO: Get from user subscription status

  useEffect(() => {
    // Personalize mood order based on user profile
    const moods = personalizeModeCategoryOrder(userProfile);
    setPersonalizedMoods(moods);

    // Calculate engagement score
    const score = BehavioralLearning.calculateEngagementScore(userProfile);
    setEngagementScore(score);

    // Load remaining prompts
    loadRemainingPrompts();
  }, [userProfile]);

  const loadRemainingPrompts = async () => {
    const remaining = await getRemainingPrompts(userProfile.id, isPremium);
    setRemainingPrompts(remaining);
  };

  const handleAIPromptSubmit = async (prompt: string) => {
    const result = await generateCocktailSuggestions(userProfile.id, prompt, isPremium);

    if (result.success && result.suggestions) {
      setAiSuggestions(result.suggestions);
      setPromptModalVisible(false);

      // Refresh remaining prompts
      await loadRemainingPrompts();

      // Show success message
      alert(`✨ Generated ${result.suggestions.length} cocktails!\n\n+${result.xpEarned} XP earned!`);
    } else {
      alert(`❌ ${result.error || 'Failed to generate suggestions'}`);
    }
  };

  const handleRecipePress = async (recipe: Recipe) => {
    // Track view
    await trackRecipeView(userProfile.id, recipe);
    log.info('PersonalizedHomeScreen', 'Tracked recipe view', { title: recipe.title });

    // In real app, navigate to recipe detail
    alert(`Viewing ${recipe.title}\n\n✅ Interaction tracked!\nYou'll see more ${recipe.baseSpirit} recipes now.`);
  };

  const handleRecipeLike = async (recipe: Recipe) => {
    await trackRecipeLike(userProfile.id, recipe);
    log.info('PersonalizedHomeScreen', 'Tracked recipe like', { title: recipe.title });

    // Update engagement score locally for immediate feedback
    const newScore = BehavioralLearning.calculateEngagementScore(userProfile);
    setEngagementScore(newScore);

    alert(`❤️ Liked ${recipe.title}\n\n✨ We're learning your taste!\n+10% boost to similar ${recipe.baseSpirit} recipes.`);
  };

  const renderMoodCard = (mood: typeof MOOD_CATEGORIES[0], index: number) => {
    const isTop3 = index < 3;

    return (
      <TouchableOpacity
        key={mood.id}
        style={[styles.moodCard, isTop3 && styles.moodCardHighlight]}
        onPress={() => setSelectedMood(mood.id)}
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

  const renderRecipeCard = (recipe: Recipe) => {
    return (
      <TouchableOpacity
        key={recipe.id}
        style={styles.recipeCard}
        onPress={() => handleRecipePress(recipe)}
      >
        <Image source={{ uri: recipe.imageUrl }} style={styles.recipeImage} />
        <View style={styles.recipeContent}>
          <Text style={styles.recipeTitle}>{recipe.title}</Text>
          <Text style={styles.recipeDescription} numberOfLines={2}>
            {recipe.description}
          </Text>

          <View style={styles.recipeMetaRow}>
            <View style={styles.recipeMeta}>
              <Ionicons name="time-outline" size={14} color={colors.subtext} />
              <Text style={styles.recipeMetaText}>{recipe.preparationTime} min</Text>
            </View>
            <View style={styles.recipeMeta}>
              <Ionicons name="stats-chart" size={14} color={colors.subtext} />
              <Text style={styles.recipeMetaText}>{recipe.difficulty}</Text>
            </View>
          </View>

          <View style={styles.recipeActions}>
            <TouchableOpacity
              style={styles.likeButton}
              onPress={() => handleRecipeLike(recipe)}
            >
              <Ionicons name="heart-outline" size={20} color={colors.accent} />
            </TouchableOpacity>
            <Text style={styles.likeHint}>Tap ❤️ to help us learn</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header with user info */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good evening 👋</Text>
            <Text style={styles.subtitle}>
              {userProfile.favoriteSpirit ? `${userProfile.favoriteSpirit} enthusiast` : 'Cocktail explorer'}
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
              <Text style={styles.statValue}>{userProfile.favoriteSpirit || 'None'}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Skill Level</Text>
              <Text style={styles.statValue}>{userProfile.skillLevel}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Flavor Match</Text>
              <Text style={styles.statValue}>
                {userProfile.flavorProfiles.slice(0, 2).join(', ')}
              </Text>
            </View>
          </View>
          <Text style={styles.statsNote}>
            💡 These update as you interact with recipes
          </Text>
        </View>

        {/* AI Cocktail Creator CTA */}
        <TouchableOpacity
          style={styles.aiPromptCTA}
          onPress={() => setPromptModalVisible(true)}
        >
          <View style={styles.aiPromptContent}>
            <View style={styles.aiPromptLeft}>
              <Text style={styles.aiPromptEmoji}>✨</Text>
              <View style={styles.aiPromptText}>
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
        </TouchableOpacity>

        {/* Mood Categories - Personalized Order */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Moods</Text>
          <Text style={styles.sectionSubtitle}>
            Ordered based on your {userProfile.favoriteSpirit} preference
          </Text>
          <ScrollView
            horizontal
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

        {/* All Recipes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Explore More</Text>
          {MOCK_RECIPES.filter(
            (r) => r.baseSpirit !== userProfile.favoriteSpirit
          ).map(renderRecipeCard)}
        </View>

        {/* Debug Info */}
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>🔧 How It Works</Text>
          <Text style={styles.debugText}>
            • Tap a recipe to VIEW it (+2% boost to similar){'\n'}
            • Tap ❤️ to LIKE it (+10% boost to similar){'\n'}
            • System learns your taste in real-time{'\n'}
            • Moods reorder based on preferences{'\n'}
            • Engagement score: {Math.round(engagementScore)}%
          </Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing(3),
    paddingTop: spacing(1),
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
    color: colors.gold,
    textTransform: 'capitalize',
  },
  statsNote: {
    fontSize: 12,
    color: colors.subtext,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  section: {
    marginBottom: spacing(4),
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing(3),
    marginBottom: spacing(0.5),
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.subtext,
    paddingHorizontal: spacing(3),
    marginBottom: spacing(2),
  },
  moodsList: {
    paddingHorizontal: spacing(3),
    gap: spacing(2),
  },
  moodCard: {
    width: 180,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(2.5),
    borderWidth: 1,
    borderColor: colors.line,
  },
  moodCardHighlight: {
    borderColor: colors.gold,
    borderWidth: 2,
    backgroundColor: colors.gold + '10',
  },
  moodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing(1),
  },
  moodEmoji: {
    fontSize: 32,
  },
  topBadge: {
    backgroundColor: colors.gold,
    borderRadius: radii.sm,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.5),
  },
  topBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.goldText,
  },
  moodName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  moodDescription: {
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 16,
  },
  reasonBadge: {
    marginTop: spacing(1.5),
    backgroundColor: colors.gold + '20',
    borderRadius: radii.sm,
    padding: spacing(1),
  },
  reasonText: {
    fontSize: 11,
    color: colors.gold,
    fontWeight: '600',
  },
  recipeCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    marginHorizontal: spacing(3),
    marginBottom: spacing(2),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  recipeImage: {
    width: 100,
    height: 100,
  },
  recipeContent: {
    flex: 1,
    padding: spacing(2),
  },
  recipeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(0.5),
  },
  recipeDescription: {
    fontSize: 13,
    color: colors.subtext,
    marginBottom: spacing(1),
  },
  recipeMetaRow: {
    flexDirection: 'row',
    gap: spacing(2),
    marginBottom: spacing(1),
  },
  recipeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  recipeMetaText: {
    fontSize: 12,
    color: colors.subtext,
    textTransform: 'capitalize',
  },
  recipeActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  likeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gold + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeHint: {
    fontSize: 11,
    color: colors.subtext,
    fontStyle: 'italic',
    flex: 1,
    marginLeft: spacing(1),
  },
  debugSection: {
    margin: spacing(3),
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(2),
    borderWidth: 1,
    borderColor: colors.line,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing(1),
  },
  debugText: {
    fontSize: 12,
    color: colors.subtext,
    lineHeight: 18,
  },
  aiPromptCTA: {
    marginHorizontal: spacing(3),
    marginVertical: spacing(2),
    backgroundColor: colors.gold,
    borderRadius: radii.lg,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  aiPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing(2.5),
  },
  aiPromptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    flex: 1,
  },
  aiPromptEmoji: {
    fontSize: 36,
  },
  aiPromptText: {
    flex: 1,
  },
  aiPromptTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.goldText,
    marginBottom: spacing(0.5),
  },
  aiPromptSubtitle: {
    fontSize: 13,
    color: colors.goldText,
    opacity: 0.9,
  },
  aiPromptBadge: {
    backgroundColor: colors.goldText,
    borderRadius: radii.sm,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
  },
  aiPromptBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gold,
  },
});
