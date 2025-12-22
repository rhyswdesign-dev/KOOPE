/**
 * PERSONALIZATION STORE
 * Manages user personalization profile and provides personalized content
 * Integrates survey responses with recommendation systems
 * Syncs with Firebase Firestore for persistence
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
import { auth, db } from '../config/firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

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

      // Save to Firebase (if user is authenticated)
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.id);
        await setDoc(userDocRef, {
          personalizationProfile: profile,
          personalizationUpdatedAt: Date.now(),
        }, { merge: true });

        log.info('PersonalizationStore', 'Personalization profile saved to Firebase', { userId: user.id });
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
      // If no profile exists, create a new one with the updates
      const updatedProfile = profile ? { ...profile, ...updates } : updates as UserPersonalizationProfile;
      const recommendations = personalizedExperience.generateRecommendations(updatedProfile);

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

      // Save to Firebase (if user is authenticated)
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'users', user.id);
        await setDoc(userDocRef, {
          personalizationProfile: updatedProfile,
          personalizationUpdatedAt: Date.now(),
        }, { merge: true });

        log.info('PersonalizationStore', 'Profile saved to Firebase', { userId: user.id });
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

    // Track interaction patterns
    // This could be enhanced to update profile based on behavior patterns

    // Example: If user consistently chooses tequila cocktails, boost tequila score
    if (type === 'cocktail_viewed' && context?.spirit && profile.spiritScores) {
      const currentScore = profile.spiritScores[context.spirit] || 50;
      const boostedScore = Math.min(100, currentScore + 2);

      get().updateProfile({
        spiritScores: {
          ...profile.spiritScores,
          [context.spirit]: boostedScore
        }
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
    if (cocktailSpirit && profile.spiritScores && profile.spiritScores[cocktailSpirit]) {
      score += (profile.spiritScores[cocktailSpirit] / 100) * 40;
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