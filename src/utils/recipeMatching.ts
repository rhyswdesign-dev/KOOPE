/**
 * Recipe Matching Utilities
 * Helps match user inventory with cocktail recipes
 */

import type { UserInventoryItem } from '../types/database';

export interface RecipeMatch {
  matchPercentage: number;
  matchedIngredients: string[];
  missingIngredients: string[];
  canMake: boolean; // 100% match
  almostCanMake: boolean; // 80%+ match
}

/**
 * Parse ingredients from a cocktail's ingredients string
 * Handles common formats:
 * - "2 oz vodka, 1 oz lime juice, simple syrup"
 * - "vodka|lime juice|simple syrup"
 */
export function parseIngredients(ingredientsString: string): string[] {
  if (!ingredientsString) return [];

  // Split by comma or pipe
  const separator = ingredientsString.includes('|') ? '|' : ',';
  const ingredients = ingredientsString.split(separator);

  return ingredients
    .map(ing => {
      // Remove quantities (e.g., "2 oz", "1/2", etc.)
      return ing
        .replace(/^\d+(\.\d+)?\s*(oz|ml|tbsp|tsp|dash|drop|splash)?\s*/i, '')
        .replace(/^\d+\/\d+\s*/i, '')
        .trim()
        .toLowerCase();
    })
    .filter(ing => ing.length > 0);
}

/**
 * Normalize ingredient name for display/storage (Title Case)
 * Use this when SAVING to inventory
 * Examples: "ginger beer" → "Ginger Beer", "VODKA" → "Vodka"
 */
