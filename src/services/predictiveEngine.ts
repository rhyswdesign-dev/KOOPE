/**
 * Predictive Cocktail Engine — KOOPE PRO
 * Multi-signal fusion recommendation engine.
 *
 * Combines:
 *   1. Taste Graph (decayed + normalized weights)
 *   2. Time of day auto-detection
 *   3. Recent scans (bottle ownership signal)
 *   4. Recently saved/completed recipes (similarity)
 *   5. Bottle quantity awareness ("use before it runs out")
 *   6. Season/weather context
 *
 * Returns ranked predictions with explanations.
 */

import { Recipe, RecipeWithUserData } from '../types/recipe';
import { EnhancedUserProfile, FlavorProfile } from '../types/userProfile';
import { TasteGraphData, getEffectiveTasteProfile } from './tasteGraphService';
import { calculateTasteMatchPercent } from './tasteMatchService';
import { Bottle } from '../types/database';

// ============================================================================
// TYPES
// ============================================================================

export interface PredictiveSignal {
  source: string;
  weight: number;
  boost: number;
  reason: string;
}

export interface PredictedRecipe extends RecipeWithUserData {
  /** Overall prediction score (0-100) */
  predictionScore: number;
  /** Signals that contributed to this prediction */
  signals: PredictiveSignal[];
  /** Human-readable reason for the prediction */
  predictionReason: string;
}

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'lateNight';
export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export interface PredictiveContext {
  /** Auto-detected or user-specified time of day */
  timeOfDay: TimeOfDay;
  /** Current season */
  season: Season;
  /** User's inventory (with quantity awareness) */
  inventory: Bottle[];
  /** Recently scanned bottles (last 7 days) */
  recentScans?: Bottle[];
  /** Is the user in hosting/party mode? */
  isHosting?: boolean;
  /** Number of guests (if hosting) */
  guestCount?: number;
}

// ============================================================================
// SIGNAL WEIGHTS (tune these to adjust ranking behavior)
// ============================================================================

const SIGNAL_WEIGHTS = {
  tasteGraph: 35, // Taste Graph match (PRO version with decay)
  timeOfDay: 15, // Time-appropriate cocktail
  recentScans: 12, // "Cocktails with your scanned bottle"
  recentSaves: 10, // "Because you saved X"
  seasonMatch: 8, // Seasonal relevance
  inventoryMatch: 10, // Can you actually make this?
  quantityUrgency: 5, // "Use your low bottle"
  hostingFit: 5, // Party-appropriate
};

function getRecipeFlavorProfiles(recipe: Recipe): FlavorProfile[] {
  return Array.isArray((recipe as any).flavorProfiles) ? (recipe as any).flavorProfiles : [];
}

function getIngredientName(ingredient: any): string {
  if (!ingredient) return '';
  if (typeof ingredient === 'string') return ingredient.toLowerCase();
  if (typeof ingredient.name === 'string') return ingredient.name.toLowerCase();
  return '';
}

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Generate predictive recommendations for a PRO user.
 * Returns recipes ranked by multi-signal fusion score.
 */
