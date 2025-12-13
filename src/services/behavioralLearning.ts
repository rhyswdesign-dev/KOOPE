/**
 * Behavioral Learning Engine
 * Learns from user interactions in real-time to improve recommendations
 */

import { getFirestore, doc, updateDoc, increment } from '@firebase/firestore';
import { log } from '../lib/logger';
import { Recipe } from '../types/recipe';
import { loadUserProfile, saveUserProfile } from './userProfileService';

const db = getFirestore();

export type InteractionType = 'view' | 'like' | 'complete' | 'skip' | 'save';

export interface BehavioralScores {
  // Spirit affinity (learned from interactions)
  spiritScores: { [spirit: string]: number }; // 0-100

  // Flavor affinity (learned from interactions)
  flavorScores: { [flavor: string]: number }; // 0-100

  // Mood affinity (learned from mood selections)
  moodScores: { [mood: string]: number }; // 0-100

  // Complexity preference (0 = simple, 1 = complex)
  complexityScore: number; // 0-1

  // Time of day preferences
  timePreferences: {
    morning: number;
    afternoon: number;
    evening: number;
    lateNight: number;
  };
}

export class BehavioralLearning {
  /**
   * Track user interaction with a recipe
   * Updates behavioral scores in real-time
   */
  static async trackInteraction(
    userId: string,
    recipe: Recipe,
    interactionType: InteractionType
  ): Promise<void> {
    try {
      const profile = await loadUserProfile(userId);
      if (!profile) return;

      // Initialize behavioral scores if needed
      if (!profile.tasteProfile) {
        profile.tasteProfile = {
          flavorWeights: {
            citrus: 0,
            herbal: 0,
            bitter: 0,
            sweet: 0,
            smoky: 0,
            floral: 0,
            spiced: 0,
          },
          spiritWeights: {
            tequila: 0,
            whiskey: 0,
            rum: 0,
            gin: 0,
            vodka: 0,
            brandy: 0,
            liqueurs: 0,
            'gin-alternative': 0,
            'rum-alternative': 0,
            none: 0,
          },
          preferredABV: profile.preferredABVRange || { min: 0, max: 40 },
          preferredComplexity: 0.5,
        };
      }

      // Calculate interaction weight
      const weight = this.getInteractionWeight(interactionType);

      // Update spirit scores
      if (recipe.baseSpirit) {
        profile.tasteProfile.spiritWeights[recipe.baseSpirit] = Math.max(
          0,
          Math.min(1, (profile.tasteProfile.spiritWeights[recipe.baseSpirit] || 0) + weight)
        );
      }

      // Update flavor scores
      recipe.flavorProfiles.forEach((flavor) => {
        profile.tasteProfile!.flavorWeights[flavor] = Math.max(
          0,
          Math.min(1, (profile.tasteProfile!.flavorWeights[flavor] || 0) + weight)
        );
      });

      // Update complexity preference
      if (interactionType === 'complete' || interactionType === 'like') {
        // User liked/completed this complexity level
        const targetComplexity = recipe.complexity;
        profile.tasteProfile.preferredComplexity =
          (profile.tasteProfile.preferredComplexity * 0.8 + targetComplexity * 0.2);
      }

      // Update interaction history
      if (!profile.interactionHistory) {
        profile.interactionHistory = {
          viewedRecipes: [],
          savedRecipes: [],
          completedRecipes: [],
          searchQueries: [],
          lastUpdated: new Date(),
        };
      }

      const interaction = {
        recipeId: recipe.id,
        timestamp: new Date(),
        feedback: this.interactionToFeedback(interactionType),
      };

      // Add to appropriate list
      switch (interactionType) {
        case 'view':
          profile.interactionHistory.viewedRecipes.push(interaction);
          break;
        case 'complete':
          profile.interactionHistory.completedRecipes.push(interaction);
          break;
        case 'save':
        case 'like':
          profile.interactionHistory.savedRecipes.push(interaction);
          break;
      }

      profile.interactionHistory.lastUpdated = new Date();

      // Save updated profile
      await saveUserProfile(profile);

      log.debug('BehavioralLearning', `Learned from ${interactionType}`, { recipeTitle: recipe.title });
    } catch (error) {
      log.error('BehavioralLearning', 'Failed to track interaction', error);
    }
  }

  /**
   * Get weight for interaction type
   */
  private static getInteractionWeight(type: InteractionType): number {
    switch (type) {
      case 'view':
        return 0.02; // Small boost for viewing
      case 'like':
        return 0.1; // Medium boost for liking
      case 'save':
        return 0.1; // Medium boost for saving
      case 'complete':
        return 0.15; // Big boost for completing
      case 'skip':
        return -0.05; // Small penalty for skipping
      default:
        return 0;
    }
  }

  /**
   * Convert interaction type to feedback
   */
  private static interactionToFeedback(
    type: InteractionType
  ): 'loved' | 'liked' | 'disliked' | 'skipped' {
    switch (type) {
      case 'complete':
        return 'loved';
      case 'like':
      case 'save':
        return 'liked';
      case 'skip':
        return 'skipped';
      default:
        return 'liked';
    }
  }

