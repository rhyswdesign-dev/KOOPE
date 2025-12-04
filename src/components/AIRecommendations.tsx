import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fonts } from '../theme/tokens';
import RecipeCard from './RecipeCard';
import { createRecipeCardProps } from '../utils/recipeActions';
import { useAICredits } from '../store/useAICredits';
import { AIRecommendationEngine, UserTasteProfile, SmartRecommendation } from '../services/aiRecommendationEngine';
import { HomeBar, HomeBarService } from '../services/homeBarService';
import { loadUserProfile } from '../services/userProfileService';
import { trackRecommendationView, trackRecommendationSaved } from '../services/recommendationTrackingService';
import RecommendationFeedbackModal from './RecommendationFeedbackModal';
import InsufficientCreditsModal from './InsufficientCreditsModal';

interface AIRecommendationsProps {
  navigation: any;
  toggleSavedCocktail?: (cocktail: any) => void;
  isCocktailSaved?: (id: string) => boolean;
  setSelectedRecipe?: (recipe: any) => void;
  setGroceryListVisible?: (visible: boolean) => void;
  onCreditsNeeded?: () => void;
  style?: any;
}

export default function AIRecommendations({
  navigation,
  toggleSavedCocktail,
  isCocktailSaved,
  setSelectedRecipe,
  setGroceryListVisible,
  onCreditsNeeded,
  style
}: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { canUseAI, consumeCredits, getActionCost, credits } = useAICredits();
  const [homeBar, setHomeBar] = useState<HomeBar | null>(null);
  const [userTasteProfile, setUserTasteProfile] = useState<UserTasteProfile | null>(null);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<SmartRecommendation | null>(null);
  const [currentContext, setCurrentContext] = useState<{ timeOfDay: string; season: string } | null>(null);
  const [insufficientCreditsModalVisible, setInsufficientCreditsModalVisible] = useState(false);

  // Cache settings: recommendations valid for 30 minutes
  const CACHE_DURATION_MS = 30 * 60 * 1000;

  // Load user data on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Load user profile
        const profile = await loadUserProfile('current-user'); // TODO: Get actual user ID

        if (profile) {
          // Convert profile to UserTasteProfile format
          const validFlavors = ['sweet', 'sour', 'bitter', 'herbal', 'fruity', 'spicy', 'smoky', 'citrusy'] as const;
          const tasteProfile: UserTasteProfile = {
            preferredSpirits: profile.spiritPreferences || [],
            flavorProfile: (profile.flavorProfiles || [])
              .filter((f): f is typeof validFlavors[number] => validFlavors.includes(f as any)),
            drinkStrength: profile.preferredABVRange?.max > 30 ? 'strong' :
                          profile.preferredABVRange?.max > 15 ? 'medium' : 'light',
            experience: profile.skillLevel === 'beginner' ? 'beginner' :
                       profile.skillLevel === 'intermediate' ? 'intermediate' : 'expert',
            preferredGlass: [],
            occasion: [],
            timeOfDay: [],
            seasonPreference: [],
            dietaryRestrictions: [],
          };
          setUserTasteProfile(tasteProfile);
        } else {
          // If no profile loaded, create default
          console.log('[AIRecommendations] No profile loaded, using defaults');
          const defaultTasteProfile: UserTasteProfile = {
            preferredSpirits: ['whiskey', 'gin'],
            flavorProfile: ['citrusy', 'sweet'],
            drinkStrength: 'medium',
            experience: 'beginner',
            preferredGlass: [],
            occasion: [],
            timeOfDay: [],
            seasonPreference: [],
            dietaryRestrictions: [],
          };
          setUserTasteProfile(defaultTasteProfile);
        }

        // Load home bar ingredients
        const storedIngredients = await HomeBarService.getStoredIngredients();

        // Create home bar with stored ingredients
        const defaultBar: HomeBar = {
          id: 'default',
          userId: 'current-user', // TODO: Get actual user ID
          name: 'My Bar',
          ingredients: storedIngredients,
          createdAt: new Date(),
          updatedAt: new Date(),
          isDefault: true,
        };
        setHomeBar(defaultBar);
      } catch (error: any) {
        // Handle offline Firebase errors and profile loading errors gracefully
        if (error?.message?.includes('offline') ||
            error?.message?.includes('Failed to get document') ||
            error?.message?.includes('Failed to load user profile') ||
            error?.code === 'unavailable') {
          console.log('[AIRecommendations] Error loading data - using default profile');

          // Set default taste profile
          const defaultTasteProfile: UserTasteProfile = {
            preferredSpirits: ['whiskey', 'gin'],
            flavorProfile: ['citrusy', 'sweet'],
            drinkStrength: 'medium',
            experience: 'beginner',
            preferredGlass: [],
            occasion: [],
            timeOfDay: [],
            seasonPreference: [],
            dietaryRestrictions: [],
          };
          setUserTasteProfile(defaultTasteProfile);

          // Set default home bar
          const defaultBar: HomeBar = {
            id: 'default',
            userId: 'current-user',
            name: 'My Bar',
            ingredients: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            isDefault: true,
          };
          setHomeBar(defaultBar);
        } else {
          console.error('Error loading user data:', error);
        }
      }
    };

    loadUserData();
  }, []);

  // Generate AI-powered recommendations based on user context
  const generateRecommendations = useCallback(async (forceRefresh: boolean = false) => {
    // Check if user data is loaded
    if (!homeBar || !userTasteProfile) {
      console.log('User data not loaded yet');
      return;
    }

    // Check cache validity (skip if force refresh)
    if (!forceRefresh && lastRefresh && recommendations.length > 0) {
      const cacheAge = Date.now() - lastRefresh.getTime();
      if (cacheAge < CACHE_DURATION_MS) {
        console.log(`Using cached recommendations (${Math.round(cacheAge / 1000 / 60)} min old)`);
        return;
      }
    }

    // Check if user has enough credits
    if (!canUseAI('recommendation')) {
      setInsufficientCreditsModalVisible(true);
      return;
    }

    setIsLoading(true);

    try {
      console.log('🤖 Generating AI recommendations...');

      // Consume credits for the action
      const creditConsumed = consumeCredits({
        type: 'recommendation',
        userQuery: 'AI recommendations generation'
      });

      if (!creditConsumed) {
        throw new Error('Unable to consume credits for this action');
      }

      // Get current time context for recommendations
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      const month = now.getMonth();

      // Determine context
      const context = {
        timeOfDay: hour >= 5 && hour < 12 ? 'morning' :
                  hour >= 12 && hour < 17 ? 'afternoon' :
                  hour >= 17 && hour < 22 ? 'evening' : 'night',
        weather: 'mild' as const,
        season: ['winter', 'spring', 'summer', 'fall'][Math.floor(month / 3)] as 'winter' | 'spring' | 'summer' | 'fall',
        mood: 'relaxed' as const,
      };

      // Store context for tracking
      setCurrentContext({
        timeOfDay: context.timeOfDay,
        season: context.season,
      });

      // Generate recommendations using AI engine
      const aiRecommendations = await AIRecommendationEngine.generateRecommendations(
        homeBar,
        userTasteProfile,
        context
      );

      setRecommendations(aiRecommendations);
      setLastRefresh(new Date());
      console.log(`✅ Generated ${aiRecommendations.length} AI recommendations`);

    } catch (error: any) {
      console.error('AI recommendations error:', error);
      Alert.alert(
        'Recommendations Unavailable',
        'Unable to generate personalized recommendations right now. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [canUseAI, consumeCredits, getActionCost, credits, onCreditsNeeded, homeBar, userTasteProfile, lastRefresh, recommendations.length, CACHE_DURATION_MS]);

  // Generate recommendations on component mount
  useEffect(() => {
    generateRecommendations();
  }, [generateRecommendations]);

  // Convert SmartRecommendation to the format expected by RecipeCard
  const convertToRecipeCardFormat = (recommendation: SmartRecommendation, index: number) => {
    const recipe = recommendation.cocktail;
    return {
      id: `ai-rec-${index}-${Date.now()}`,
      name: recipe.name,
      title: recipe.name,
      subtitle: recipe.description,
      description: recipe.description,
      image: recipe.imageUrl || 'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=400&auto=format&fit=crop',
      difficulty: recipe.difficulty === 'beginner' ? 'Easy' :
                 recipe.difficulty === 'intermediate' ? 'Medium' : 'Hard',
      time: `${recipe.prepTime} min`,
      ingredients: recipe.ingredients.map(ing => ({
        name: ing,
        amount: '',
        notes: ''
      })),
      instructions: recipe.instructions,
      garnish: recipe.garnish,
      glassware: recipe.glass,
      matchScore: recommendation.matchScore,
      canMakeNow: recommendation.canMakeNow,
      missingIngredients: recommendation.missingIngredients,
      aiReasoning: recommendation.reasoning,
    };
  };

  const handleRefresh = useCallback(() => {
    generateRecommendations(true); // Force refresh, bypass cache
  }, [generateRecommendations]);

  // Track when a recipe card is pressed (viewed)
  const handleRecipePress = useCallback((recommendation: SmartRecommendation, recipe: any) => {
    // Track the view
    if (currentContext) {
      trackRecommendationView(
        'current-user', // TODO: Get actual user ID
        {
          id: recipe.id,
          cocktailName: recommendation.cocktail.name,
          matchScore: recommendation.matchScore,
          canMakeNow: recommendation.canMakeNow,
          missingIngredients: recommendation.missingIngredients,
        },
        currentContext
      );
    }
  }, [currentContext]);

  // Track when a recipe is saved
  const handleRecipeSave = useCallback((recommendation: SmartRecommendation, recipe: any) => {
    // Track the save
    if (currentContext) {
      trackRecommendationSaved(
        'current-user', // TODO: Get actual user ID
        {
          id: recipe.id,
          cocktailName: recommendation.cocktail.name,
          matchScore: recommendation.matchScore,
          canMakeNow: recommendation.canMakeNow,
          missingIngredients: recommendation.missingIngredients,
        },
        currentContext
      );
    }

    // Call original save handler
    if (toggleSavedCocktail) {
      toggleSavedCocktail(recipe);
    }
  }, [currentContext, toggleSavedCocktail]);

  // Open feedback modal
  const handleOpenFeedback = useCallback((recommendation: SmartRecommendation) => {
    setSelectedRecommendation(recommendation);
    setFeedbackModalVisible(true);
  }, []);

  if (isLoading && recommendations.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons name="sparkles" size={20} color={colors.accent} />
            <Text style={styles.title}>AI Recommendations</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Crafting personalized recommendations...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="sparkles" size={20} color={colors.accent} />
          <Text style={styles.title}>AI Recommendations</Text>
        </View>
        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.refreshButton}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="refresh" size={20} color={colors.accent} />
          )}
        </TouchableOpacity>
      </View>

      {lastRefresh && (
        <Text style={styles.refreshTime}>
          Generated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      )}

      {recommendations.length === 0 ? (
        // Empty State - Show button to generate recommendations
        <View style={styles.emptyState}>
          <Ionicons name="sparkles-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyStateTitle}>No Recommendations Yet</Text>
          <Text style={styles.emptyStateText}>
            Get AI-powered cocktail suggestions based on your taste profile
          </Text>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={() => generateRecommendations(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={20} color={colors.white} />
            <Text style={styles.generateButtonText}>Get Recommendations</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {recommendations.map((recommendation, index) => {
            const recipeCardData = convertToRecipeCardFormat(recommendation, index);
            return (
              <View key={recipeCardData.id} style={styles.recommendationWrapper}>
                <RecipeCard
                  style={styles.recipeCard}
                  {...createRecipeCardProps(recipeCardData, navigation, {
                    toggleSavedCocktail: (recipe) => handleRecipeSave(recommendation, recipe),
                    isCocktailSaved,
                    setSelectedRecipe,
                    setGroceryListVisible,
                    showSaveButton: true,
                    showCartButton: true,
                    showDeleteButton: false,
                  })}
                  onPress={() => handleRecipePress(recommendation, recipeCardData)}
                />

                {/* Rate Button */}
                <TouchableOpacity
                  style={styles.rateButton}
                  onPress={() => handleOpenFeedback(recommendation)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="star-outline" size={16} color={colors.gold} />
                  <Text style={styles.rateButtonText}>Rate</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Feedback Modal */}
      {selectedRecommendation && currentContext && (
        <RecommendationFeedbackModal
          visible={feedbackModalVisible}
          onClose={() => setFeedbackModalVisible(false)}
          recommendation={{
            id: `ai-rec-${selectedRecommendation.cocktail.name}`,
            cocktailName: selectedRecommendation.cocktail.name,
            matchScore: selectedRecommendation.matchScore,
            canMakeNow: selectedRecommendation.canMakeNow,
            missingIngredients: selectedRecommendation.missingIngredients,
          }}
          userId="current-user" // TODO: Get actual user ID
          context={currentContext}
        />
      )}

      {/* Insufficient Credits Modal */}
      <InsufficientCreditsModal
        visible={insufficientCreditsModalVisible}
        onClose={() => setInsufficientCreditsModalVisible(false)}
        onGetCredits={() => onCreditsNeeded?.()}
        creditsNeeded={getActionCost('recommendation')}
        creditsAvailable={credits}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing(2),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(3),
    marginBottom: spacing(1),
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  title: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.text,
  },
  refreshButton: {
    padding: spacing(1),
  },
  refreshTime: {
    fontSize: 12,
    color: colors.muted,
    paddingHorizontal: spacing(3),
    marginBottom: spacing(1),
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(4),
  },
  loadingText: {
    fontSize: fonts.body,
    color: colors.muted,
    marginTop: spacing(2),
  },
  scrollView: {
    paddingLeft: spacing(3),
  },
  scrollContent: {
    paddingRight: spacing(3),
  },
  recommendationWrapper: {
    marginRight: spacing(2),
  },
  recipeCard: {
    width: 280,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(0.5),
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: spacing(2),
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    marginTop: spacing(1),
  },
  rateButtonText: {
    fontSize: fonts.small,
    fontWeight: '600',
    color: colors.gold,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(3),
  },
  emptyStateTitle: {
    fontSize: fonts.h3,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing(2),
    marginBottom: spacing(1),
  },
  emptyStateText: {
    fontSize: fonts.body,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing(3),
    lineHeight: 22,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1),
    backgroundColor: colors.accent,
    borderRadius: spacing(3),
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
  },
  generateButtonText: {
    fontSize: fonts.body,
    fontWeight: '700',
    color: colors.white,
  },
});