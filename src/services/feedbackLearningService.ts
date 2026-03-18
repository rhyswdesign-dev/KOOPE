// @ts-nocheck
/**
 * Feedback Learning Service
 * Dynamically updates taste profile weights based on user feedback
 * Phase 2 Enhancement: Makes recommendations smarter with every interaction
 */

import { log } from '../lib/logger';
import { UserPersonalizationProfile } from './personalizedExperience';

/**
 * Weight adjustment amounts
 */
const WEIGHT_ADJUSTMENTS = {
  STRONG_POSITIVE: 15, // When user loves something
  MODERATE_POSITIVE: 10, // When user likes something
  LIGHT_POSITIVE: 5, // Subtle positive signal
  LIGHT_NEGATIVE: -5, // Subtle negative signal
  MODERATE_NEGATIVE: -10, // When user dislikes something
  STRONG_NEGATIVE: -15, // When user hates something
};

/**
 * Clamp a score between 0 and 100
 */
function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

/**
 * Update spirit scores based on feedback
 */
function updateSpiritScores(
  currentScores: Record<string, number>,
  cocktailSpirit: string | undefined,
  liked: boolean,
  feedbackReasons: string[]
): Record<string, number> {
  const updatedScores = { ...currentScores };

  if (!cocktailSpirit) return updatedScores;

  const spirit = cocktailSpirit.toLowerCase();

  // Check if feedback explicitly mentions the spirit
  const lovesSpiritFeedback = feedbackReasons.includes('love_spirit');
  const hatesSpiritFeedback = feedbackReasons.includes('wrong_spirit');

  if (liked) {
    // Positive feedback - boost this spirit
    const adjustment = lovesSpiritFeedback
      ? WEIGHT_ADJUSTMENTS.STRONG_POSITIVE
      : WEIGHT_ADJUSTMENTS.MODERATE_POSITIVE;

    updatedScores[spirit] = clampScore((updatedScores[spirit] || 50) + adjustment);

    log.debug('FeedbackLearningService', `Boosted ${spirit} by +${adjustment}`, { newScore: updatedScores[spirit] });
  } else {
    // Negative feedback - reduce this spirit
    const adjustment = hatesSpiritFeedback
      ? WEIGHT_ADJUSTMENTS.STRONG_NEGATIVE
      : WEIGHT_ADJUSTMENTS.MODERATE_NEGATIVE;

    updatedScores[spirit] = clampScore((updatedScores[spirit] || 50) + adjustment);

    log.debug('FeedbackLearningService', `Reduced ${spirit} by ${adjustment}`, { newScore: updatedScores[spirit] });
  }

  return updatedScores;
}

/**
 * Update flavor scores based on feedback
 */
function updateFlavorScores(
  currentScores: Record<string, number>,
  cocktailFlavors: string[],
  liked: boolean,
  feedbackReasons: string[]
): Record<string, number> {
  const updatedScores = { ...currentScores };

  if (cocktailFlavors.length === 0) return updatedScores;

  const adjustment = liked
    ? WEIGHT_ADJUSTMENTS.MODERATE_POSITIVE
    : WEIGHT_ADJUSTMENTS.MODERATE_NEGATIVE;

  cocktailFlavors.forEach(flavor => {
    const flavorKey = flavor.toLowerCase();
    updatedScores[flavorKey] = clampScore((updatedScores[flavorKey] || 50) + adjustment);

    log.debug('FeedbackLearningService', `Adjusted ${flavorKey} by ${adjustment}`, {
      liked,
      newScore: updatedScores[flavorKey]
    });
  });

  return updatedScores;
}

/**
 * Update complexity preference based on feedback
 */
function updateComplexityScore(
  currentScore: number,
  cocktailDifficulty: string | undefined,
  liked: boolean,
  feedbackReasons: string[]
): number {
  const tooComplexFeedback = feedbackReasons.includes('too_complex');

  // If user said "too complex", reduce complexity preference
  if (tooComplexFeedback) {
    return clampScore(currentScore + WEIGHT_ADJUSTMENTS.MODERATE_NEGATIVE);
  }

  // Adjust based on difficulty and feedback
  if (cocktailDifficulty === 'Hard' && liked) {
    // User liked a hard cocktail - boost complexity preference
    return clampScore(currentScore + WEIGHT_ADJUSTMENTS.LIGHT_POSITIVE);
  } else if (cocktailDifficulty === 'Easy' && !liked) {
    // User didn't like an easy cocktail - maybe they want more complexity
    return clampScore(currentScore + WEIGHT_ADJUSTMENTS.LIGHT_POSITIVE);
  }

  return currentScore;
}

/**
 * Update preferred difficulties based on feedback
 */
function updatePreferredDifficulty(
  currentDifficulties: string[],
  cocktailDifficulty: string | undefined,
  liked: boolean,
  feedbackReasons: string[]
): string[] {
  const tooComplexFeedback = feedbackReasons.includes('too_complex');

  // If user said "too complex", ensure we're showing easier cocktails
  if (tooComplexFeedback && cocktailDifficulty === 'Hard') {
    // Remove 'Hard' from preferences if present
    return currentDifficulties.filter(d => d !== 'Hard');
  }

  // If user liked a hard cocktail, add Hard to preferences
  if (liked && cocktailDifficulty === 'Hard' && !currentDifficulties.includes('Hard')) {
    return [...currentDifficulties, 'Hard'];
  }

  return currentDifficulties;
}

