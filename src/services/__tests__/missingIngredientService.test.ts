import { describe, it, expect } from 'vitest';
import { getTopIngredientsToBuy } from '../missingIngredientService';
import type { Recipe } from '../../types/recipe';
import type { Bottle } from '../../types/database';

function recipe(id: string, ingredientNames: string[]): Recipe {
  return {
    id,
    title: id,
    description: '',
    ingredients: ingredientNames.map((name) => ({ name, amount: '1 oz' })),
    instructions: [],
    difficulty: 'beginner',
    spiritsUsed: [],
    flavorProfiles: [],
    preparationTime: 3,
    tools: [],
    tags: [],
    abv: 20,
  } as Recipe;
}

function bottle(name: string): Bottle {
  return {
    id: name,
    userId: 'u1',
    name,
    category: 'spirit',
    flavorTags: [],
    quantity: 'full',
    addedAt: new Date().toISOString(),
    scanCount: 0,
    isFavorite: false,
  } as Bottle;
}

describe('getTopIngredientsToBuy (perf rewrite, 2026-07-27)', () => {
  it('unlocks a recipe missing exactly one ingredient', () => {
    const inventory = [bottle('gin'), bottle('sweet vermouth')];
    const recipes = [recipe('negroni', ['gin', 'sweet vermouth', 'campari'])];

    const results = getTopIngredientsToBuy(inventory, recipes, 10);

    expect(results.some((r) => r.ingredientName === 'campari')).toBe(true);
    const campari = results.find((r) => r.ingredientName === 'campari')!;
    expect(campari.unlockedRecipeIds).toEqual(['negroni']);
  });

  it('does not unlock a recipe missing two ingredients by adding only one of them', () => {
    const inventory = [bottle('gin')];
    const recipes = [recipe('negroni', ['gin', 'sweet vermouth', 'campari'])];

    const results = getTopIngredientsToBuy(inventory, recipes, 10);

    // Neither campari nor sweet vermouth alone completes this recipe —
    // both are still missing after adding just one.
    expect(results.some((r) => r.unlockedRecipeIds.includes('negroni'))).toBe(false);
  });

  it('already-makeable recipes are excluded from consideration entirely', () => {
    const inventory = [bottle('gin'), bottle('sweet vermouth'), bottle('campari')];
    const recipes = [recipe('negroni', ['gin', 'sweet vermouth', 'campari'])];

    const results = getTopIngredientsToBuy(inventory, recipes, 10);

    expect(results).toHaveLength(0);
  });

  it('ranks candidates by how many recipes they unlock, highest first', () => {
    const inventory = [bottle('gin'), bottle('lime')];
    const recipes = [
      recipe('gimlet', ['gin', 'lime', 'simple syrup']),
      recipe('tom-collins', ['gin', 'lime', 'simple syrup']),
      recipe('martini', ['gin', 'dry vermouth']),
    ];

    const results = getTopIngredientsToBuy(inventory, recipes, 10);

    expect(results[0].ingredientName).toBe('simple syrup');
    expect(results[0].unlockCount).toBe(2);
  });

  it('handles a larger catalog without the caller needing to know it is fast — a smoke test against the O(candidates × recipes × inventory) blowup this rewrite fixes', () => {
    const inventory = Array.from({ length: 30 }, (_, i) => bottle(`inventory-item-${i}`));
    const recipes = Array.from({ length: 150 }, (_, i) =>
      recipe(`recipe-${i}`, [`inventory-item-${i % 30}`, `missing-ingredient-${i % 20}`]),
    );

    const start = Date.now();
    const results = getTopIngredientsToBuy(inventory, recipes, 10);
    const elapsedMs = Date.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(elapsedMs).toBeLessThan(500);
  });
});
