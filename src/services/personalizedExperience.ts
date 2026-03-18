// @ts-nocheck
/**
 * PERSONALIZED EXPERIENCE ENGINE
 * Maps survey responses to create a tailored user experience across all app features
 * Influences cocktail recommendations, learning paths, brand suggestions, and content prioritization
 */

import { SurveyAnswers } from './placement';
import { ALL_COCKTAILS } from '../data/cocktails';
import { searchService } from './searchService';

export interface UserPersonalizationProfile {
  // Core preferences from survey
  favoriteSpirits: string[];
  flavorPreferences: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  preferredABV: 'alcoholic' | 'low-abv' | 'zero-proof';
  learningGoals: string[];
  availableTools: string[];
  sessionLength: number; // in minutes

  // Derived preferences
  preferredDifficulty: string[];
  cocktailMoodAffinities: string[];
  brandAffinities: string[];
  lessonTrack: string;

  // Scoring weights
  spiritScores: Record<string, number>; // 0-100
  flavorScores: Record<string, number>; // 0-100
  complexityScore: number; // 0-100
  experienceScore: number; // 0-100
}

export interface PersonalizedRecommendations {
  featuredCocktails: Array<{
    cocktail: any;
    score: number;
    reasons: string[];
  }>;
  spiritBrands: Array<{
    spirit: string;
    brands: string[];
    priority: number;
  }>;
  learningPath: {
    currentLevel: string;
    nextLessons: string[];
    suggestedModules: string[];
  };
  moodCategories: Array<{
    category: string;
    affinity: number;
    cocktails: string[];
  }>;
}

/**
 * Build comprehensive personalization profile from survey responses
 */
export function buildPersonalizationProfile(answers: SurveyAnswers): UserPersonalizationProfile {
  const profile: UserPersonalizationProfile = {
    favoriteSpirits: [],
    flavorPreferences: [],
    skillLevel: 'beginner',
    preferredABV: 'alcoholic',
    learningGoals: [],
    availableTools: [],
    sessionLength: 5,
    preferredDifficulty: [],
    cocktailMoodAffinities: [],
    brandAffinities: [],
    lessonTrack: 'basics',
    spiritScores: {},
    flavorScores: {},
    complexityScore: 0,
    experienceScore: 0,
  };

  // Process each survey answer
  Object.entries(answers).forEach(([questionId, answer]) => {
    processSurveyAnswer(profile, questionId, answer);
  });

  // Calculate derived preferences
  calculateDerivedPreferences(profile);

  // Calculate scoring weights
  calculateScoringWeights(profile);

  return profile;
}

/**
 * Process individual survey answers into profile data
 */
function processSurveyAnswer(profile: UserPersonalizationProfile, questionId: string, answer: string | string[]) {
  switch (questionId) {
    case 'q1': // Home bartending experience
      if (answer === 'never') profile.experienceScore = 10;
      else if (answer === 'occasionally') profile.experienceScore = 40;
      else if (answer === 'regularly') profile.experienceScore = 70;
      break;

    case 'q2': // Shake vs stir confidence
      if (answer === 'not-at-all') profile.experienceScore += 0;
      else if (answer === 'somewhat') profile.experienceScore += 20;
      else if (answer === 'very-confident') profile.experienceScore += 40;
      break;

    case 'q3': // Knowledge check (tequila cocktail)
      if (answer === 'margarita') profile.experienceScore += 15;
      break;

    case 'q4': // Glassware recognition
      if (answer === 'coupe') profile.experienceScore += 15;
      break;

    case 'q8': // Spirit preferences - MOST IMPORTANT FOR PERSONALIZATION
      if (Array.isArray(answer) && !answer.includes('none')) {
        profile.favoriteSpirits = answer.slice(0, 3); // Top 3 preferred spirits

        // Set base scores for preferred spirits
        answer.forEach((spirit, index) => {
          profile.spiritScores[spirit] = 90 - (index * 10); // 90, 80, 70 for top 3
        });
      }
      break;

    case 'q9': // Preferred alcohol content
      profile.preferredABV = answer as 'alcoholic' | 'low-abv' | 'zero-proof';
      break;

    case 'q10': // Avoid alcohol entirely
      if (answer === 'yes') {
        profile.preferredABV = 'zero-proof';
      }
      break;

    case 'q11': // Flavor profiles - CRITICAL FOR COCKTAIL MATCHING
      if (Array.isArray(answer)) {
        profile.flavorPreferences = answer;

        // Set flavor scoring weights
        answer.forEach((flavor, index) => {
          profile.flavorScores[flavor] = 85 - (index * 5); // 85, 80, 75...
        });
      }
      break;

    case 'q12': // Learning goals
      if (Array.isArray(answer)) {
        profile.learningGoals = answer;
      }
      break;

    case 'q13': // Available tools
      if (Array.isArray(answer) && !answer.includes('none')) {
        profile.availableTools = answer;
      }
      break;

    case 'q15': // Preferred lesson time
      if (answer === '3m') profile.sessionLength = 3;
      else if (answer === '5m') profile.sessionLength = 5;
      else if (answer === '8m') profile.sessionLength = 8;
      break;
  }
}