  /**
   * Get dynamic scoring boost based on learned behavior
   */
  static calculateBehavioralBoost(
    recipe: Recipe,
    profile: any
  ): number {
    if (!profile?.tasteProfile) return 0;

    let boost = 0;

    // Spirit boost (learned preference)
    if (recipe.baseSpirit && profile.tasteProfile.spiritWeights?.[recipe.baseSpirit]) {
      boost += profile.tasteProfile.spiritWeights[recipe.baseSpirit] * 20; // Up to +20
    }

    // Flavor boost (learned preference)
    recipe.flavorProfiles?.forEach((flavor) => {
      if (profile.tasteProfile.flavorWeights?.[flavor]) {
        boost += profile.tasteProfile.flavorWeights[flavor] * 10; // Up to +10 per flavor
      }
    });

    // Complexity match boost
    if (profile.tasteProfile.preferredComplexity !== undefined) {
      const complexityDiff = Math.abs(
        recipe.complexity - profile.tasteProfile.preferredComplexity
      );
      boost += (1 - complexityDiff) * 10; // Up to +10 for perfect complexity match
    }

    return boost;
  }

  /**
   * Track mood selection
   */
  static async trackMoodSelection(
    userId: string,
    mood: string
  ): Promise<void> {
    try {
      const userRef = doc(db, 'users', userId);

      // Increment mood selection count
      await updateDoc(userRef, {
        [`tasteProfile.moodPreferences.${mood}`]: increment(1),
      });

      log.debug('BehavioralLearning', 'Tracked mood selection', { mood });
    } catch (error) {
      log.error('BehavioralLearning', 'Failed to track mood', error);
    }
  }

  /**
   * Track search query
   */
  static async trackSearch(userId: string, query: string): Promise<void> {
    try {
      const profile = await loadUserProfile(userId);
      if (!profile) return;

      if (!profile.interactionHistory) {
        profile.interactionHistory = {
          viewedRecipes: [],
          savedRecipes: [],
          completedRecipes: [],
          searchQueries: [],
          lastUpdated: new Date(),
        };
      }

      // Add search query
      profile.interactionHistory.searchQueries.push(query.toLowerCase());

      // Keep only last 50 searches
      if (profile.interactionHistory.searchQueries.length > 50) {
        profile.interactionHistory.searchQueries =
          profile.interactionHistory.searchQueries.slice(-50);
      }

      await saveUserProfile(profile);
    } catch (error) {
      log.error('BehavioralLearning', 'Failed to track search', error);
    }
  }

  /**
   * Get trending searches for user
   */
  static getTrendingSearches(profile: any): string[] {
    if (!profile.interactionHistory?.searchQueries) return [];

    // Count frequency
    const counts: { [query: string]: number } = {};
    profile.interactionHistory.searchQueries.forEach((query: string) => {
      counts[query] = (counts[query] || 0) + 1;
    });

    // Sort by frequency
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([query]) => query);
  }

  /**
   * Calculate user engagement score (0-100)
   * Higher = more active user = better data for recommendations
   */
  static calculateEngagementScore(profile: any): number {
    let score = 0;

    const history = profile.interactionHistory;
    if (!history) return 0;

    // Views contribute
    score += Math.min(20, history.viewedRecipes.length * 0.5);

    // Saves contribute more
    score += Math.min(30, history.savedRecipes.length * 2);

    // Completions contribute most
    score += Math.min(40, history.completedRecipes.length * 4);

    // Searches show exploration
    score += Math.min(10, history.searchQueries.length * 0.2);

    return Math.min(100, score);
  }

  /**
   * Should we show behavioral recommendations yet?
   * Only show after sufficient data
   */
  static hasEnoughData(profile: any): boolean {
    const engagement = this.calculateEngagementScore(profile);
    return engagement >= 20; // At least 20% engagement
  }
}

/**
 * Helper: Track recipe view (call this when user views a recipe)
 */
export async function trackRecipeView(userId: string, recipe: Recipe) {
  await BehavioralLearning.trackInteraction(userId, recipe, 'view');
}

/**
 * Helper: Track recipe like
 */
export async function trackRecipeLike(userId: string, recipe: Recipe) {
  await BehavioralLearning.trackInteraction(userId, recipe, 'like');
}

/**
 * Helper: Track recipe completion
 */
export async function trackRecipeComplete(userId: string, recipe: Recipe) {
  await BehavioralLearning.trackInteraction(userId, recipe, 'complete');
}

/**
 * Helper: Track recipe skip
 */
export async function trackRecipeSkip(userId: string, recipe: Recipe) {
  await BehavioralLearning.trackInteraction(userId, recipe, 'skip');
}

/**
 * Helper: Track recipe save
 */
export async function trackRecipeSave(userId: string, recipe: Recipe) {
  await BehavioralLearning.trackInteraction(userId, recipe, 'save');
}
