/**
 * Batch Calculator Service
 * Scales recipes for parties and events.
 *
 * KOOPE+: Party scaling calculator (simple multiplier)
 * KOOPE PRO: Batch optimizer (multi-recipe optimization + prep timeline)
 */

import { Recipe, Ingredient } from '../types/recipe';

export interface ScaledRecipe {
  recipe: Recipe;
  servings: number;
  scaleFactor: number;
  scaledIngredients: ScaledIngredient[];
}

export interface ScaledIngredient {
  name: string;
  originalAmount: string;
  scaledAmount: string;
  scaledNumeric: number; // Numeric value for shopping list aggregation
  unit: string;
  category?: string;
}

export interface BatchPlan {
  recipes: ScaledRecipe[];
  totalServings: number;
  guestCount: number;
  drinksPerGuest: number;
  /** Consolidated shopping list (aggregated across all recipes) */
  consolidatedIngredients: ConsolidatedIngredient[];
}

export interface ConsolidatedIngredient {
  name: string;
  totalAmount: number;
  unit: string;
  category?: string;
  /** Which recipes need this ingredient */
  usedInRecipes: string[];
}

/**
 * Scale a single recipe for a given number of servings.
 * Used by KOOPE+ party scaling calculator.
 */
export function scaleRecipe(recipe: Recipe, targetServings: number): ScaledRecipe {
  const scaleFactor = targetServings / (recipe.servings || 1);

  const scaledIngredients = recipe.ingredients.map(ingredient =>
    scaleIngredient(ingredient, scaleFactor)
  );

  return {
    recipe,
    servings: targetServings,
    scaleFactor,
    scaledIngredients,
  };
}

/**
 * Create a batch plan for a party.
 * Takes multiple recipes and a guest count, returns an optimized plan.
 * Used by KOOPE PRO batch optimizer.
 */
export function createBatchPlan(
  recipes: Recipe[],
  guestCount: number,
  drinksPerGuest: number = 3
): BatchPlan {
  const totalServings = guestCount * drinksPerGuest;
  const servingsPerRecipe = Math.ceil(totalServings / recipes.length);

  // Scale each recipe
  const scaledRecipes = recipes.map(recipe =>
    scaleRecipe(recipe, servingsPerRecipe)
  );

  // Consolidate ingredients across all recipes
  const ingredientMap = new Map<string, ConsolidatedIngredient>();

  for (const scaled of scaledRecipes) {
    for (const ingredient of scaled.scaledIngredients) {
      const key = normalizeIngredientKey(ingredient.name);
      const existing = ingredientMap.get(key);

      if (existing) {
        existing.totalAmount += ingredient.scaledNumeric;
        if (!existing.usedInRecipes.includes(scaled.recipe.title)) {
          existing.usedInRecipes.push(scaled.recipe.title);
        }
      } else {
        ingredientMap.set(key, {
          name: ingredient.name,
          totalAmount: ingredient.scaledNumeric,
          unit: ingredient.unit,
          category: ingredient.category,
          usedInRecipes: [scaled.recipe.title],
        });
      }
    }
  }

  return {
    recipes: scaledRecipes,
    totalServings,
    guestCount,
    drinksPerGuest,
    consolidatedIngredients: Array.from(ingredientMap.values())
      .sort((a, b) => b.usedInRecipes.length - a.usedInRecipes.length),
  };
}

/**
 * Scale a single ingredient by a factor.
 */
function scaleIngredient(ingredient: Ingredient, scaleFactor: number): ScaledIngredient {
  const { numeric, unit } = parseAmount(ingredient.amount);
  const scaledNumeric = numeric * scaleFactor;

  return {
    name: ingredient.name,
    originalAmount: ingredient.amount,
    scaledAmount: formatAmount(scaledNumeric, unit),
    scaledNumeric,
    unit,
    category: ingredient.category,
  };
}

/**
 * Parse an amount string like "2 oz" or "1/2" into numeric + unit.
 */
function parseAmount(amount: string): { numeric: number; unit: string } {
  const trimmed = amount.trim();

  // Handle fractions like "1/2"
  const fractionMatch = trimmed.match(/^(\d+)\/(\d+)\s*(.*)/);
  if (fractionMatch) {
    const num = parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10);
    return { numeric: num, unit: fractionMatch[3].trim() || 'oz' };
  }

  // Handle mixed numbers like "1 1/2 oz"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)\s*(.*)/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const frac = parseInt(mixedMatch[2], 10) / parseInt(mixedMatch[3], 10);
    return { numeric: whole + frac, unit: mixedMatch[4].trim() || 'oz' };
  }

  // Handle simple "2 oz" or "3 dashes"
  const simpleMatch = trimmed.match(/^([\d.]+)\s*(.*)/);
  if (simpleMatch) {
    return {
      numeric: parseFloat(simpleMatch[1]),
      unit: simpleMatch[2].trim() || 'oz',
    };
  }

  // Fallback: treat as 1 of whatever it is
  return { numeric: 1, unit: trimmed };
}

/**
 * Format a numeric amount back to a display string.
 * Handles common fractions for readability.
 */
function formatAmount(numeric: number, unit: string): string {
  // Round to nearest 1/4 oz for cleaner display
  const rounded = Math.round(numeric * 4) / 4;

  // Common fractions
  const whole = Math.floor(rounded);
  const frac = rounded - whole;

  let fracStr = '';
  if (Math.abs(frac - 0.25) < 0.01) fracStr = '1/4';
  else if (Math.abs(frac - 0.5) < 0.01) fracStr = '1/2';
  else if (Math.abs(frac - 0.75) < 0.01) fracStr = '3/4';
  else if (Math.abs(frac - 0.33) < 0.05) fracStr = '1/3';
  else if (Math.abs(frac - 0.67) < 0.05) fracStr = '2/3';

  if (whole > 0 && fracStr) {
    return `${whole} ${fracStr} ${unit}`.trim();
  } else if (whole > 0) {
    return `${whole} ${unit}`.trim();
  } else if (fracStr) {
    return `${fracStr} ${unit}`.trim();
  }

  return `${rounded} ${unit}`.trim();
}

/**
 * Normalize an ingredient name for aggregation.
 * "Fresh Lime Juice" and "lime juice" should consolidate.
 */
function normalizeIngredientKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(fresh|freshly|squeezed)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}
