/**
 * Missing Ingredient Service
 * Calculates what ingredients a user is missing for recipes,
 * how many cocktails an ingredient would unlock, and substitution suggestions.
 *
 * Core commerce intent layer for KOOPE+ "Add Missing Ingredients" feature.
 */

import { Recipe } from '../types/recipe';
import { Bottle } from '../types/database';

export interface MissingIngredientResult {
  /** Ingredients the user doesn't have */
  missing: string[];
  /** Number of missing ingredients */
  missingCount: number;
  /** Whether the user can make this recipe */
  canMake: boolean;
  /** What % of ingredients the user has (0-100) */
  matchPercent: number;
}

export interface IngredientUnlockInfo {
  /** The ingredient name */
  ingredientName: string;
  /** How many NEW cocktails become fully makeable by adding this ingredient */
  unlockCount: number;
  /** The recipe IDs that would be unlocked */
  unlockedRecipeIds: string[];
  /** The recipe titles for display */
  unlockedRecipeTitles: string[];
}

export interface SubstitutionSuggestion {
  /** Original ingredient in the recipe */
  original: string;
  /** Suggested substitute */
  substitute: string;
  /** How close the substitute is (0-1) */
  similarity: number;
}

/** Common ingredient substitutions */
const SUBSTITUTIONS: Record<string, string[]> = {
  'lime juice': ['lemon juice'],
  'lemon juice': ['lime juice'],
  'bourbon': ['rye whiskey', 'whiskey'],
  'rye whiskey': ['bourbon', 'whiskey'],
  'simple syrup': ['honey syrup', 'agave syrup', 'sugar'],
  'honey syrup': ['simple syrup', 'agave syrup'],
  'agave syrup': ['simple syrup', 'honey syrup'],
  'club soda': ['tonic water', 'soda water', 'sparkling water'],
  'tonic water': ['club soda', 'soda water'],
  'angostura bitters': ['aromatic bitters'],
  'orange bitters': ['angostura bitters'],
  'dry vermouth': ['blanc vermouth', 'lillet blanc'],
  'sweet vermouth': ['punt e mes', 'carpano antica'],
  'triple sec': ['cointreau', 'grand marnier', 'orange liqueur'],
  'cointreau': ['triple sec', 'grand marnier', 'orange liqueur'],
  'campari': ['aperol'],
  'aperol': ['campari'],
  'egg white': ['aquafaba'],
  'cream': ['coconut cream', 'half and half'],
};

/**
 * Check which ingredients are missing for a recipe given user's inventory.
 */
export function getMissingIngredients(
  recipe: Recipe,
  inventory: Bottle[]
): MissingIngredientResult {
  const inventoryNames = inventory.map(b => b.name.toLowerCase());

  const missing: string[] = [];

  for (const ingredient of recipe.ingredients) {
    const rawName = typeof ingredient === 'string' ? ingredient : ingredient?.name || '';
    const name = rawName.toLowerCase();

    const hasIt = inventoryNames.some(invName =>
      areIngredientsEquivalent(name, invName)
    );

    if (!hasIt) {
      missing.push(rawName);
    }
  }

  const totalIngredients = recipe.ingredients.length;

  return {
    missing,
    missingCount: missing.length,
    canMake: missing.length === 0,
    matchPercent: totalIngredients > 0
      ? Math.round(((totalIngredients - missing.length) / totalIngredients) * 100)
      : 0,
  };
}

/**
 * Calculate how many new cocktails an ingredient would unlock.
 * This is the key commerce driver — "Adding Campari unlocks 7 new cocktails."
 */
export function calculateUnlockCount(
  candidateIngredient: string,
  inventory: Bottle[],
  recipeLibrary: Recipe[]
): IngredientUnlockInfo {
  const candidateLower = candidateIngredient.toLowerCase();

  // Simulate adding the candidate to inventory
  const simulatedInventory: Bottle[] = [
    ...inventory,
    {
      id: 'simulated',
      userId: '',
      name: candidateIngredient,
      category: 'ingredient',
      flavorTags: [],
      quantity: 'full',
      addedAt: new Date().toISOString(),
      scanCount: 0,
      isFavorite: false,
    },
  ];

  const unlockedRecipeIds: string[] = [];
  const unlockedRecipeTitles: string[] = [];

  for (const recipe of recipeLibrary) {
    const withoutCandidate = getMissingIngredients(recipe, inventory);
    const withCandidate = getMissingIngredients(recipe, simulatedInventory);

    // This recipe was NOT makeable before, but IS makeable now
    if (!withoutCandidate.canMake && withCandidate.canMake) {
      unlockedRecipeIds.push(recipe.id);
      unlockedRecipeTitles.push(recipe.title);
    }
  }

  return {
    ingredientName: candidateIngredient,
    unlockCount: unlockedRecipeIds.length,
    unlockedRecipeIds,
    unlockedRecipeTitles,
  };
}

/**
 * Get the top ingredients to buy, ranked by how many cocktails they unlock.
 * This powers the "Optimize My Bar" suggestions and "Add Missing Ingredients" UI.
 */
export function getTopIngredientsToBuy(
  inventory: Bottle[],
  recipeLibrary: Recipe[],
  limit: number = 10
): IngredientUnlockInfo[] {
  // Collect all unique ingredient names across recipes that user doesn't have
  const candidateSet = new Set<string>();

  for (const recipe of recipeLibrary) {
    const result = getMissingIngredients(recipe, inventory);
    for (const missing of result.missing) {
      candidateSet.add(missing);
    }
  }

  // Calculate unlock count for each candidate
  const results: IngredientUnlockInfo[] = [];

  for (const candidate of candidateSet) {
    const info = calculateUnlockCount(candidate, inventory, recipeLibrary);
    if (info.unlockCount > 0) {
      results.push(info);
    }
  }

  // Sort by unlock count descending
  results.sort((a, b) => b.unlockCount - a.unlockCount);

  return results.slice(0, limit);
}

/**
 * Get substitution suggestions for missing ingredients.
 */
export function getSubstitutions(missingIngredient: string): SubstitutionSuggestion[] {
  const lower = missingIngredient.toLowerCase();

  // Direct lookup
  for (const [key, subs] of Object.entries(SUBSTITUTIONS)) {
    if (areIngredientsEquivalent(lower, key)) {
      return subs.map(sub => ({
        original: missingIngredient,
        substitute: sub,
        similarity: 0.8,
      }));
    }
  }

  return [];
}

/**
 * Fuzzy ingredient matching.
 * Handles cases like "bourbon whiskey" matching "bourbon",
 * or "fresh lime juice" matching "lime juice".
 */
function areIngredientsEquivalent(a: string, b: string): boolean {
  // Exact match
  if (a === b) return true;

  // Normalize: strip common modifiers
  const normalize = (s: string) =>
    s.replace(/\b(fresh|freshly squeezed|oz|ml|dash|dashes|splash|of|the|a)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

  const normA = normalize(a);
  const normB = normalize(b);

  if (normA === normB) return true;

  // Containment check (one contains the other)
  if (normA.includes(normB) || normB.includes(normA)) return true;

  return false;
}