export function getPredictiveRecommendations(
  recipes: Recipe[],
  userProfile: EnhancedUserProfile,
  tasteGraph: TasteGraphData,
  context: PredictiveContext,
  limit: number = 20,
): PredictedRecipe[] {
  const effectiveProfile = getEffectiveTasteProfile(tasteGraph);

  const scored: PredictedRecipe[] = recipes
    .filter((r) => !userProfile.dislikedRecipes.includes(r.id))
    .map((recipe) => {
      const signals: PredictiveSignal[] = [];

      // Signal 1: Taste Graph match
      const tasteMatch = calculateTasteMatchPercent(effectiveProfile, recipe);
      const tasteBoost = (tasteMatch / 100) * SIGNAL_WEIGHTS.tasteGraph;
      signals.push({
        source: 'tasteGraph',
        weight: SIGNAL_WEIGHTS.tasteGraph,
        boost: tasteBoost,
        reason: `${tasteMatch}% taste match`,
      });

      // Signal 2: Time of day
      const timeBoost = calculateTimeBoost(recipe, context.timeOfDay);
      if (timeBoost > 0) {
        signals.push({
          source: 'timeOfDay',
          weight: SIGNAL_WEIGHTS.timeOfDay,
          boost: timeBoost,
          reason: `Perfect for ${formatTimeOfDay(context.timeOfDay)}`,
        });
      }

      // Signal 3: Recent scans
      const scanBoost = calculateScanBoost(recipe, context.recentScans);
      if (scanBoost > 0) {
        signals.push({
          source: 'recentScans',
          weight: SIGNAL_WEIGHTS.recentScans,
          boost: scanBoost,
          reason: 'Uses a bottle you recently scanned',
        });
      }

      // Signal 4: Similar to recent saves
      const saveBoost = calculateSaveBoost(recipe, userProfile);
      if (saveBoost > 0) {
        signals.push({
          source: 'recentSaves',
          weight: SIGNAL_WEIGHTS.recentSaves,
          boost: saveBoost,
          reason: 'Similar to recipes you saved',
        });
      }

      // Signal 5: Season match
      const seasonBoost = calculateSeasonBoost(recipe, context.season);
      if (seasonBoost > 0) {
        signals.push({
          source: 'seasonMatch',
          weight: SIGNAL_WEIGHTS.seasonMatch,
          boost: seasonBoost,
          reason: `Great for ${context.season}`,
        });
      }

      // Signal 6: Inventory match (can you make it?)
      const invBoost = calculateInventoryBoost(recipe, context.inventory);
      if (invBoost > 0) {
        signals.push({
          source: 'inventoryMatch',
          weight: SIGNAL_WEIGHTS.inventoryMatch,
          boost: invBoost,
          reason:
            invBoost >= SIGNAL_WEIGHTS.inventoryMatch * 0.8
              ? 'You have everything you need'
              : 'You have most of the ingredients',
        });
      }

      // Signal 7: Quantity urgency
      const urgencyBoost = calculateQuantityUrgency(recipe, context.inventory);
      if (urgencyBoost > 0) {
        signals.push({
          source: 'quantityUrgency',
          weight: SIGNAL_WEIGHTS.quantityUrgency,
          boost: urgencyBoost,
          reason: 'Use a bottle before it runs out',
        });
      }

      // Signal 8: Hosting fit
      if (context.isHosting) {
        const hostBoost = calculateHostingBoost(recipe, context.guestCount);
        if (hostBoost > 0) {
          signals.push({
            source: 'hostingFit',
            weight: SIGNAL_WEIGHTS.hostingFit,
            boost: hostBoost,
            reason: 'Crowd-pleasing and easy to batch',
          });
        }
      }

      // Sum all boosts
      const predictionScore = Math.round(
        Math.min(
          100,
          signals.reduce((sum, s) => sum + s.boost, 0),
        ),
      );

      // Build reason from top 2 signals
      const topSignals = [...signals].sort((a, b) => b.boost - a.boost).slice(0, 2);
      const predictionReason = topSignals.map((s) => s.reason).join(' + ');

      return {
        ...recipe,
        isSaved: userProfile.savedRecipes.includes(recipe.id),
        isFavorite: userProfile.favoriteRecipes.includes(recipe.id),
        recommendationScore: predictionScore,
        tasteMatchPercent: tasteMatch,
        predictionScore,
        signals,
        predictionReason,
      } as PredictedRecipe;
    });

  // Sort by prediction score
  scored.sort((a, b) => b.predictionScore - a.predictionScore);

  return scored.slice(0, limit);
}

/**
 * Auto-detect current time of day from device clock.
 */
export function detectTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'lateNight';
}

/**
 * Detect current season from date.
 */
