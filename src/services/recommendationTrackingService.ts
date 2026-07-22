/**
 * Recommendation Tracking Service
 * Tracks user interactions with AI recommendations to improve future suggestions.
 *
 * Phase 0.4 (Firebase excision): this previously wrote every interaction to a
 * Firestore `recommendationInteractions` collection via `@firebase/firestore`
 * (a package that was never installed — this module could not have run
 * without throwing at import time, since `getFirestore()` was called at
 * module load). Nothing in the app ever read that collection back
 * (getRecommendationAnalytics below had zero callers), so per the workplan's
 * "stub if unread" rule this now just forwards to Mixpanel (the same
 * trackEvent call that already fired alongside every Firestore write) and
 * drops the unread write. If per-recommendation analytics become a real
 * product need, back this with a Supabase table instead.
 */

import { log } from '../lib/logger';
import { trackEvent } from '../lib/analytics';

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

interface RecommendationRef {
  id: string;
  cocktailName: string;
  matchScore: number;
  canMakeNow: boolean;
  missingIngredients: string[];
}

/**
 * Track when a user views a recommendation
 */
export async function trackRecommendationView(
  userId: string,
  recommendation: RecommendationRef,
  context: { timeOfDay: string; season: string }
): Promise<void> {
  trackEvent('ai_recommendation_viewed', {
    cocktail_name: recommendation.cocktailName,
    match_score: recommendation.matchScore,
    can_make: recommendation.canMakeNow,
    time_of_day: context.timeOfDay,
    season: context.season,
  });

  log.debug('RecommendationTrackingService', 'Tracked view', { cocktailName: recommendation.cocktailName });
}

/**
 * Track when a user saves a recommendation
 */
export async function trackRecommendationSaved(
  userId: string,
  recommendation: RecommendationRef,
  context: { timeOfDay: string; season: string }
): Promise<void> {
  trackEvent('ai_recommendation_saved', {
    cocktail_name: recommendation.cocktailName,
    match_score: recommendation.matchScore,
    can_make: recommendation.canMakeNow,
    time_of_day: context.timeOfDay,
    season: context.season,
  });

  log.debug('RecommendationTrackingService', 'Tracked save', { cocktailName: recommendation.cocktailName });
}

/**
 * Track when a user actually makes a recommended cocktail
 */
export async function trackRecommendationMade(
  userId: string,
  recommendation: RecommendationRef,
  context: { timeOfDay: string; season: string }
): Promise<void> {
  trackEvent('ai_recommendation_made', {
    cocktail_name: recommendation.cocktailName,
    match_score: recommendation.matchScore,
    can_make: recommendation.canMakeNow,
  });

  log.info('RecommendationTrackingService', 'User made cocktail!', { cocktailName: recommendation.cocktailName });
}

/**
 * Track when a user dismisses a recommendation
 */
export async function trackRecommendationDismissed(
  userId: string,
  recommendation: RecommendationRef,
  context: { timeOfDay: string; season: string },
  reason?: string
): Promise<void> {
  trackEvent('ai_recommendation_dismissed', {
    cocktail_name: recommendation.cocktailName,
    match_score: recommendation.matchScore,
    reason: reason || 'not_specified',
  });

  log.debug('RecommendationTrackingService', 'User dismissed cocktail', {
    cocktailName: recommendation.cocktailName,
    reason,
  });
}

/**
 * Track user rating of a recommendation
 */
export async function trackRecommendationRating(
  userId: string,
  recommendation: RecommendationRef,
  rating: number,
  feedback?: string,
  context?: { timeOfDay: string; season: string }
): Promise<void> {
  trackEvent('ai_recommendation_rated', {
    cocktail_name: recommendation.cocktailName,
    rating,
    match_score: recommendation.matchScore,
    feedback: feedback || undefined,
  });

  log.info('RecommendationTrackingService', 'User rated cocktail', {
    cocktailName: recommendation.cocktailName,
    rating,
  });
}

/**
 * Get analytics for user's recommendation interactions.
 *
 * Unwired since the Firestore store this used to read was itself
 * write-only (see file header) — there is no data source to query.
 * Zero call sites reference this today; returns null until a real
 * Supabase-backed store exists.
 */
export async function getRecommendationAnalytics(_userId: string): Promise<RecommendationAnalytics | null> {
  return null;
}
