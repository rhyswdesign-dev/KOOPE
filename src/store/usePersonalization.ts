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

export type OccasionMode = 'casual' | 'hosting' | 'adventurous';

export interface OccasionProfile {
  id: string;
  name: string;
  mode: OccasionMode;
  createdAt: string;
}

interface PersonalizationState {
  // Core state
  profile: UserPersonalizationProfile | null;
  recommendations: PersonalizedRecommendations | null;
  isInitialized: boolean;

  // Active occasion mode — shapes ForYouFeed recommendations
  occasionMode: OccasionMode;
  setOccasionMode: (mode: OccasionMode) => void;

  // Saved named occasion profiles
  savedOccasionProfiles: OccasionProfile[];
  saveOccasionProfile: (name: string) => Promise<void>;
  loadOccasionProfile: (id: string) => void;
  deleteOccasionProfile: (id: string) => Promise<void>;

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
const OCCASION_PROFILES_KEY = 'koope_occasion_profiles';
const OCCASION_MODE_KEY = 'koope_occasion_mode';

function createDefaultProfile(): UserPersonalizationProfile {
  return {
    favoriteSpirits: [],
    flavorPreferences: [],
    skillLevel: 'beginner',
    preferredABV: 'alcoholic',
    learningGoals: [],
    availableTools: [],
    sessionLength: 5,
    preferredDifficulty: ['Easy'],
    cocktailMoodAffinities: [],
    brandAffinities: [],
    lessonTrack: 'fundamentals',
    spiritScores: {},
    flavorScores: {},
    complexityScore: 0,
    experienceScore: 0,
  };
}

function normalizeProfile(profile?: Partial<UserPersonalizationProfile> | null): UserPersonalizationProfile {
  const base = createDefaultProfile();
  const merged = { ...base, ...(profile || {}) } as UserPersonalizationProfile;

  return {
    ...merged,
    favoriteSpirits: Array.isArray(merged.favoriteSpirits) ? merged.favoriteSpirits : base.favoriteSpirits,
    flavorPreferences: Array.isArray(merged.flavorPreferences) ? merged.flavorPreferences : base.flavorPreferences,
    learningGoals: Array.isArray(merged.learningGoals) ? merged.learningGoals : base.learningGoals,
    availableTools: Array.isArray(merged.availableTools) ? merged.availableTools : base.availableTools,
    preferredDifficulty: Array.isArray(merged.preferredDifficulty) && merged.preferredDifficulty.length > 0
      ? merged.preferredDifficulty
      : base.preferredDifficulty,
    cocktailMoodAffinities: Array.isArray(merged.cocktailMoodAffinities) ? merged.cocktailMoodAffinities : base.cocktailMoodAffinities,
    brandAffinities: Array.isArray(merged.brandAffinities) ? merged.brandAffinities : base.brandAffinities,
    spiritScores: merged.spiritScores && typeof merged.spiritScores === 'object' ? merged.spiritScores : base.spiritScores,
    flavorScores: merged.flavorScores && typeof merged.flavorScores === 'object' ? merged.flavorScores : base.flavorScores,
  };
}

function isZeroProofCocktail(cocktail: any): boolean {
  const description = String(cocktail?.description || '').toLowerCase();
  const subtitle = String(cocktail?.subtitle || '').toLowerCase();
  const base = String(cocktail?.base || cocktail?.baseSpirit || '').toLowerCase();
  const recipeType = String(cocktail?.recipeType || '').toLowerCase();
  const tags = Array.isArray(cocktail?.tags) ? cocktail.tags.map((tag: string) => String(tag).toLowerCase()) : [];
  const abv = typeof cocktail?.abv === 'number' ? cocktail.abv : null;

  return (
    base === 'zero-proof' ||
    recipeType === 'mocktail' ||
    tags.includes('mocktail') ||
    description.includes('zero-proof') ||
    description.includes('non-alcoholic') ||
    description.includes('alcohol-free') ||
    subtitle.includes('zero-proof') ||
    abv === 0
  );
}

export const usePersonalization = create<PersonalizationState>((set, get) => ({
  profile: null,
  recommendations: null,
  isInitialized: false,
  occasionMode: 'casual',
  savedOccasionProfiles: [],

  setOccasionMode: (mode) => {
    set({ occasionMode: mode });
    AsyncStorage.setItem(OCCASION_MODE_KEY, mode).catch(() => {});
  },

  saveOccasionProfile: async (name) => {
    const { occasionMode, savedOccasionProfiles } = get();
    const profile: OccasionProfile = {
      id: `ocp_${Date.now()}`,
      name: name.trim(),
      mode: occasionMode,
      createdAt: new Date().toISOString(),
    };
    const next = [...savedOccasionProfiles, profile];
    set({ savedOccasionProfiles: next });
    await AsyncStorage.setItem(OCCASION_PROFILES_KEY, JSON.stringify(next));
  },

  loadOccasionProfile: (id) => {
    const profile = get().savedOccasionProfiles.find((p) => p.id === id);
    if (profile) {
      set({ occasionMode: profile.mode });
      AsyncStorage.setItem(OCCASION_MODE_KEY, profile.mode).catch(() => {});
    }
  },

  deleteOccasionProfile: async (id) => {
    const next = get().savedOccasionProfiles.filter((p) => p.id !== id);
    set({ savedOccasionProfiles: next });
    await AsyncStorage.setItem(OCCASION_PROFILES_KEY, JSON.stringify(next));
  },

  /**
   * Initialize personalization from survey responses
   * Saves to AsyncStorage (Supabase persistence handled elsewhere)
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

      // Sync to Supabase (optional — AsyncStorage is the primary store)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
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
            log.warn('PersonalizationStore', 'Supabase sync skipped (run 002_app_data_schema migration)', { code: error.code });
          } else {
            log.info('PersonalizationStore', 'Personalization profile saved to Supabase', { userId: user.id });
          }
        }
      } catch {
        // Supabase sync is optional — data is persisted locally
      }

      log.info('PersonalizationStore', 'Personalization profile saved successfully');

    } catch (error) {
      log.error('PersonalizationStore', 'Error initializing personalization', error, { answers });
    }
  },

  /**
   * Update profile with new preferences or learned behavior
   * Saves to AsyncStorage (cache); Supabase persistence handled elsewhere
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
      const updatedProfile = normalizeProfile(profile ? { ...profile, ...updates } : updates);
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

      // Sync to Supabase (optional — AsyncStorage is the primary store)
      try {
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
            log.warn('PersonalizationStore', 'Supabase sync skipped (run 002_app_data_schema migration)', { code: error.code });
          } else {
            log.info('PersonalizationStore', 'Profile saved to Supabase', { userId: user.id });
          }
        }
      } catch {
        // Supabase sync is optional — data is persisted locally
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
          // User has spirit preferences, but this isn't one of them = strong penalty
          score += 0;
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
    const description = String(cocktail.description || '').toLowerCase();
    const subtitle = String(cocktail.subtitle || '').toLowerCase();
    const isLowABV = description.includes('low') || subtitle.includes('light');
    const isMocktail = isZeroProofCocktail(cocktail);

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
    // Load occasion profiles and last-used mode in parallel
    const [stored, storedProfiles, storedMode] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(OCCASION_PROFILES_KEY),
      AsyncStorage.getItem(OCCASION_MODE_KEY),
    ]);

    const occasionUpdates: Partial<PersonalizationState> = {};
    if (storedProfiles) {
      try { occasionUpdates.savedOccasionProfiles = JSON.parse(storedProfiles); } catch {}
    }
    if (storedMode) {
      occasionUpdates.occasionMode = storedMode as OccasionMode;
    }
    if (Object.keys(occasionUpdates).length > 0) {
      usePersonalization.setState(occasionUpdates as any);
    }

    if (stored) {
      const data = JSON.parse(stored);

      // Check if data is recent (within 30 days)
      const isRecent = Date.now() - data.updatedAt < 30 * 24 * 60 * 60 * 1000;

      if (isRecent && data.profile) {
        usePersonalization.setState({
          profile: normalizeProfile(data.profile),
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
