// @ts-nocheck
/**
 * Recommendation Tracking Service
 * Tracks user interactions with AI recommendations to improve future suggestions
 */

import { getFirestore, collection, addDoc, query, where, getDocs, Timestamp } from '@firebase/firestore';
import { log } from '../lib/logger';
import { trackEvent } from './analytics';

const db = getFirestore();

export interface RecommendationInteraction {
  userId: string;
  recommendationId: string;
  cocktailName: string;
  matchScore: number;
  interactionType: 'viewed' | 'saved' | 'made' | 'dismissed' | 'rated';
  rating?: number; // 1-5 stars
  feedback?: string;
  context: {
    timeOfDay: string;
    season: string;
    hadAllIngredients: boolean;
    missingIngredients?: string[];
  };
  timestamp: Date;
}

export interface RecommendationAnalytics {
  userId: string;
  totalRecommendations: number;
  viewedCount: number;
  savedCount: number;
  madeCount: number;
  dismissedCount: number;
  averageRating: number;
  conversionRate: number; // % of recommendations that were made
  topPerformingCocktails: Array<{
    name: string;
    viewCount: number;
    saveCount: number;
    makeCount: number;
    avgRating: number;
  }>;
}

/**
 * Track when a user views a recommendation
 */
export async function trackRecommendationView(
  userId: string,
  recommendation: {
    id: string;
    cocktailName: string;
    matchScore: number;
    canMakeNow: boolean;
    missingIngredients: string[];
  },
  context: { timeOfDay: string; season: string }
): Promise<void> {
  try {
    const interaction: RecommendationInteraction = {
      userId,
      recommendationId: recommendation.id,
      cocktailName: recommendation.cocktailName,
      matchScore: recommendation.matchScore,
      interactionType: 'viewed',
      context: {
        timeOfDay: context.timeOfDay,
        season: context.season,
        hadAllIngredients: recommendation.canMakeNow,
        missingIngredients: recommendation.missingIngredients,
      },
      timestamp: new Date(),
    };

    await addDoc(collection(db, 'recommendationInteractions'), interaction);

    // Track in analytics
    trackEvent('ai_recommendation_viewed', {
      cocktail_name: recommendation.cocktailName,
      match_score: recommendation.matchScore,
      can_make: recommendation.canMakeNow,
    });

    log.debug('RecommendationTrackingService', 'Tracked view', { cocktailName: recommendation.cocktailName });
  } catch (error: any) {
    // Handle offline gracefully
    if (error?.message?.includes('offline') || error?.code === 'unavailable') {
      log.info('RecommendationTrackingService', 'Offline - tracking will sync when online');
      return;
    }
    log.error('RecommendationTrackingService', 'Failed to track recommendation view', error);
  }
}

/**
 * Track when a user saves a recommendation
 */
export async function trackRecommendationSaved(
  userId: string,
  recommendation: {
    id: string;
    cocktailName: string;
    matchScore: number;
    canMakeNow: boolean;
    missingIngredients: string[];
  },
  context: { timeOfDay: string; season: string }
): Promise<void> {
  try {
    const interaction: RecommendationInteraction = {
      userId,
      recommendationId: recommendation.id,
      cocktailName: recommendation.cocktailName,
      matchScore: recommendation.matchScore,
      interactionType: 'saved',
      context: {
        timeOfDay: context.timeOfDay,
        season: context.season,
        hadAllIngredients: recommendation.canMakeNow,
        missingIngredients: recommendation.missingIngredients,
      },
      timestamp: new Date(),
    };

    await addDoc(collection(db, 'recommendationInteractions'), interaction);

    trackEvent('ai_recommendation_saved', {
      cocktail_name: recommendation.cocktailName,
      match_score: recommendation.matchScore,
      can_make: recommendation.canMakeNow,
    });

    log.debug('RecommendationTrackingService', 'Tracked save', { cocktailName: recommendation.cocktailName });
  } catch (error: any) {
    if (error?.message?.includes('offline') || error?.code === 'unavailable') {
      log.info('RecommendationTrackingService', 'Offline - tracking will sync when online');
      return;
    }
    log.error('RecommendationTrackingService', 'Failed to track recommendation save', error);
  }
}