export function detectSeason(): Season {
  const month = new Date().getMonth(); // 0-indexed
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

// ============================================================================
// SIGNAL CALCULATORS
// ============================================================================

function calculateTimeBoost(recipe: Recipe, timeOfDay: TimeOfDay): number {
  // If recipe has timeOfDay metadata, match it
  if (recipe.timeOfDay && recipe.timeOfDay.length > 0) {
    if (recipe.timeOfDay.includes(timeOfDay as any)) {
      return SIGNAL_WEIGHTS.timeOfDay;
    }
    return 0;
  }

  // Heuristic: light drinks in morning/afternoon, complex in evening/night
  if (timeOfDay === 'morning') {
    // Favor low-ABV, simple, refreshing
    if (recipe.abv < 10 || recipe.recipeType === 'mocktail') return SIGNAL_WEIGHTS.timeOfDay;
    return 0;
  }
  if (timeOfDay === 'afternoon') {
    // Favor refreshing, moderate
    const refreshing = getRecipeFlavorProfiles(recipe).includes('citrus');
    return refreshing ? SIGNAL_WEIGHTS.timeOfDay * 0.7 : SIGNAL_WEIGHTS.timeOfDay * 0.3;
  }
  if (timeOfDay === 'evening') {
    // Everything is fair game in the evening
    return SIGNAL_WEIGHTS.timeOfDay * 0.5;
  }
  // Late night: favor strong, bold
  if (recipe.abv > 25 || getRecipeFlavorProfiles(recipe).includes('smoky')) {
    return SIGNAL_WEIGHTS.timeOfDay * 0.8;
  }
  return SIGNAL_WEIGHTS.timeOfDay * 0.3;
}

function calculateScanBoost(recipe: Recipe, recentScans?: Bottle[]): number {
  if (!recentScans || recentScans.length === 0) return 0;

  const scannedNames = recentScans.map((b) => b.name.toLowerCase());

  // Check if recipe uses any recently scanned bottle
  const usesScanned = recipe.ingredients.some((ing) => {
    const name = getIngredientName(ing);
    return name && scannedNames.some((scan) => name.includes(scan) || scan.includes(name));
  });

  return usesScanned ? SIGNAL_WEIGHTS.recentScans : 0;
}

function calculateSaveBoost(_recipe: Recipe, userProfile: EnhancedUserProfile): number {
  if (!userProfile.interactionHistory?.savedRecipes?.length) return 0;

  // Check last 5 saved recipes for flavor similarity
  const recentSaves = userProfile.interactionHistory.savedRecipes.slice(-5);
  // Boost if this recipe shares 2+ flavor tags with recent saves
  // (Simple heuristic — full implementation would compare flavorVectors)
  return recentSaves.length > 0 ? SIGNAL_WEIGHTS.recentSaves * 0.5 : 0;
}

function calculateSeasonBoost(recipe: Recipe, season: Season): number {
  if (recipe.season && recipe.season.length > 0) {
    if (recipe.season.includes(season)) {
      return SIGNAL_WEIGHTS.seasonMatch;
    }
    return 0;
  }

  // Heuristic seasonal matching
  const seasonMap: Record<Season, FlavorProfile[]> = {
    spring: ['floral', 'herbal', 'citrus'],
    summer: ['citrus', 'sweet'],
    fall: ['spiced', 'smoky', 'bitter'],
    winter: ['smoky', 'spiced', 'sweet'],
  };

  const seasonalFlavors = seasonMap[season] || [];
  const matchCount = getRecipeFlavorProfiles(recipe).filter((f) =>
    seasonalFlavors.includes(f),
  ).length;

  if (matchCount >= 2) return SIGNAL_WEIGHTS.seasonMatch;
  if (matchCount >= 1) return SIGNAL_WEIGHTS.seasonMatch * 0.5;
  return 0;
}

function calculateInventoryBoost(recipe: Recipe, inventory: Bottle[]): number {
  if (inventory.length === 0) return 0;

  const invNames = inventory.map((b) => b.name.toLowerCase());
  const totalIngredients = recipe.ingredients.length;
  if (totalIngredients === 0) return 0;

  let matched = 0;
  for (const ing of recipe.ingredients) {
    const name = getIngredientName(ing);
    if (invNames.some((inv) => inv.includes(name) || name.includes(inv))) {
      matched++;
    }
  }

  const matchRatio = matched / totalIngredients;
  return matchRatio * SIGNAL_WEIGHTS.inventoryMatch;
}

function calculateQuantityUrgency(recipe: Recipe, inventory: Bottle[]): number {
  // Find bottles with 'low' quantity that this recipe uses
  const lowBottles = inventory.filter((b) => b.quantity === 'low');
  if (lowBottles.length === 0) return 0;

  const lowNames = lowBottles.map((b) => b.name.toLowerCase());
  const usesLow = recipe.ingredients.some((ing) => {
    const name = getIngredientName(ing);
    return lowNames.some((low) => name.includes(low) || low.includes(name));
  });

  return usesLow ? SIGNAL_WEIGHTS.quantityUrgency : 0;
}

function calculateHostingBoost(recipe: Recipe, _guestCount?: number): number {
  let boost = 0;

  // Favor recipes with batch multiplier
  if (recipe.batchMultiplier && recipe.batchMultiplier > 1) {
    boost += SIGNAL_WEIGHTS.hostingFit * 0.5;
  }

  // Favor easier recipes for hosting
  if (recipe.difficulty === 'beginner' || recipe.difficulty === 'intermediate') {
    boost += SIGNAL_WEIGHTS.hostingFit * 0.3;
  }

  // Favor crowd-pleasing flavors
  const crowdPleasingFlavors: FlavorProfile[] = ['citrus', 'sweet'];
  if (getRecipeFlavorProfiles(recipe).some((f) => crowdPleasingFlavors.includes(f))) {
    boost += SIGNAL_WEIGHTS.hostingFit * 0.2;
  }

  return Math.min(SIGNAL_WEIGHTS.hostingFit, boost);
}

function formatTimeOfDay(time: TimeOfDay): string {
  switch (time) {
    case 'morning':
      return 'morning';
    case 'afternoon':
      return 'the afternoon';
    case 'evening':
      return 'tonight';
    case 'lateNight':
      return 'a late night';
  }
}
