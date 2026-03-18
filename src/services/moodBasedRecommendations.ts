// @ts-nocheck
/**
 * Mood-Based Recipe Organization
 * Organizes cocktails by mood/occasion, personalized by user preferences
 */

import { Recipe } from '../types/recipe';
import { EnhancedUserProfile } from '../types/userProfile';

export type Mood =
  | 'refreshing'       // Light, citrusy, bright
  | 'cozy'             // Warm, comforting, spiced
  | 'playful'          // Fun, colorful, tropical
  | 'sophisticated'    // Classic, elegant, refined
  | 'energizing'       // Bold, strong, caffeinated
  | 'romantic'         // Floral, sweet, delicate
  | 'adventurous'      // Unique, experimental, complex
  | 'relaxing';        // Smooth, easy-drinking, mellow

export interface MoodCategory {
  id: Mood;
  name: string;
  description: string;
  emoji: string;
  flavorProfiles: string[];   // Associated flavors
  spirits: string[];          // Best spirits for this mood
  timeOfDay: string[];        // When this mood fits best
  complexity: number;         // 0-1 (simple to complex)
  exampleCocktails: string[]; // Example recipe names
}

/**
 * Mood categories with their characteristics
 */
export const MOOD_CATEGORIES: MoodCategory[] = [
  {
    id: 'refreshing',
    name: 'Refreshing & Light',
    description: 'Bright, citrusy drinks perfect for warm days',
    emoji: '🌊',
    flavorProfiles: ['citrus', 'herbal', 'floral'],
    spirits: ['gin', 'vodka', 'tequila', 'rum'],
    timeOfDay: ['morning', 'afternoon'],
    complexity: 0.3,
    exampleCocktails: ['Mojito', 'Gin & Tonic', 'Paloma', 'Tom Collins'],
  },
  {
    id: 'playful',
    name: 'Playful & Fun',
    description: 'Colorful, tropical, party-ready cocktails',
    emoji: '🎉',
    flavorProfiles: ['sweet', 'citrus', 'spiced'],
    spirits: ['rum', 'tequila', 'vodka'],
    timeOfDay: ['afternoon', 'evening'],
    complexity: 0.4,
    exampleCocktails: ['Margarita', 'Mai Tai', 'Pina Colada', 'Daiquiri'],
  },
  {
    id: 'sophisticated',
    name: 'Sophisticated & Classic',
    description: 'Timeless cocktails for refined tastes',
    emoji: '🎩',
    flavorProfiles: ['bitter', 'herbal', 'smoky'],
    spirits: ['whiskey', 'gin', 'brandy'],
    timeOfDay: ['evening', 'lateNight'],
    complexity: 0.6,
    exampleCocktails: ['Old Fashioned', 'Manhattan', 'Negroni', 'Martini'],
  },
  {
    id: 'cozy',
    name: 'Cozy & Comforting',
    description: 'Warm, spiced drinks for cold evenings',
    emoji: '🔥',
    flavorProfiles: ['spiced', 'sweet', 'smoky'],
    spirits: ['whiskey', 'rum', 'brandy'],
    timeOfDay: ['evening', 'lateNight'],
    complexity: 0.4,
    exampleCocktails: ['Hot Toddy', 'Irish Coffee', 'Mulled Wine', 'Hot Buttered Rum'],
  },
  {
    id: 'romantic',
    name: 'Romantic & Elegant',
    description: 'Delicate, beautiful drinks for special moments',
    emoji: '💕',
    flavorProfiles: ['floral', 'sweet', 'citrus'],
    spirits: ['gin', 'vodka', 'liqueurs'],
    timeOfDay: ['evening'],
    complexity: 0.5,
    exampleCocktails: ['French 75', 'Bellini', 'Lavender Lemon Drop', 'Rose Spritz'],
  },
  {
    id: 'adventurous',
    name: 'Adventurous & Bold',
    description: 'Experimental flavors for the daring',
    emoji: '🌶️',
    flavorProfiles: ['smoky', 'spiced', 'bitter'],
    spirits: ['tequila', 'whiskey', 'rum'],
    timeOfDay: ['evening', 'lateNight'],
    complexity: 0.7,
    exampleCocktails: ['Mezcal Margarita', 'Penicillin', 'Oaxaca Old Fashioned'],
  },
  {
    id: 'energizing',
    name: 'Energizing & Bright',
    description: 'Strong, bold drinks to wake you up',
    emoji: '⚡',
    flavorProfiles: ['bitter', 'citrus', 'sweet'],
    spirits: ['vodka', 'rum', 'liqueurs'],
    timeOfDay: ['afternoon', 'evening'],
    complexity: 0.4,
    exampleCocktails: ['Espresso Martini', 'Aperol Spritz', 'Americano'],
  },
  {
    id: 'relaxing',
    name: 'Relaxing & Mellow',
    description: 'Smooth, easy-drinking cocktails to unwind',
    emoji: '🌙',
    flavorProfiles: ['sweet', 'herbal', 'floral'],
    spirits: ['gin', 'vodka', 'liqueurs'],
    timeOfDay: ['evening', 'lateNight'],
    complexity: 0.3,
    exampleCocktails: ['Whiskey Sour', 'Moscow Mule', 'Gimlet'],
  },
];

/**
 * Personalize mood category order based on user preferences
 */