/**
 * Extract cocktail metadata from recommendation
 */
interface CocktailMetadata {
  spirit?: string;
  flavors: string[];
  difficulty?: string;
}

function extractCocktailMetadata(cocktailName: string): CocktailMetadata {
  // This is a simple extraction - in production you'd look up the actual cocktail data
  const name = cocktailName.toLowerCase();

  // Detect spirit
  let spirit: string | undefined;
  if (name.includes('margarita') || name.includes('tequila') || name.includes('mezcal')) {
    spirit = name.includes('mezcal') ? 'mezcal' : 'tequila';
  } else if (name.includes('whiskey') || name.includes('bourbon') || name.includes('rye')) {
    spirit = 'whiskey';
  } else if (name.includes('gin')) {
    spirit = 'gin';
  } else if (name.includes('rum')) {
    spirit = 'rum';
  } else if (name.includes('vodka')) {
    spirit = 'vodka';
  } else if (name.includes('brandy') || name.includes('cognac')) {
    spirit = 'brandy';
  }

  // Detect flavors (simplified)
  const flavors: string[] = [];
  if (name.includes('citrus') || name.includes('lemon') || name.includes('lime')) flavors.push('citrus');
  if (name.includes('sweet') || name.includes('sugar')) flavors.push('sweet');
  if (name.includes('bitter')) flavors.push('bitter');
  if (name.includes('spicy') || name.includes('spice')) flavors.push('spiced');
  if (name.includes('herb') || name.includes('mint') || name.includes('basil')) flavors.push('herbal');
  if (name.includes('smoke') || name.includes('smoky')) flavors.push('smoky');
  if (name.includes('floral')) flavors.push('floral');

  return { spirit, flavors, difficulty: undefined };
}

/**
 * Main function: Update profile based on feedback
 *
 * @param currentProfile - Current user profile
 * @param recommendation - The cocktail that was rated
 * @param liked - Whether user liked it (true = thumbs up, false = thumbs down)
 * @param feedbackReasons - Array of reason IDs selected by user
 * @returns Updated profile with adjusted weights
 */
export function updateProfileFromFeedback(
  currentProfile: UserPersonalizationProfile,
  recommendation: {
    cocktailName: string;
    matchScore: number;
  },
  liked: boolean,
  feedbackReasons: string[]
): Partial<UserPersonalizationProfile> {
  log.info('FeedbackLearningService', 'Learning from user feedback', {
    cocktail: recommendation.cocktailName,
    liked,
    reasons: feedbackReasons,
  });

  // Extract cocktail metadata
  const metadata = extractCocktailMetadata(recommendation.cocktailName);

  // Update spirit scores
  const updatedSpiritScores = updateSpiritScores(
    currentProfile.spiritScores || {},
    metadata.spirit,
    liked,
    feedbackReasons
  );

  // Update flavor scores
  const updatedFlavorScores = updateFlavorScores(
    currentProfile.flavorScores || {},
    metadata.flavors,
    liked,
    feedbackReasons
  );

  // Update complexity score
  const updatedComplexityScore = updateComplexityScore(
    currentProfile.complexityScore || 50,
    metadata.difficulty,
    liked,
    feedbackReasons
  );

  // Update preferred difficulty
  const updatedPreferredDifficulty = updatePreferredDifficulty(
    currentProfile.preferredDifficulty || ['Easy', 'Medium'],
    metadata.difficulty,
    liked,
    feedbackReasons
  );

  // Update favorite spirits list if needed
  const updatedFavoriteSpirits = [...(currentProfile.favoriteSpirits || [])];
  if (metadata.spirit && liked && !updatedFavoriteSpirits.includes(metadata.spirit)) {
    // Add this spirit to favorites if they loved it
    if (feedbackReasons.includes('love_spirit')) {
      updatedFavoriteSpirits.unshift(metadata.spirit);
      log.info('FeedbackLearningService', `Added ${metadata.spirit} to favorite spirits`);
    }
  } else if (metadata.spirit && !liked && feedbackReasons.includes('wrong_spirit')) {
    // Remove from favorites if they explicitly hate it
    const index = updatedFavoriteSpirits.indexOf(metadata.spirit);
    if (index > -1) {
      updatedFavoriteSpirits.splice(index, 1);
      log.info('FeedbackLearningService', `Removed ${metadata.spirit} from favorite spirits`);
    }
  }

  return {
    spiritScores: updatedSpiritScores,
    flavorScores: updatedFlavorScores,
    complexityScore: updatedComplexityScore,
    preferredDifficulty: updatedPreferredDifficulty,
    favoriteSpirits: updatedFavoriteSpirits.slice(0, 3), // Keep top 3
    lastFeedbackUpdate: Date.now(),
  };
}
