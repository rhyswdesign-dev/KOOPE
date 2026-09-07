/**
 * Taste Match Service
 * Calculates how well a recipe matches a user's taste profile.
 * Used by KOOPE+ (basic %) and KOOPE PRO (full graph).
 */

import { TasteProfile, FlavorProfile } from '../types/userProfile';
import { Recipe, FlavorVector, computeFlavorVector } from '../types/recipe';

/**
 * Calculate Taste Match % between a user's taste profile and a recipe.
 * Returns 0-100 representing how well this recipe matches the user's palate.
 *
 * Algorithm: weighted dot product of user flavor/spirit weights and recipe attributes.
 */
/**
 * Difficulty label -> numeric complexity (0-1), for recipes that only carry
 * the label. Same three-point scale used elsewhere in the app
 * (onboarding's skill-level mapping, RecipePreferencesModal).
 */
const DIFFICULTY_TO_COMPLEXITY: Record<string, number> = {
  Easy: 0.2,
  Medium: 0.5,
  Hard: 0.8,
};

export function calculateTasteMatchPercent(userProfile: TasteProfile, recipe: Recipe): number {
  // The app has two recipe shapes that disagree on field names: recipes
  // loaded from Supabase (RecipesRepository) carry baseSpirit/complexity/abv
  // as real numbers; the local bundled catalog (data/cocktails.ts, ~94
  // entries) uses `base` (not baseSpirit) and has no complexity/abv at all —
  // only a `difficulty` label. Reading the missing fields directly used to
  // silently poison the whole score to NaN (Math.abs(undefined - x) = NaN,
  // and NaN propagates through every + after it), which made sorting by
  // score a no-op — recipes came back in their original array order, not
  // ranked by taste at all. This fell back to a neutral/derived value
  // instead, for every field, so both recipe shapes score for real.
  const anyRecipe = recipe as any;
  const baseSpirit = recipe.baseSpirit ?? anyRecipe.base;
  const complexity =
    typeof recipe.complexity === 'number'
      ? recipe.complexity
      : (DIFFICULTY_TO_COMPLEXITY[anyRecipe.difficulty] ?? 0.5);
  const abv = typeof recipe.abv === 'number' ? recipe.abv : 0;

  let score = 0;
  let maxScore = 0;

  // 1. Flavor match (40% of total score)
  const flavorWeight = 40;
  const recipeVector = recipe.flavorVector ?? computeFlavorVector(recipe.ingredients);
  const flavorScore = calculateFlavorDotProduct(userProfile.flavorWeights, recipeVector);
  score += flavorScore * flavorWeight;
  maxScore += flavorWeight;

  // 2. Spirit match (30% of total score)
  const spiritWeight = 30;
  if (
    baseSpirit &&
    userProfile.spiritWeights[baseSpirit as keyof typeof userProfile.spiritWeights] !== undefined
  ) {
    score +=
      userProfile.spiritWeights[baseSpirit as keyof typeof userProfile.spiritWeights] *
      spiritWeight;
  } else {
    // No base spirit or unknown — give neutral score
    score += 0.5 * spiritWeight;
  }
  maxScore += spiritWeight;

  // 3. Complexity match (15% of total score)
  const complexityWeight = 15;
  const complexityDiff = Math.abs(complexity - userProfile.preferredComplexity);
  const complexityScore = 1 - complexityDiff; // 1 = perfect match, 0 = opposite
  score += complexityScore * complexityWeight;
  maxScore += complexityWeight;

  // 4. ABV match (15% of total score)
  const abvWeight = 15;
  const abvScore = calculateABVMatchScore(abv, userProfile.preferredABV);
  score += abvScore * abvWeight;
  maxScore += abvWeight;

  // Normalize to 0-100
  const rawPercent = maxScore > 0 ? (score / maxScore) * 100 : 50;

  // Clamp and round
  return Math.round(Math.max(0, Math.min(100, rawPercent)));
}

/**
 * Dot product of user flavor weights and recipe flavor vector.
 * Both are Record<FlavorProfile, number> with values 0-1.
 * Returns 0-1 representing flavor alignment.
 */
function calculateFlavorDotProduct(
  userWeights: Record<FlavorProfile, number>,
  recipeVector: FlavorVector,
): number {
  const allFlavors: FlavorProfile[] = [
    'citrus',
    'herbal',
    'bitter',
    'sweet',
    'smoky',
    'floral',
    'spiced',
  ];

  let dotProduct = 0;
  let userMagnitude = 0;
  let recipeMagnitude = 0;

  for (const flavor of allFlavors) {
    const userVal = userWeights[flavor] ?? 0;
    const recipeVal = recipeVector[flavor] ?? 0;

    dotProduct += userVal * recipeVal;
    userMagnitude += userVal * userVal;
    recipeMagnitude += recipeVal * recipeVal;
  }

  // Cosine similarity: dot(a,b) / (|a| * |b|)
  const magnitude = Math.sqrt(userMagnitude) * Math.sqrt(recipeMagnitude);
  if (magnitude === 0) return 0.5; // No data — neutral

  return dotProduct / magnitude;
}

/**
 * Score how well a recipe's ABV matches user's preferred range.
 * Returns 0-1 (1 = within range, 0 = far outside).
 */
function calculateABVMatchScore(
  recipeABV: number,
  preferredRange: { min: number; max: number },
): number {
  if (recipeABV >= preferredRange.min && recipeABV <= preferredRange.max) {
    return 1; // Perfect match
  }

  // Distance from nearest boundary
  const distance =
    recipeABV < preferredRange.min
      ? preferredRange.min - recipeABV
      : recipeABV - preferredRange.max;

  // Decay: score drops by 0.1 per % ABV outside range
  return Math.max(0, 1 - distance * 0.1);
}

/**
 * Batch-compute Taste Match % for a list of recipes.
 * Efficient for feed rendering — compute once per feed load.
 */
export function batchCalculateTasteMatch(
  userProfile: TasteProfile,
  recipes: Recipe[],
): Map<string, number> {
  const results = new Map<string, number>();

  for (const recipe of recipes) {
    results.set(recipe.id, calculateTasteMatchPercent(userProfile, recipe));
  }

  return results;
}
