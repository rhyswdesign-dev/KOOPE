/**
 * PERSONALIZATION STORE
 * Manages user personalization profile and provides personalized content
 * Integrates survey responses with recommendation systems
 * Syncs with Supabase for persistence
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../lib/logger';
import {
  UserPersonalizationProfile,
  PersonalizedRecommendations,
  personalizedExperience
} from '../services/personalizedExperience';
import { SurveyAnswers } from '../services/placement';
import { supabase } from '../lib/supabase';
import { userProfileService } from '../lib/supabaseData';

interface PersonalizationState {
  // Core state
  profile: UserPersonalizationProfile | null;
  recommendations: PersonalizedRecommendations | null;
  isInitialized: boolean;

  // Actions
  initializeFromSurvey: (answers: SurveyAnswers) => Promise<void>;
  updateProfile: (updates: Partial<UserPersonalizationProfile>) => Promise<void>;
  generateRecommendations: () => Promise<void>;
  recordInteraction: (type: string, itemId: string, context?: any) => void;

  // Getters for UI components
  getFeaturedCocktails: () => any[];
  getPersonalizedMoodOrder: () => string[];
  getSpiritPreferences: () => string[];
  getPersonalizedDifficulties: () => string[];
  getRecommendedBrands: (spirit: string) => string[];

  // Scoring functions
  scoreCocktail: (cocktail: any) => number;
  scoreMoodCategory: (category: string) => number;
}

const STORAGE_KEY = 'user_personalization_profile';

export const usePersonalization = create<PersonalizationState>((set, get) => ({
  profile: null,
  recommendations: null,
  isInitialized: false,

  /**
   * Initialize personalization from survey responses
   * Saves to both AsyncStorage and Firebase
   */
  initializeFromSurvey: async (answers: SurveyAnswers) => {
    try {
      log.info('PersonalizationStore', 'Initializing personalization from survey answers', { answers });

      // Build comprehensive profile from survey
      const profile = personalizedExperience.buildProfile(answers);

      log.debug('PersonalizationStore', 'Generated personalization profile', { profile });

      // Generate initial recommendations
      const recommendations = personalizedExperience.generateRecommendations(profile);

      log.debug('PersonalizationStore', 'Generated recommendations', { recommendations });

      // Save to state and storage
      set({
        profile,
        recommendations,
        isInitialized: true
      });

      // Save to AsyncStorage (local cache)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        profile,
        recommendations,
        updatedAt: Date.now()
      }));

      // Save to Supabase (if user is authenticated)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Store personalization data in user preferences
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            preferences: {
              personalizationProfile: profile,
              personalizationUpdatedAt: Date.now(),
            },
            updated_at: new Date().toISOString()
          });

        if (error) {
          log.error('PersonalizationStore', 'Error saving to Supabase', error);
        } else {
          log.info('PersonalizationStore', 'Personalization profile saved to Supabase', { userId: user.id });
        }
      }

      log.info('PersonalizationStore', 'Personalization profile saved successfully');

    } catch (error) {
      log.error('PersonalizationStore', 'Error initializing personalization', error, { answers });
    }
  },

  /**
   * Update profile with new preferences or learned behavior
   * Saves to both AsyncStorage (cache) and Firebase (persistence)
   */
  updateProfile: async (updates: Partial<UserPersonalizationProfile>) => {
    const { profile } = get();

    try {
      log.info('PersonalizationStore', 'Updating profile', {
        currentFavoriteSpirits: profile?.favoriteSpirits,
        newFavoriteSpirits: updates.favoriteSpirits,
        updates
      });

      // If no profile exists, create a new one with the updates
      const updatedProfile = profile ? { ...profile, ...updates } : updates as UserPersonalizationProfile;
      const recommendations = personalizedExperience.generateRecommendations(updatedProfile);

      log.info('PersonalizationStore', 'Setting new profile state', {
        favoriteSpirits: updatedProfile.favoriteSpirits,
        flavorPreferences: updatedProfile.flavorPreferences,
      });

      set({
        profile: updatedProfile,
        recommendations,
        isInitialized: true
      });

      // Save to AsyncStorage (local cache)
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        profile: updatedProfile,
        recommendations,
        updatedAt: Date.now()
      }));

      // Save to Supabase (if user is authenticated)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            preferences: {
              personalizationProfile: updatedProfile,
              personalizationUpdatedAt: Date.now(),
            },
            updated_at: new Date().toISOString()
          });

        if (error) {
          log.error('PersonalizationStore', 'Error saving to Supabase', error);
        } else {
          log.info('PersonalizationStore', 'Profile saved to Supabase', { userId: user.id });
        }
      }

      log.info('PersonalizationStore', 'Profile updated', { updates });

    } catch (error) {
      log.error('PersonalizationStore', 'Error updating profile', error, { updates });
    }
  },

  /**
   * Regenerate recommendations based on current profile
   */
  generateRecommendations: async () => {
    const { profile } = get();
    if (!profile) return;

    try {
      const recommendations = personalizedExperience.generateRecommendations(profile);

      set({ recommendations });

      log.info('PersonalizationStore', 'Recommendations regenerated');

    } catch (error) {
      log.error('PersonalizationStore', 'Error generating recommendations', error);
    }
  },

  /**
   * Record user interaction to improve recommendations
   */
  recordInteraction: (type: string, itemId: string, context?: any) => {
    const { profile } = get();
    if (!profile) return;

    log.debug('PersonalizationStore', 'Recording interaction', { type, itemId, context });

    // Track interaction patterns - only boost on meaningful actions
    // Meaningful actions: save/favorite, rate, repeat views (not single views)
    const meaningfulActions = ['cocktail_saved', 'cocktail_favorited', 'cocktail_rated'];

    if (meaningfulActions.includes(type) && context?.spirit && profile.spiritScores) {
      const currentScore = profile.spiritScores[context.spirit] || 50;

      // Higher boost for more meaningful actions
      let boost = 0;
      if (type === 'cocktail_saved' || type === 'cocktail_favorited') {
        boost = 5; // Saving/favoriting shows strong preference
      } else if (type === 'cocktail_rated') {
        boost = context.rating >= 4 ? 7 : 3; // High ratings boost more
      }

      const boostedScore = Math.min(100, currentScore + boost);

      get().updateProfile({
        spiritScores: {
          ...profile.spiritScores,
          [context.spirit]: boostedScore
        }
      });
    }

    // Also boost flavor scores on meaningful actions
    if (meaningfulActions.includes(type) && context?.flavors && Array.isArray(context.flavors) && profile.flavorScores) {
      const updatedFlavorScores = { ...profile.flavorScores };

      context.flavors.forEach((flavor: string) => {
        const currentScore = updatedFlavorScores[flavor] || 40;
        const boost = type === 'cocktail_rated' && context.rating >= 4 ? 5 : 3;
        updatedFlavorScores[flavor] = Math.min(100, currentScore + boost);
      });

      get().updateProfile({
        flavorScores: updatedFlavorScores
      });
    }
  },

  /**
   * Get personalized featured cocktails
   */
  getFeaturedCocktails: (): any[] => {
    const { recommendations } = get();
    return recommendations?.featuredCocktails.slice(0, 10).map(item => item.cocktail) || [];
  },

  /**
   * Get mood categories ordered by user preference
   */
  getPersonalizedMoodOrder: (): string[] => {
    const { recommendations } = get();
    return recommendations?.moodCategories
      .sort((a, b) => b.affinity - a.affinity)
      .map(item => item.category) || [];
  },

  /**
   * Get user's spirit preferences in order
   */
  getSpiritPreferences: (): string[] => {
    const { profile } = get();
    return profile?.favoriteSpirits || [];
  },

  /**
   * Get appropriate difficulty levels for user
   */
  getPersonalizedDifficulties: (): string[] => {
    const { profile } = get();
    return profile?.preferredDifficulty || ['Easy'];
  },

  /**
   * Get recommended brands for a specific spirit
   */
  getRecommendedBrands: (spirit: string): string[] => {
    const { recommendations } = get();
    const spiritRec = recommendations?.spiritBrands.find(item => item.spirit === spirit);
    return spiritRec?.brands || [];
  },

  /**
   * Score a cocktail based on user preferences
   */
  scoreCocktail: (cocktail: any): number => {
    const { profile } = get();
    if (!profile) return 50;

    let score = 0;

    // Spirit preference (40% weight)
    const cocktailSpirit = cocktail.base?.toLowerCase();
    const isLiqueurBased = cocktailSpirit === 'liqueur' || cocktailSpirit === 'liqueurs';

    // Get user's primary spirits (non-liqueur spirits)
    const primarySpirits = profile.favoriteSpirits?.filter(s =>
      s.toLowerCase() !== 'liqueur' && s.toLowerCase() !== 'liqueurs'
    ) || [];

    const hasLiqueurPreference = profile.favoriteSpirits?.some(s =>
      s.toLowerCase() === 'liqueur' || s.toLowerCase() === 'liqueurs'
    );

    if (cocktailSpirit && profile.spiritScores) {
      if (isLiqueurBased) {
        // Liqueur-based cocktails: only score well if user has other primary spirits too
        // This makes liqueur a complement, not a replacement
        if (primarySpirits.length > 0) {
          // User has primary spirits + liqueur preference = good match
          const liqueurScore = profile.spiritScores[cocktailSpirit] || 50;
          score += (liqueurScore / 100) * 20; // Reduced weight (20 instead of 40)
        } else if (hasLiqueurPreference && primarySpirits.length === 0) {
          // ONLY liqueur preference = still allow but lower score
          const liqueurScore = profile.spiritScores[cocktailSpirit] || 50;
          score += (liqueurScore / 100) * 15;
        } else {
          // No liqueur preference = penalty
          score += 5;
        }
      } else {
        // Primary spirit cocktails: normal scoring
        const spiritScore = profile.spiritScores[cocktailSpirit];
        if (spiritScore) {
          score += (spiritScore / 100) * 40;
        } else if (primarySpirits.length > 0) {
          // User has spirit preferences, but this isn't one of them = penalty
          score += 10;
        } else {
          // No strong preference = neutral
          score += 20;
        }
      }
    }

    // Difficulty appropriateness (30% weight)
    const difficultyMatch = profile.preferredDifficulty && Array.isArray(profile.preferredDifficulty) && profile.preferredDifficulty.includes(cocktail.difficulty || 'Easy');
    if (difficultyMatch) {
      score += 30;
    }

    // ABV preference (20% weight)
    const isLowABV = cocktail.description?.toLowerCase().includes('low');
    const isMocktail = cocktail.description?.toLowerCase().includes('non-alcoholic');

    if (profile.preferredABV === 'zero-proof' && isMocktail) {
      score += 20;
    } else if (profile.preferredABV === 'low-abv' && isLowABV) {
      score += 20;
    } else if (profile.preferredABV === 'alcoholic' && !isMocktail && !isLowABV) {
      score += 20;
    }

    // Flavor matching (10% weight)
    if (profile.flavorPreferences && Array.isArray(profile.flavorPreferences)) {
      profile.flavorPreferences.forEach(flavor => {
        const flavorInDescription = cocktail.description?.toLowerCase().includes(flavor);
        if (flavorInDescription && profile.flavorScores && profile.flavorScores[flavor]) {
          score += (profile.flavorScores[flavor] / 100) * 2;
        }
      });
    }

    return Math.min(100, score);
  },

  /**
   * Score a mood category based on user preferences
   */
  scoreMoodCategory: (category: string): number => {
    const { recommendations } = get();
    const moodRec = recommendations?.moodCategories.find(item => item.category === category);
    return moodRec?.affinity || 50;
  },
}));

/**
 * Load personalization profile from storage on app start
 */
export const loadPersonalizationFromStorage = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);

      // Check if data is recent (within 30 days)
      const isRecent = Date.now() - data.updatedAt < 30 * 24 * 60 * 60 * 1000;

      if (isRecent && data.profile) {
        usePersonalization.setState({
          profile: data.profile,
          recommendations: data.recommendations,
          isInitialized: true
        });

        log.info('PersonalizationStore', 'Loaded personalization from storage');
        return true;
      }
    }
  } catch (error) {
    log.error('PersonalizationStore', 'Error loading personalization from storage', error);
  }

  return false;
};

/**
 * Clear personalization data (for testing or reset)
 */
export const clearPersonalizationData = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    usePersonalization.setState({
      profile: null,
      recommendations: null,
      isInitialized: false
    });
    log.info('PersonalizationStore', 'Personalization data cleared');
  } catch (error) {
    log.error('PersonalizationStore', 'Error clearing personalization data', error);
  }
};