/**
 * Calculate derived preferences based on core survey data
 */
function calculateDerivedPreferences(profile: UserPersonalizationProfile) {
  // Determine skill level from experience score
  if (profile.experienceScore <= 30) profile.skillLevel = 'beginner';
  else if (profile.experienceScore <= 70) profile.skillLevel = 'intermediate';
  else profile.skillLevel = 'advanced';

  // Set complexity preferences based on skill and goals
  profile.complexityScore = profile.experienceScore;

  if (profile.learningGoals.includes('professional')) {
    profile.complexityScore += 20;
  }
  if (profile.learningGoals.includes('originals')) {
    profile.complexityScore += 15;
  }
  if (profile.learningGoals.includes('classics')) {
    profile.complexityScore += 10;
  }

  // Map spirits to mood affinities
  profile.cocktailMoodAffinities = mapSpiritsToMoods(profile.favoriteSpirits);

  // Set difficulty preferences
  if (profile.skillLevel === 'beginner') {
    profile.preferredDifficulty = ['Easy'];
  } else if (profile.skillLevel === 'intermediate') {
    profile.preferredDifficulty = ['Easy', 'Medium'];
  } else {
    profile.preferredDifficulty = ['Easy', 'Medium', 'Hard'];
  }

  // Set learning track
  if (profile.preferredABV === 'zero-proof') {
    profile.lessonTrack = 'mocktails';
  } else if (profile.skillLevel === 'beginner') {
    profile.lessonTrack = 'fundamentals';
  } else if (profile.learningGoals.includes('professional')) {
    profile.lessonTrack = 'professional';
  } else {
    profile.lessonTrack = 'enthusiast';
  }
}

/**
 * Calculate comprehensive scoring weights for personalization
 */
function calculateScoringWeights(profile: UserPersonalizationProfile) {
  // Fill in missing spirit scores with lower values
  const allSpirits = ['tequila', 'whiskey', 'rum', 'gin', 'brandy', 'vodka', 'liqueurs'];
  allSpirits.forEach(spirit => {
    if (!profile.spiritScores[spirit]) {
      profile.spiritScores[spirit] = 30; // Neutral score for non-preferred spirits
    }
  });

  // Fill in missing flavor scores
  const allFlavors = ['citrus', 'herbal', 'bitter', 'sweet', 'smoky', 'floral', 'spiced'];
  allFlavors.forEach(flavor => {
    if (!profile.flavorScores[flavor]) {
      profile.flavorScores[flavor] = 40; // Neutral score for non-selected flavors
    }
  });
}

/**
 * Map user's favorite spirits to mood category affinities
 */