/**
 * Track when a user actually makes a recommended cocktail
 */
export async function trackRecommendationMade(
  userId: string,
  recommendation: {
    id: string;
    cocktailName: string;
    matchScore: number;
    canMakeNow: boolean;
    missingIngredients: string[];
  },
  context: { timeOfDay: string; season: string }
): Promise<void> {
  try {
    const interaction: RecommendationInteraction = {
      userId,
      recommendationId: recommendation.id,
      cocktailName: recommendation.cocktailName,
      matchScore: recommendation.matchScore,
      interactionType: 'made',
      context: {
        timeOfDay: context.timeOfDay,
        season: context.season,
        hadAllIngredients: recommendation.canMakeNow,
        missingIngredients: recommendation.missingIngredients,
      },
      timestamp: new Date(),
    };

    await addDoc(collection(db, 'recommendationInteractions'), interaction);

    trackEvent('ai_recommendation_made', {
      cocktail_name: recommendation.cocktailName,
      match_score: recommendation.matchScore,
      can_make: recommendation.canMakeNow,
    });

    log.info('RecommendationTrackingService', 'User made cocktail!', { cocktailName: recommendation.cocktailName });
  } catch (error: any) {
    if (error?.message?.includes('offline') || error?.code === 'unavailable') {
      log.info('RecommendationTrackingService', 'Offline - tracking will sync when online');
      return;
    }
    log.error('RecommendationTrackingService', 'Failed to track recommendation made', error);
  }
}

/**
 * Track when a user dismisses a recommendation
 */
export async function trackRecommendationDismissed(
  userId: string,
  recommendation: {
    id: string;
    cocktailName: string;
    matchScore: number;
    canMakeNow: boolean;
    missingIngredients: string[];
  },
  context: { timeOfDay: string; season: string },
  reason?: string
): Promise<void> {
  try {
    const interaction: RecommendationInteraction = {
      userId,
      recommendationId: recommendation.id,
      cocktailName: recommendation.cocktailName,
      matchScore: recommendation.matchScore,
      interactionType: 'dismissed',
      context: {
        timeOfDay: context.timeOfDay,
        season: context.season,
        hadAllIngredients: recommendation.canMakeNow,
        missingIngredients: recommendation.missingIngredients,
      },
      timestamp: new Date(),
    };

    // Only include feedback if provided (Firestore doesn't accept undefined)
    if (reason !== undefined && reason !== null && reason.trim() !== '') {
      interaction.feedback = reason;
    }

    await addDoc(collection(db, 'recommendationInteractions'), interaction);

    trackEvent('ai_recommendation_dismissed', {
      cocktail_name: recommendation.cocktailName,
      match_score: recommendation.matchScore,
      reason: reason || 'not_specified',
    });

    log.debug('RecommendationTrackingService', 'User dismissed cocktail', {
      cocktailName: recommendation.cocktailName,
      reason
    });
  } catch (error: any) {
    if (error?.message?.includes('offline') || error?.code === 'unavailable') {
      log.info('RecommendationTrackingService', 'Offline - tracking will sync when online');
      return;
    }
    log.error('RecommendationTrackingService', 'Failed to track recommendation dismissal', error);
  }
}

/**
 * Track user rating of a recommendation
 */