export function formatIngredientName(ingredient: string): string {
  // Trim whitespace, normalize spaces, convert to lowercase first
  const cleaned = ingredient.trim().replace(/\s+/g, ' ').toLowerCase();

  // Convert to Title Case (capitalize first letter of each word)
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Normalize ingredient name for matching (lowercase)
 * Use this when COMPARING ingredients
 * Handles common variations and synonyms
 */
export function normalizeIngredient(ingredient: string): string {
  // Guard against undefined/null ingredients
  if (!ingredient) return '';

  // Trim whitespace and convert to lowercase
  const normalized = ingredient.toLowerCase().trim().replace(/\s+/g, ' ');

  // Common synonyms/variations (NOT different items!)
  const synonyms: Record<string, string> = {
    'simple syrup': 'simple syrup',
    'sugar syrup': 'simple syrup',
    'lime juice': 'lime juice',
    'fresh lime juice': 'lime juice',
    'lemon juice': 'lemon juice',
    'fresh lemon juice': 'lemon juice',
    'triple sec': 'triple sec',
    'cointreau': 'triple sec',
    'grand marnier': 'triple sec',
    'club soda': 'soda water',
    'soda water': 'soda water',
    'sparkling water': 'soda water',
    // NOTE: Ginger Ale and Ginger Beer are DIFFERENT - removed synonym
  };

  return synonyms[normalized] || normalized;
}

/**
 * Check if user has an ingredient (fuzzy matching)
 */
export function hasIngredient(
  userInventory: UserInventoryItem[],
  recipeIngredient: string
): boolean {
  const normalizedRecipe = normalizeIngredient(recipeIngredient);

  const extractMatchAlias = (notes?: string | null): string => {
    if (!notes) return '';
    const match = notes.match(/match_as=([^\n;]+)/i);
    return normalizeIngredient(match?.[1] || '');
  };

  const hasIt = userInventory.some(item => {
    const normalizedItem = normalizeIngredient(item.item_name);
    const normalizedSubcategory = normalizeIngredient(item.subcategory || '');
    const normalizedCategory = normalizeIngredient(item.category || '');
    const normalizedAlias = extractMatchAlias(item.notes);

    // Exact match
    if (normalizedItem === normalizedRecipe) {
      if (__DEV__) {
        console.log(`✓ EXACT MATCH: "${item.item_name}" === "${recipeIngredient}"`);
      }
      return true;
    }

    // Partial match (e.g., "vodka" matches "grey goose vodka")
    if (normalizedItem.includes(normalizedRecipe)) {
      if (__DEV__) {
        console.log(`✓ PARTIAL MATCH: "${item.item_name}" includes "${recipeIngredient}"`);
      }
      return true;
    }
    if (normalizedRecipe.includes(normalizedItem)) {
      if (__DEV__) {
        console.log(`✓ PARTIAL MATCH: "${recipeIngredient}" includes "${item.item_name}"`);
      }
      return true;
    }

    // Match against structured manual-entry metadata
    if (
      normalizedSubcategory === normalizedRecipe ||
      normalizedCategory === normalizedRecipe ||
      normalizedAlias === normalizedRecipe
    ) {
      if (__DEV__) {
        console.log(`✓ META MATCH: "${recipeIngredient}" matched by category/subcategory/alias`);
      }
      return true;
    }

    return false;
  });

  if (__DEV__ && !hasIt) {
    console.log(`✗ NO MATCH for "${recipeIngredient}" in inventory of ${userInventory.length} items`);
  }

  return hasIt;
}

/**
 * Calculate how well user's inventory matches a recipe
 */
export function matchRecipe(
  recipeIngredients: string | any[],
  userInventory: UserInventoryItem[]
): RecipeMatch {
  // Handle both string format and array format
  let ingredients: string[];

  if (typeof recipeIngredients === 'string') {
    // String format: "2 oz vodka, 1 oz lime juice"
    ingredients = parseIngredients(recipeIngredients);
  } else if (Array.isArray(recipeIngredients)) {
    // Array format: [{name: "2 oz Vodka"}, {name: "1 oz Lime Juice"}]
    ingredients = recipeIngredients
      .map(ing => typeof ing === 'string' ? ing : ing.name)
      .filter(Boolean)
      .map(ing => {
        // Remove quantities from array format ingredients
        return ing
          .replace(/^\d+(\.\d+)?\s*(oz|ml|tbsp|tsp|dash|drop|splash)?\s*/i, '')
          .replace(/^\d+\/\d+\s*/i, '')
          .trim()
          .toLowerCase();
      })
      .filter(ing => ing.length > 0);
  } else {
    ingredients = [];
  }

  if (ingredients.length === 0) {
    return {
      matchPercentage: 0,
      matchedIngredients: [],
      missingIngredients: [],
      canMake: false,
      almostCanMake: false,
    };
  }

  const matched: string[] = [];
  const missing: string[] = [];

  ingredients.forEach(ingredient => {
    if (hasIngredient(userInventory, ingredient)) {
      matched.push(ingredient);
    } else {
      missing.push(ingredient);
    }
  });

  const matchPercentage = (matched.length / ingredients.length) * 100;

  return {
    matchPercentage,
    matchedIngredients: matched,
    missingIngredients: missing,
    canMake: matchPercentage === 100,
    almostCanMake: matchPercentage >= 80,
  };
}

/**
 * Get a user-friendly message for recipe match status
 */
export function getMatchMessage(match: RecipeMatch): string {
  if (match.canMake) {
    return "You can make this!";
  }

  if (match.almostCanMake) {
    const missingCount = match.missingIngredients.length;
    if (missingCount === 1) {
      return `Missing 1 ingredient: ${match.missingIngredients[0]}`;
    } else {
      return `Missing ${missingCount} ingredients`;
    }
  }

  return `Missing ${match.missingIngredients.length} ingredients`;
}

/**
 * Sort cocktails by match percentage (best matches first)
 */
export function sortByMatch(
  cocktails: any[],
  userInventory: UserInventoryItem[]
): Array<any & { match: RecipeMatch }> {
  return cocktails
    .map(cocktail => ({
      ...cocktail,
      match: matchRecipe(cocktail.ingredients, userInventory),
    }))
    .sort((a, b) => b.match.matchPercentage - a.match.matchPercentage);
}

/**
 * Filter cocktails to only show those that are 80%+ match
 */
export function filterAlmostMakeable(
  cocktails: any[],
  userInventory: UserInventoryItem[]
): Array<any & { match: RecipeMatch }> {
  return sortByMatch(cocktails, userInventory).filter(
    c => c.match.almostCanMake || c.match.canMake
  );
}