function mapSpiritsToMoods(spirits: string[]): string[] {
  const spiritMoodMap: Record<string, string[]> = {
    whiskey: ['Bold & Serious', 'Mystery & Depth', 'After-Dinner Indulgence'],
    gin: ['Romantic & Elegant', 'Mystery & Depth', 'Playful & Fun'],
    tequila: ['Playful & Fun', 'Tropical Escape', 'Party Crowd-Pleasers'],
    rum: ['Tropical Escape', 'Cozy & Comforting', 'Party Crowd-Pleasers'],
    brandy: ['After-Dinner Indulgence', 'Romantic & Elegant', 'Mystery & Depth'],
    vodka: ['Late-Night Energy', 'Playful & Fun', 'Party Crowd-Pleasers'],
    liqueurs: ['After-Dinner Indulgence', 'Cozy & Comforting', 'Romantic & Elegant']
  };

  const affinities: string[] = [];
  spirits.forEach(spirit => {
    const moods = spiritMoodMap[spirit] || [];
    affinities.push(...moods);
  });

  // Return unique moods sorted by frequency
  const moodCounts = affinities.reduce((acc, mood) => {
    acc[mood] = (acc[mood] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(moodCounts)
    .sort(([,a], [,b]) => b - a)
    .map(([mood]) => mood)
    .slice(0, 5); // Top 5 mood affinities
}

/**
 * Generate personalized recommendations across all app features
 */
export function generatePersonalizedRecommendations(profile: UserPersonalizationProfile): PersonalizedRecommendations {
  return {
    featuredCocktails: generateCocktailRecommendations(profile),
    spiritBrands: generateSpiritBrandRecommendations(profile),
    learningPath: generateLearningPath(profile),
    moodCategories: generateMoodCategoryRankings(profile)
  };
}

/**
 * Generate cocktail recommendations with scoring and reasoning
 */
function generateCocktailRecommendations(profile: UserPersonalizationProfile): Array<{
  cocktail: any;
  score: number;
  reasons: string[];
}> {
  const recommendations = ALL_COCKTAILS.map(cocktail => {
    let score = 0;
    const reasons: string[] = [];

    // Spirit preference scoring (40% weight)
    const cocktailSpirit = cocktail.base?.toLowerCase();
    if (cocktailSpirit && profile.spiritScores[cocktailSpirit]) {
      const spiritScore = profile.spiritScores[cocktailSpirit];
      score += (spiritScore / 100) * 40;

      if (spiritScore >= 80) {
        reasons.push(`Features your favorite spirit: ${cocktailSpirit}`);
      }
    }

    // Difficulty appropriateness (25% weight)
    const difficultyMatch = profile.preferredDifficulty.includes(cocktail.difficulty || 'Medium');
    if (difficultyMatch) {
      score += 25;
      reasons.push(`Perfect for your ${profile.skillLevel} level`);
    }

    // ABV preference (20% weight)
    const isLowABV = cocktail.description?.toLowerCase().includes('low') ||
                     cocktail.subtitle?.toLowerCase().includes('light');
    const isMocktail = cocktail.description?.toLowerCase().includes('non-alcoholic') ||
                       cocktail.tags?.includes('mocktail');

    if (profile.preferredABV === 'zero-proof' && isMocktail) {
      score += 20;
      reasons.push('Alcohol-free as you prefer');
    } else if (profile.preferredABV === 'low-abv' && isLowABV) {
      score += 20;
      reasons.push('Lower alcohol content');
    } else if (profile.preferredABV === 'alcoholic' && !isMocktail && !isLowABV) {
      score += 20;
    }

    // Flavor profile matching (15% weight)
    profile.flavorPreferences.forEach(flavor => {
      const flavorInDescription = cocktail.description?.toLowerCase().includes(flavor) ||
                                 cocktail.ingredients?.some(ing =>
                                   typeof ing === 'string' && ing.toLowerCase().includes(flavor));

      if (flavorInDescription) {
        score += (profile.flavorScores[flavor] / 100) * 3; // Max 3 points per flavor
        reasons.push(`Matches your ${flavor} preference`);
      }
    });

    return {
      cocktail,
      score: Math.min(100, score),
      reasons
    };
  });

  // Sort by score and return top recommendations
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
}

/**
 * Generate spirit brand recommendations with priority
 */
function generateSpiritBrandRecommendations(profile: UserPersonalizationProfile): Array<{
  spirit: string;
  brands: string[];
  priority: number;
}> {
  const brandRecommendations = profile.favoriteSpirits.map((spirit, index) => {
    const priority = 100 - (index * 20); // 100, 80, 60 for top 3 spirits

    // This would integrate with your brands data
    const brands = getBrandsBySpirit(spirit, profile);

    return {
      spirit,
      brands,
      priority
    };
  });

  return brandRecommendations;
}

/**
 * Generate personalized learning path
 */
function generateLearningPath(profile: UserPersonalizationProfile): {
  currentLevel: string;
  nextLessons: string[];
  suggestedModules: string[];
} {
  const lessonMaps: Record<string, string[]> = {
    fundamentals: [
      'Basic Equipment',
      'Measuring Techniques',
      'Shake vs Stir',
      'Simple Syrups',
      'Classic Three-Ingredient Cocktails'
    ],
    enthusiast: [
      'Advanced Techniques',
      'Flavor Balancing',
      'Garnish Preparation',
      'Creating Original Recipes',
      'Seasonal Ingredients'
    ],
    professional: [
      'Speed Techniques',
      'Batch Cocktails',
      'Advanced Garnishes',
      'Customer Service',
      'Bar Management'
    ],
    mocktails: [
      'Non-Alcoholic Spirits',
      'Complex Syrups',
      'Shrubs and Vinegars',
      'Layering Techniques',
      'Presentation'
    ]
  };

  const currentTrack = lessonMaps[profile.lessonTrack] || lessonMaps.fundamentals;

  return {
    currentLevel: profile.skillLevel,
    nextLessons: currentTrack.slice(0, 3),
    suggestedModules: currentTrack
  };
}

/**
 * Generate mood category rankings based on user preferences
 */
function generateMoodCategoryRankings(profile: UserPersonalizationProfile): Array<{
  category: string;
  affinity: number;
  cocktails: string[];
}> {
  const moodCategories = [
    'Bold & Serious', 'Romantic & Elegant', 'Playful & Fun',
    'Tropical Escape', 'Cozy & Comforting', 'Late-Night Energy',
    'Mystery & Depth', 'Party Crowd-Pleasers', 'After-Dinner Indulgence'
  ];

  return moodCategories.map(category => {
    let affinity = 50; // Base affinity

    // Boost affinity based on spirit preferences
    profile.favoriteSpirits.forEach(spirit => {
      const spiritMoodBoost = getSpiritMoodAffinity(spirit, category);
      affinity += spiritMoodBoost;
    });

    // Boost based on flavor preferences
    profile.flavorPreferences.forEach(flavor => {
      const flavorMoodBoost = getFlavorMoodAffinity(flavor, category);
      affinity += flavorMoodBoost;
    });

    // Get cocktails for this category (you'd filter your cocktail data here)
    const cocktails = getCocktailsByMood(category, profile);

    return {
      category,
      affinity: Math.min(100, affinity),
      cocktails
    };
  }).sort((a, b) => b.affinity - a.affinity);
}

/**
 * Helper: Get spirit-mood affinity boost
 */
function getSpiritMoodAffinity(spirit: string, mood: string): number {
  const affinityMap: Record<string, Record<string, number>> = {
    whiskey: {
      'Bold & Serious': 20,
      'Mystery & Depth': 15,
      'After-Dinner Indulgence': 10,
      'Cozy & Comforting': 10
    },
    gin: {
      'Romantic & Elegant': 20,
      'Mystery & Depth': 15,
      'Playful & Fun': 10
    },
    tequila: {
      'Playful & Fun': 20,
      'Tropical Escape': 15,
      'Party Crowd-Pleasers': 15
    },
    rum: {
      'Tropical Escape': 20,
      'Party Crowd-Pleasers': 15,
      'Cozy & Comforting': 10
    },
    vodka: {
      'Late-Night Energy': 20,
      'Playful & Fun': 15,
      'Party Crowd-Pleasers': 10
    }
  };

  return affinityMap[spirit]?.[mood] || 0;
}

/**
 * Helper: Get flavor-mood affinity boost
 */
function getFlavorMoodAffinity(flavor: string, mood: string): number {
  const flavorMoodMap: Record<string, Record<string, number>> = {
    citrus: {
      'Playful & Fun': 10,
      'Tropical Escape': 15,
      'Party Crowd-Pleasers': 10
    },
    sweet: {
      'Romantic & Elegant': 10,
      'After-Dinner Indulgence': 15,
      'Cozy & Comforting': 10
    },
    bitter: {
      'Bold & Serious': 15,
      'Mystery & Depth': 10
    },
    smoky: {
      'Bold & Serious': 20,
      'Mystery & Depth': 15,
      'Late-Night Energy': 10
    }
  };

  return flavorMoodMap[flavor]?.[mood] || 0;
}

/**
 * Helper functions - these would integrate with your existing data structures
 */
function getBrandsBySpirit(spirit: string, profile: UserPersonalizationProfile): string[] {
  // This would pull from your brands data based on spirit type and user preferences
  const brandMap: Record<string, string[]> = {
    whiskey: ['Buffalo Trace', 'Maker\'s Mark', 'Jameson', 'Glenfiddich'],
    gin: ['Hendrick\'s', 'Bombay Sapphire', 'Tanqueray', 'Aviation'],
    tequila: ['Patron', 'Don Julio', 'Herradura', 'Casamigos'],
    rum: ['Mount Gay', 'Appleton', 'Bacardi', 'Captain Morgan'],
    vodka: ['Tito\'s', 'Grey Goose', 'Belvedere', 'Stolichnaya']
  };

  return brandMap[spirit] || [];
}

function getCocktailsByMood(mood: string, profile: UserPersonalizationProfile): string[] {
  // This would filter your cocktail data by mood category and user preferences
  return ALL_COCKTAILS
    .filter(cocktail => {
      // Filter logic based on mood and user preferences
      return true; // Simplified for example
    })
    .slice(0, 10)
    .map(cocktail => cocktail.id);
}

/**
 * Export the main personalization functions
 */
export const personalizedExperience = {
  buildProfile: buildPersonalizationProfile,
  generateRecommendations: generatePersonalizedRecommendations,

  // Additional utility functions for real-time personalization
  updateProfileFromBehavior: (profile: UserPersonalizationProfile, behavior: any) => {
    // Update profile based on user interactions
    return profile;
  },

  scoreItem: (item: any, profile: UserPersonalizationProfile): number => {
    // Score any item (cocktail, lesson, brand) based on user profile
    return 0;
  }
};