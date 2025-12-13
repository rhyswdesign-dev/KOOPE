/**
 * Personalization Service
 * Feed customization based on user preferences and behavior
 */

import { SurveyResponse, FeedCard, UserProfile } from '../types/domain';
import { log } from '../lib/logger';

export type PersonalizationProfile = {
  topSpirits: string[];
  flavorVibes: string[];
  outingPriorities: string[];
  track: 'alcoholic' | 'low-abv' | 'zero-proof';
};

export type FeedPersonalization = {
  preferredCategories: string[];
  difficultyRange: [number, number];
  contentMix: {
    cocktails: number;
    spirits: number;
    techniques: number;
    culture: number;
  };
  excludeTopics: string[];
};

export type UserSignal = {
  type: 'engagement' | 'completion' | 'skip' | 'save' | 'share';
  cardId: string;
  category: string;
  difficulty: number;
  timestamp: number;
  duration?: number;
};

/**
 * Build personalization profile from onboarding survey
 */
export function buildProfileFromSurvey(responses: SurveyResponse[]): PersonalizationProfile {
  const profile: PersonalizationProfile = {
    topSpirits: [],
    flavorVibes: [],
    outingPriorities: [],
    track: 'alcoholic'
  };

  responses.forEach(response => {
    const { questionId, selectedAnswers } = response;

    switch (questionId) {
      case 'experience_level':
        // Adjust track based on experience
        if (selectedAnswers.includes('complete_beginner')) {
          profile.track = 'low-abv';
        }
        break;

      case 'preferred_spirits':
        profile.topSpirits = selectedAnswers.slice(0, 3); // Top 3 spirits
        break;

      case 'flavor_profile':
        profile.flavorVibes = selectedAnswers;
        break;

      case 'drinking_occasions':
        profile.outingPriorities = selectedAnswers;
        break;

      case 'alcohol_preference':
        if (selectedAnswers.includes('non_alcoholic_only')) {
          profile.track = 'zero-proof';
        } else if (selectedAnswers.includes('low_alcohol_preferred')) {
          profile.track = 'low-abv';
        } else {
          profile.track = 'alcoholic';
        }
        break;

      case 'cocktail_complexity':
        // Influence content mix based on complexity preference
        if (selectedAnswers.includes('simple_drinks')) {
          // Will be used in selectFeedCards
        }
        break;
    }
  });

  return profile;
}

/**
 * Select and rank feed cards based on personalization
 */
export function selectFeedCards(
  availableCards: FeedCard[],
  profile: PersonalizationProfile,
  userHistory: UserSignal[],
  count: number = 10
): FeedCard[] {
  // Calculate engagement scores for categories
  const categoryScores = calculateCategoryScores(userHistory);
  
  // Score each card
  const scoredCards = availableCards.map(card => ({
    card,
    score: calculateCardScore(card, profile, categoryScores, userHistory)
  }));

  // Sort by score and apply diversity filters
  const rankedCards = scoredCards
    .sort((a, b) => b.score - a.score)
    .map(item => item.card);

  // Apply diversity to prevent category clustering
  return diversifySelection(rankedCards, count);
}

/**
 * Update personalization based on user signals
 */