export function personalizeModeCategoryOrder(
  profile: EnhancedUserProfile
): MoodCategory[] {
  const categories = [...MOOD_CATEGORIES];

  // Score each mood based on user preferences
  const scoredMoods = categories.map((mood) => {
    let score = 0;

    // Favorite spirit match
    if (profile.favoriteSpirit && mood.spirits.includes(profile.favoriteSpirit)) {
      score += 30;
    }

    // Flavor profile matches
    const matchingFlavors = mood.flavorProfiles.filter((flavor) =>
      profile.flavorProfiles.includes(flavor as any)
    );
    score += matchingFlavors.length * 15;

    // Skill level match
    const skillComplexity = {
      beginner: 0.3,
      intermediate: 0.5,
      advanced: 0.7,
    };
    const userComplexity = skillComplexity[profile.skillLevel];
    const complexityDiff = Math.abs(mood.complexity - userComplexity);
    score += (1 - complexityDiff) * 10;

    // Learned preference boost (if exists)
    if (profile.tasteProfile?.moodPreferences?.[mood.id]) {
      score += profile.tasteProfile.moodPreferences[mood.id] * 2;
    }

    return { mood, score };
  });

  // Sort by score descending
  scoredMoods.sort((a, b) => b.score - a.score);

  return scoredMoods.map((sm) => sm.mood);
}

/**
 * Get recipes for a specific mood, personalized
 */
export function getRecipesForMood(
  mood: Mood,
  allRecipes: Recipe[],
  profile: EnhancedUserProfile,
  limit: number = 10
): Recipe[] {
  const moodCategory = MOOD_CATEGORIES.find((m) => m.id === mood);
  if (!moodCategory) return [];

  // Filter recipes that match this mood
  const matchingRecipes = allRecipes.filter((recipe) => {
    // Check flavor profile match
    const hasMatchingFlavor = recipe.flavorProfiles.some((flavor) =>
      moodCategory.flavorProfiles.includes(flavor)
    );

    // Check spirit match
    const hasMatchingSpirit =
      recipe.baseSpirit && moodCategory.spirits.includes(recipe.baseSpirit);

    // Check complexity range
    const complexityMatch =
      Math.abs(recipe.complexity - moodCategory.complexity) < 0.3;

    return (hasMatchingFlavor || hasMatchingSpirit) && complexityMatch;
  });

  // Score and sort by personalization
  const scoredRecipes = matchingRecipes.map((recipe) => {
    let score = 0;

    // User's favorite spirit
    if (recipe.baseSpirit === profile.favoriteSpirit) score += 50;

    // User's flavor preferences
    const matchingFlavors = recipe.flavorProfiles.filter((f) =>
      profile.flavorProfiles.includes(f)
    );
    score += matchingFlavors.length * 20;

    // Skill match
    if (recipe.difficulty === profile.skillLevel) score += 15;

    // ABV match
    if (
      profile.preferredABVRange &&
      recipe.abv >= profile.preferredABVRange.min &&
      recipe.abv <= profile.preferredABVRange.max
    ) {
      score += 10;
    }

    return { recipe, score };
  });

  scoredRecipes.sort((a, b) => b.score - a.score);

  return scoredRecipes.slice(0, limit).map((sr) => sr.recipe);
}

/**
 * Get mood suggestion based on time of day and user profile
 */
export function suggestMoodForTimeOfDay(
  profile: EnhancedUserProfile
): Mood {
  const hour = new Date().getHours();

  let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'lateNight';
  if (hour < 12) timeOfDay = 'morning';
  else if (hour < 17) timeOfDay = 'afternoon';
  else if (hour < 22) timeOfDay = 'evening';
  else timeOfDay = 'lateNight';

  // Find moods that fit this time of day
  const fittingMoods = MOOD_CATEGORIES.filter((mood) =>
    mood.timeOfDay.includes(timeOfDay)
  );

  // Personalize based on user preferences
  const personalizedMoods = personalizeModeCategoryOrder(profile);

  // Return first mood that fits time of day from personalized list
  for (const mood of personalizedMoods) {
    if (fittingMoods.some((fm) => fm.id === mood.id)) {
      return mood.id;
    }
  }

  return 'refreshing'; // Default fallback
}

/**
 * Example usage scenarios
 */

// User picks "tequila" as favorite → "Playful & Fun" mood appears first
export function getTopMoodsForTequila(): Mood[] {
  return ['playful', 'adventurous', 'refreshing'];
}

// User picks "beginner" skill → Simple moods appear first
export function getTopMoodsForBeginners(): Mood[] {
  return ['refreshing', 'relaxing', 'playful'];
}

// User picks "zero-proof" → Filter all moods to zero-proof only
export function filterMoodsForZeroProof(
  allRecipes: Recipe[]
): MoodCategory[] {
  return MOOD_CATEGORIES.filter((mood) => {
    // Check if this mood has zero-proof recipes
    const zeroProofRecipes = allRecipes.filter(
      (r) => r.abv === 0 && r.flavorProfiles.some((f) => mood.flavorProfiles.includes(f))
    );
    return zeroProofRecipes.length > 0;
  });
}

// User picks "sweet & fruity" → Romantic and Playful moods boosted
export function getTopMoodsForSweetFruity(): Mood[] {
  return ['romantic', 'playful', 'cozy'];
}
