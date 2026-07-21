import { describe, it, expect } from 'vitest';
import { getPredictiveRecommendations, detectTimeOfDay, detectSeason } from '../predictiveEngine';
import { createDefaultUserProfile } from '../../types/userProfile';
import { initializeTasteGraph } from '../tasteGraphService';
import { buildTasteProfileFromPersonalization } from '../enhancedProfileFallback';

function makeRecipe(overrides: Record<string, any>) {
  return {
    id: 'r1',
    title: 'Test Recipe',
    description: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    ingredients: [],
    instructions: [],
    category: 'classic',
    difficulty: 'beginner',
    recipeType: 'cocktail',
    spiritsUsed: [],
    flavorProfiles: [],
    abv: 0,
    complexity: 0.5,
    preparationTime: 5,
    servings: 1,
    tools: [],
    tags: [],
    isPublic: true,
    ...overrides,
  };
}

function makeBottle(name: string) {
  return {
    id: `bottle-${name}`,
    userId: 'user-1',
    name,
    category: 'spirit',
    flavorTags: [],
    quantity: 'full',
    addedAt: new Date().toISOString(),
    scanCount: 1,
    isFavorite: false,
  };
}

describe('predictiveEngine.getPredictiveRecommendations — ingredient-shape robustness', () => {
  it('does not throw when a recipe ingredient is a plain string or an object missing `name` (regression: calculateScanBoost called `ing.name.toLowerCase()` directly, unlike every other ingredient-reading function in this file which goes through getIngredientName — this crashed once real DB-sourced ingredients started flowing through predictiveEngine via tonightsPickService)', () => {
    const userProfile = createDefaultUserProfile('user-1');
    const tasteGraph = initializeTasteGraph(buildTasteProfileFromPersonalization({}));

    const recipes = [
      makeRecipe({ id: 'string-ingredient', ingredients: ['Just a string ingredient'] }),
      makeRecipe({ id: 'nameless-object', ingredients: [{ amount: '2 oz' }] }), // no `name` field
      makeRecipe({ id: 'normal', ingredients: [{ name: 'Gin', amount: '2 oz' }] }),
    ];

    expect(() =>
      getPredictiveRecommendations(
        recipes as any,
        userProfile,
        tasteGraph,
        {
          timeOfDay: detectTimeOfDay(),
          season: detectSeason(),
          inventory: [makeBottle('Gin') as any],
          recentScans: [makeBottle('Gin') as any],
        },
        recipes.length,
      ),
    ).not.toThrow();
  });
});
