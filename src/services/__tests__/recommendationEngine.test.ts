// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { RecommendationEngine } from '../recommendationEngine';
import type { EnhancedUserProfile } from '../../types/userProfile';
import type { Recipe } from '../../types/recipe';

function createBaseProfile(): EnhancedUserProfile {
  return {
    id: 'user_1',
    createdAt: new Date(),
    lastActiveAt: new Date(),
    experienceLevel: 'occasionally',
    techniqueConfidence: 'somewhat',
    skillLevel: 'beginner',
    makingFrequency: 'weekly',
    outingFrequency: 'weekly',
    outingPriorities: [],
    spiritPreferences: ['whiskey'],
    favoriteSpirit: 'whiskey',
    alcoholPreference: 'alcoholic',
    avoidsAlcohol: false,
    flavorProfiles: ['bitter'],
    learningGoals: [],
    availableTools: ['jigger', 'barspoon'],
    preferredSessionMinutes: 5,
    preferredABVRange: { min: 15, max: 45 },
    track: 'alcoholic',
    level: 1,
    xp: 0,
    streak: 0,
    longestStreak: 0,
    lives: 5,
    badges: [],
    savedRecipes: [],
    createdRecipes: [],
    favoriteRecipes: [],
    dislikedRecipes: [],
    consent: {
      analytics: true,
      personalization: true,
      date: Date.now(),
    },
  };
}

function createRecipe(): Recipe {
  return {
    id: 'r1',
    title: 'Negroni',
    description: 'Classic bitter cocktail',
    ingredients: [
      { name: 'Campari', amount: '1 oz' },
      { name: 'Sweet Vermouth', amount: '1 oz' },
      { name: 'Bourbon', amount: '1 oz' },
    ],
    instructions: ['Stir with ice', 'Strain into rocks glass'],
    difficulty: 'beginner',
    spiritsUsed: ['whiskey'],
    baseSpirit: 'whiskey',
    flavorProfiles: ['bitter'],
    preparationTime: 3,
    tools: ['barspoon'],
    tags: [],
    abv: 24,
  } as Recipe;
}

describe('RecommendationEngine completion signals', () => {
  it('boosts score when recent completion details match recipe spirit/ingredients', () => {
    const recipe = createRecipe();
    const plainProfile = createBaseProfile();

    const enrichedProfile = createBaseProfile();
    enrichedProfile.interactionHistory = {
      viewedRecipes: [],
      savedRecipes: [],
      searchQueries: [],
      lastUpdated: new Date(),
      completedRecipes: [
        {
          recipeId: 'old-fashioned',
          timestamp: new Date(),
          rating: 5,
          completionDetails: {
            ingredientBrands: [
              { ingredient: 'Rye Whiskey', brandUsed: 'Bulleit Rye' },
              { ingredient: 'Campari', brandUsed: 'Campari' },
            ],
            substitutions: 'Used rye instead of bourbon',
          },
        },
      ],
    };

    const withoutCompletion = RecommendationEngine.calculateScore(recipe, plainProfile);
    const withCompletion = RecommendationEngine.calculateScore(recipe, enrichedProfile);

    expect(withCompletion.score).toBeGreaterThan(withoutCompletion.score);
    expect(withCompletion.reasons.some((reason) => reason.includes('high ratings'))).toBe(true);
  });
});