export async function trackRecommendationRating(
  userId: string,
  recommendation: {
    id: string;
    cocktailName: string;
    matchScore: number;
    canMakeNow: boolean;
    missingIngredients: string[];
  },
  rating: number,
  feedback?: string,
  context?: { timeOfDay: string; season: string }
): Promise<void> {
  try {
    const interaction: RecommendationInteraction = {
      userId,
      recommendationId: recommendation.id,
      cocktailName: recommendation.cocktailName,
      matchScore: recommendation.matchScore,
      interactionType: 'rated',
      rating,
      context: {
        timeOfDay: context?.timeOfDay || 'unknown',
        season: context?.season || 'unknown',
        hadAllIngredients: recommendation.canMakeNow,
        missingIngredients: recommendation.missingIngredients,
      },
      timestamp: new Date(),
    };

    // Only include feedback if provided (Firestore doesn't accept undefined)
    if (feedback !== undefined && feedback !== null && feedback.trim() !== '') {
      interaction.feedback = feedback;
    }

    await addDoc(collection(db, 'recommendationInteractions'), interaction);

    trackEvent('ai_recommendation_rated', {
      cocktail_name: recommendation.cocktailName,
      rating,
      match_score: recommendation.matchScore,
    });

    log.info('RecommendationTrackingService', 'User rated cocktail', {
      cocktailName: recommendation.cocktailName,
      rating
    });
  } catch (error: any) {
    if (error?.message?.includes('offline') || error?.code === 'unavailable') {
      log.info('RecommendationTrackingService', 'Offline - tracking will sync when online');
      return;
    }
    log.error('RecommendationTrackingService', 'Failed to track recommendation rating', error);
  }
}

/**
 * Get analytics for user's recommendation interactions
 */
export async function getRecommendationAnalytics(userId: string): Promise<RecommendationAnalytics | null> {
  try {
    const q = query(
      collection(db, 'recommendationInteractions'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const interactions = snapshot.docs.map(doc => doc.data() as RecommendationInteraction);

    if (interactions.length === 0) {
      return null;
    }

    // Calculate metrics
    const viewedCount = interactions.filter(i => i.interactionType === 'viewed').length;
    const savedCount = interactions.filter(i => i.interactionType === 'saved').length;
    const madeCount = interactions.filter(i => i.interactionType === 'made').length;
    const dismissedCount = interactions.filter(i => i.interactionType === 'dismissed').length;

    const ratings = interactions.filter(i => i.rating !== undefined).map(i => i.rating!);
    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;

    const conversionRate = viewedCount > 0 ? (madeCount / viewedCount) * 100 : 0;

    // Calculate top performing cocktails
    const cocktailStats = new Map<string, { views: number; saves: number; makes: number; ratings: number[] }>();

    interactions.forEach(interaction => {
      const name = interaction.cocktailName;
      if (!cocktailStats.has(name)) {
        cocktailStats.set(name, { views: 0, saves: 0, makes: 0, ratings: [] });
      }

      const stats = cocktailStats.get(name)!;
      if (interaction.interactionType === 'viewed') stats.views++;
      if (interaction.interactionType === 'saved') stats.saves++;
      if (interaction.interactionType === 'made') stats.makes++;
      if (interaction.rating) stats.ratings.push(interaction.rating);
    });

    const topPerformingCocktails = Array.from(cocktailStats.entries())
      .map(([name, stats]) => ({
        name,
        viewCount: stats.views,
        saveCount: stats.saves,
        makeCount: stats.makes,
        avgRating: stats.ratings.length > 0
          ? stats.ratings.reduce((sum, r) => sum + r, 0) / stats.ratings.length
          : 0,
      }))
      .sort((a, b) => b.makeCount - a.makeCount)
      .slice(0, 10);

    return {
      userId,
      totalRecommendations: viewedCount,
      viewedCount,
      savedCount,
      madeCount,
      dismissedCount,
      averageRating,
      conversionRate,
      topPerformingCocktails,
    };
  } catch (error: any) {
    if (error?.message?.includes('offline') || error?.code === 'unavailable') {
      log.info('RecommendationTrackingService', 'Offline - analytics unavailable');
      return null;
    }
    log.error('RecommendationTrackingService', 'Failed to get recommendation analytics', error);
    return null;
  }
}