export function updateProfileFromSignals(
  profile: PersonalizationProfile,
  recentSignals: UserSignal[]
): PersonalizationProfile {
  const updated = { ...profile };

  // Analyze recent engagement patterns
  const engagementByCategory = groupSignalsByCategory(recentSignals);
  const highEngagementCategories = Object.entries(engagementByCategory)
    .filter(([_, signals]) => getAverageEngagement(signals) > 0.7)
    .map(([category]) => category);

  const lowEngagementCategories = Object.entries(engagementByCategory)
    .filter(([_, signals]) => getAverageEngagement(signals) < 0.3)
    .map(([category]) => category);

  // Update spirit preferences based on engagement
  const spiritEngagement = recentSignals
    .filter(signal => signal.type === 'engagement' || signal.type === 'completion')
    .reduce((acc, signal) => {
      // Extract spirit from category if applicable
      const spirit = extractSpiritFromCategory(signal.category);
      if (spirit) {
        acc[spirit] = (acc[spirit] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

  // Boost spirits with high engagement
  Object.entries(spiritEngagement).forEach(([spirit, count]) => {
    if (count >= 3 && !updated.topSpirits.includes(spirit)) {
      updated.topSpirits = [spirit, ...updated.topSpirits.slice(0, 2)];
    }
  });

  // Adjust track based on consumption patterns
  const trackSignals = recentSignals.filter(s => 
    s.category.includes('zero-proof') || 
    s.category.includes('low-abv') || 
    s.category.includes('high-proof')
  );

  if (trackSignals.length >= 5) {
    const zeroProofRatio = trackSignals.filter(s => s.category.includes('zero-proof')).length / trackSignals.length;
    const lowAbvRatio = trackSignals.filter(s => s.category.includes('low-abv')).length / trackSignals.length;

    if (zeroProofRatio > 0.6) {
      updated.track = 'zero-proof';
    } else if (lowAbvRatio > 0.4) {
      updated.track = 'low-abv';
    }
  }

  return updated;
}

/**
 * Generate feed personalization settings
 */
export function generateFeedPersonalization(
  profile: PersonalizationProfile,
  userLevel: number,
  recentSignals: UserSignal[]
): FeedPersonalization {
  const personalization: FeedPersonalization = {
    preferredCategories: [],
    difficultyRange: [0.1, 0.9],
    contentMix: {
      cocktails: 0.4,
      spirits: 0.3,
      techniques: 0.2,
      culture: 0.1
    },
    excludeTopics: []
  };

  // Build preferred categories from profile
  personalization.preferredCategories = [
    ...profile.topSpirits.map(spirit => `${spirit}_cocktails`),
    ...profile.flavorVibes.map(vibe => `${vibe}_flavors`),
    ...profile.outingPriorities.map(outing => `${outing}_drinks`)
  ];

  // Adjust difficulty range based on user level
  const levelProgress = Math.min(userLevel / 100, 1); // Assume max level 100
  personalization.difficultyRange = [
    Math.max(0.1, levelProgress - 0.3),
    Math.min(0.9, levelProgress + 0.3)
  ];

  // Adjust content mix based on track
  switch (profile.track) {
    case 'zero-proof':
      personalization.contentMix = {
        cocktails: 0.5,
        spirits: 0.1,
        techniques: 0.3,
        culture: 0.1
      };
      personalization.excludeTopics = ['high_proof', 'strong_spirits'];
      break;

    case 'low-abv':
      personalization.contentMix = {
        cocktails: 0.6,
        spirits: 0.2,
        techniques: 0.15,
        culture: 0.05
      };
      break;

    case 'alcoholic':
      personalization.contentMix = {
        cocktails: 0.35,
        spirits: 0.35,
        techniques: 0.2,
        culture: 0.1
      };
      break;
  }

  // Fine-tune based on recent engagement
  const categoryEngagement = calculateCategoryScores(recentSignals);
  Object.entries(categoryEngagement).forEach(([category, score]) => {
    if (score > 0.8) {
      // Boost this category in preferred list
      if (!personalization.preferredCategories.includes(category)) {
        personalization.preferredCategories.push(category);
      }
    } else if (score < 0.2) {
      // Consider excluding this category
      personalization.excludeTopics.push(category);
    }
  });

  return personalization;
}

/**
 * Helper: Calculate engagement scores by category
 */
function calculateCategoryScores(signals: UserSignal[]): Record<string, number> {
  const categoryStats = signals.reduce((acc, signal) => {
    if (!acc[signal.category]) {
      acc[signal.category] = { total: 0, positive: 0 };
    }
    acc[signal.category].total++;
    
    if (signal.type === 'engagement' || signal.type === 'completion' || signal.type === 'save') {
      acc[signal.category].positive++;
    }
    
    return acc;
  }, {} as Record<string, { total: number; positive: number }>);

  return Object.entries(categoryStats).reduce((acc, [category, stats]) => {
    acc[category] = stats.positive / stats.total;
    return acc;
  }, {} as Record<string, number>);
}

/**
 * Helper: Calculate score for individual feed card
 */
function calculateCardScore(
  card: FeedCard,
  profile: PersonalizationProfile,
  categoryScores: Record<string, number>,
  userHistory: UserSignal[]
): number {
  let score = 0.5; // Base score

  // Track preference bonus
  if (profile.track === 'zero-proof' && card.tags?.includes('non-alcoholic')) {
    score += 0.3;
  } else if (profile.track === 'low-abv' && card.tags?.includes('low-alcohol')) {
    score += 0.2;
  }

  // Spirit preference bonus
  const cardSpirits = card.tags?.filter(tag => profile.topSpirits.includes(tag)) || [];
  score += cardSpirits.length * 0.15;

  // Flavor vibe bonus
  const cardVibes = card.tags?.filter(tag => profile.flavorVibes.includes(tag)) || [];
  score += cardVibes.length * 0.1;

  // Category engagement bonus
  const categoryScore = categoryScores[card.category] || 0.5;
  score += (categoryScore - 0.5) * 0.2;

  // Recency penalty (avoid showing same content too soon)
  const recentView = userHistory.find(signal => 
    signal.cardId === card.id && 
    Date.now() - signal.timestamp < 24 * 60 * 60 * 1000 // 24 hours
  );
  if (recentView) {
    score -= 0.4;
  }

  // Difficulty appropriateness
  const userLevel = calculateUserLevel(userHistory);
  const difficultyGap = Math.abs(card.difficulty - userLevel);
  if (difficultyGap > 0.3) {
    score -= difficultyGap * 0.2;
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Helper: Apply diversity to prevent category clustering
 */
function diversifySelection(cards: FeedCard[], count: number): FeedCard[] {
  const selected: FeedCard[] = [];
  const usedCategories: Record<string, number> = {};

  for (const card of cards) {
    if (selected.length >= count) break;

    const categoryCount = usedCategories[card.category] || 0;
    
    // Allow max 3 cards per category in a feed
    if (categoryCount < 3) {
      selected.push(card);
      usedCategories[card.category] = categoryCount + 1;
    }
  }

  // Fill remaining slots if needed
  if (selected.length < count) {
    const remaining = cards.filter(card => !selected.includes(card));
    selected.push(...remaining.slice(0, count - selected.length));
  }

  return selected;
}

/**
 * Helper: Group signals by category
 */
function groupSignalsByCategory(signals: UserSignal[]): Record<string, UserSignal[]> {
  return signals.reduce((acc, signal) => {
    if (!acc[signal.category]) {
      acc[signal.category] = [];
    }
    acc[signal.category].push(signal);
    return acc;
  }, {} as Record<string, UserSignal[]>);
}

/**
 * Helper: Calculate average engagement for signals
 */
function getAverageEngagement(signals: UserSignal[]): number {
  if (signals.length === 0) return 0.5;

  const positiveSignals = signals.filter(s => 
    s.type === 'engagement' || s.type === 'completion' || s.type === 'save'
  ).length;

  return positiveSignals / signals.length;
}

/**
 * Helper: Extract spirit name from category
 */
function extractSpiritFromCategory(category: string): string | null {
  const spirits = ['whiskey', 'gin', 'vodka', 'rum', 'tequila', 'brandy', 'mezcal'];
  return spirits.find(spirit => category.toLowerCase().includes(spirit)) || null;
}

/**
 * Helper: Calculate user level from history
 */
function calculateUserLevel(signals: UserSignal[]): number {
  const completions = signals.filter(s => s.type === 'completion').length;
  return Math.min(0.9, completions * 0.05); // Cap at 0.9 difficulty
}

/**
 * Analytics integration for personalization events
 */
export function trackPersonalizationEvent(event: {
  type: 'profile_updated' | 'feed_generated' | 'recommendation_served' | 'signal_recorded';
  userId: string;
  data?: any;
}) {
  log.debug('PersonalizationService', 'Tracking personalization event', {
    eventType: event.type,
    userId: event.userId,
    data: event.data
  });

  // TODO: Integrate with analytics service
  // analytics.track({
  //   type: 'personalization.event',
  //   eventType: event.type,
  //   userId: event.userId,
  //   data: event.data
  // });
}