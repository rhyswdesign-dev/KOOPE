/**
 * Optimize My Bar — KOOPE PRO
 * Analyzes a user's inventory against the recipe library to:
 *   - Identify gaps (what categories are you missing?)
 *   - Rank purchases by impact (unlock count)
 *   - Score bar completeness
 *   - Suggest a "next 5 bottles" shopping plan
 *   - Identify underused bottles
 *
 * This is the premium intelligence that turns inventory data
 * into actionable purchasing guidance.
 */

import { Recipe } from '../types/recipe';
import { Bottle, BottleCategory } from '../types/database';
import {
  getMissingIngredients,
  getTopIngredientsToBuy,
  IngredientUnlockInfo,
} from './missingIngredientService';
import { FlavorProfile } from '../types/userProfile';

// ============================================================================
// TYPES
// ============================================================================

export interface BarOptimizationReport {
  /** Overall bar completeness (0-100) */
  completenessScore: number;
  /** How many recipes can the user make? */
  makeableRecipeCount: number;
  /** Total recipes analyzed */
  totalRecipes: number;
  /** Percentage of recipes that are makeable */
  makeablePercent: number;
  /** Category breakdown of current inventory */
  categoryBreakdown: CategoryAnalysis[];
  /** Identified gaps in the bar */
  gaps: BarGap[];
  /** Top ingredients to buy ranked by impact */
  topPurchases: IngredientUnlockInfo[];
  /** Suggested "next 5 bottles" plan */
  shoppingPlan: ShoppingPlanItem[];
  /** Bottles that haven't been used in any completed recipe */
  underusedBottles: UnderusedBottle[];
  /** Flavor coverage analysis */
  flavorCoverage: FlavorCoverageItem[];
}

export interface CategoryAnalysis {
  category: BottleCategory;
  displayName: string;
  count: number;
  /** How many of the "essential" items in this category the user has */
  essentialsCovered: number;
  /** Total essentials in this category */
  essentialsTotal: number;
  /** Category health: 'strong' | 'adequate' | 'weak' | 'missing' */
  health: 'strong' | 'adequate' | 'weak' | 'missing';
}

export interface BarGap {
  /** What's missing */
  category: string;
  /** Severity: how much this limits the user */
  severity: 'critical' | 'moderate' | 'minor';
  /** How many recipes this gap blocks */
  blockedRecipeCount: number;
  /** Suggested fix */
  suggestion: string;
}

export interface ShoppingPlanItem {
  /** Ingredient to buy */
  name: string;
  /** Why this is recommended */
  reason: string;
  /** How many new recipes this unlocks */
  unlockCount: number;
  /** Estimated price range */
  priceRange: string;
  /** Priority rank (1 = most impactful) */
  priority: number;
}

export interface UnderusedBottle {
  bottle: Bottle;
  /** How many recipes could use this bottle */
  recipeCount: number;
  /** Suggestion for using it */
  suggestion: string;
}

export interface FlavorCoverageItem {
  flavor: FlavorProfile;
  displayName: string;
  /** How many recipes matching this flavor the user can make */
  makeableCount: number;
  /** Total recipes with this flavor */
  totalCount: number;
  /** Coverage percentage */
  coveragePercent: number;
}

// ============================================================================
// ESSENTIAL INGREDIENTS DATABASE
// ============================================================================

const CATEGORY_ESSENTIALS: Record<BottleCategory, string[]> = {
  spirit: ['vodka', 'gin', 'bourbon', 'rum', 'tequila'],
  liqueur: ['triple sec', 'campari'],
  wine: ['sweet vermouth', 'dry vermouth'],
  mixer: ['tonic water', 'soda water', 'ginger beer'],
  bitters: ['angostura bitters', 'orange bitters'],
  syrup: ['simple syrup'],
  garnish: ['lemon', 'lime', 'orange', 'cherry'],
  ingredient: ['egg white'],
  other: [],
};

const CATEGORY_DISPLAY_NAMES: Record<BottleCategory, string> = {
  spirit: 'Spirits',
  liqueur: 'Liqueurs & Modifiers',
  wine: 'Wine',
  mixer: 'Mixers',
  bitters: 'Bitters',
  syrup: 'Syrups',
  garnish: 'Garnishes',
  ingredient: 'Other Ingredients',
  other: 'Other',
};

const PRICE_ESTIMATES: Record<string, string> = {
  spirit: '$20–$45',
  liqueur: '$15–$35',
  wine: '$15–$40',
  mixer: '$3–$8',
  bitters: '$8–$15',
  syrup: '$5–$12',
  garnish: '$2–$6',
  ingredient: '$3–$10',
  other: '$5–$20',
};

// ============================================================================
// CORE FUNCTION
// ============================================================================

/**
 * Generate a complete bar optimization report.
 * This is the main entry point for the "Optimize My Bar" PRO feature.
 */
export function generateOptimizationReport(
  inventory: Bottle[],
  recipeLibrary: Recipe[],
): BarOptimizationReport {
  // 1. Calculate makeability
  let makeableCount = 0;
  for (const recipe of recipeLibrary) {
    const result = getMissingIngredients(recipe, inventory);
    if (result.canMake) makeableCount++;
  }
  const makeablePercent =
    recipeLibrary.length > 0 ? Math.round((makeableCount / recipeLibrary.length) * 100) : 0;

  // 2. Category breakdown
  const categoryBreakdown = analyzeCategoryBreakdown(inventory);

  // 3. Identify gaps
  const gaps = identifyGaps(inventory, recipeLibrary);

  // 4. Top purchases (from missingIngredientService)
  const topPurchases = getTopIngredientsToBuy(inventory, recipeLibrary, 10);

  // 5. Shopping plan (top 5 with enriched data)
  const shoppingPlan = buildShoppingPlan(topPurchases.slice(0, 5), inventory);

  // 6. Underused bottles
  const underusedBottles = findUnderusedBottles(inventory, recipeLibrary);

  // 7. Flavor coverage
  const flavorCoverage = analyzeFlavorCoverage(inventory, recipeLibrary);

  // 8. Completeness score (weighted blend)
  const completenessScore = calculateCompletenessScore(makeablePercent, categoryBreakdown, gaps);

  return {
    completenessScore,
    makeableRecipeCount: makeableCount,
    totalRecipes: recipeLibrary.length,
    makeablePercent,
    categoryBreakdown,
    gaps,
    topPurchases,
    shoppingPlan,
    underusedBottles,
    flavorCoverage,
  };
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

function analyzeCategoryBreakdown(inventory: Bottle[]): CategoryAnalysis[] {
  const categories: BottleCategory[] = [
    'spirit',
    'liqueur',
    'wine',
    'mixer',
    'bitters',
    'syrup',
    'garnish',
    'ingredient',
  ];
  const invNames = inventory.map((b) => b.name.toLowerCase());

  return categories.map((category) => {
    const count = inventory.filter((b) => b.category === category).length;
    const essentials = CATEGORY_ESSENTIALS[category];
    const essentialsCovered = essentials.filter((e) =>
      invNames.some((inv) => inv.includes(e) || e.includes(inv)),
    ).length;

    let health: CategoryAnalysis['health'];
    if (essentials.length === 0) {
      health = count > 0 ? 'strong' : 'adequate';
    } else {
      const ratio = essentialsCovered / essentials.length;
      if (ratio >= 0.8) health = 'strong';
      else if (ratio >= 0.5) health = 'adequate';
      else if (ratio > 0) health = 'weak';
      else health = 'missing';
    }

    return {
      category,
      displayName: CATEGORY_DISPLAY_NAMES[category],
      count,
      essentialsCovered,
      essentialsTotal: essentials.length,
      health,
    };
  });
}

function identifyGaps(inventory: Bottle[], recipeLibrary: Recipe[]): BarGap[] {
  const gaps: BarGap[] = [];
  const invNames = inventory.map((b) => b.name.toLowerCase());

  // Check essential categories
  const categories: BottleCategory[] = ['spirit', 'liqueur', 'wine', 'bitters', 'syrup', 'garnish'];

  for (const category of categories) {
    const essentials = CATEGORY_ESSENTIALS[category];
    const missing = essentials.filter(
      (e) => !invNames.some((inv) => inv.includes(e) || e.includes(inv)),
    );

    if (missing.length === 0) continue;

    // Count how many recipes are blocked by missing items in this category
    let blockedCount = 0;
    for (const recipe of recipeLibrary) {
      const result = getMissingIngredients(recipe, inventory);
      if (!result.canMake) {
        const hasCategoryBlock = result.missing.some((m) => {
          const lower = m.toLowerCase();
          return missing.some((ess) => lower.includes(ess) || ess.includes(lower));
        });
        if (hasCategoryBlock) blockedCount++;
      }
    }

    const severity: BarGap['severity'] =
      blockedCount > recipeLibrary.length * 0.3
        ? 'critical'
        : blockedCount > recipeLibrary.length * 0.1
          ? 'moderate'
          : 'minor';

    gaps.push({
      category: CATEGORY_DISPLAY_NAMES[category],
      severity,
      blockedRecipeCount: blockedCount,
      suggestion: `Add ${missing.slice(0, 2).join(' and ')} to unlock ${blockedCount} more recipes`,
    });
  }

  // Sort by severity
  const severityOrder = { critical: 0, moderate: 1, minor: 2 };
  gaps.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return gaps;
}

function buildShoppingPlan(
  topPurchases: IngredientUnlockInfo[],
  _inventory: Bottle[],
): ShoppingPlanItem[] {
  return topPurchases.map((purchase, i) => {
    // Guess the category from the ingredient name
    const category = guessCategory(purchase.ingredientName);

    return {
      name: purchase.ingredientName,
      reason: `Unlocks ${purchase.unlockCount} new cocktail${purchase.unlockCount !== 1 ? 's' : ''}`,
      unlockCount: purchase.unlockCount,
      priceRange: PRICE_ESTIMATES[category] || '$10–$30',
      priority: i + 1,
    };
  });
}

function findUnderusedBottles(inventory: Bottle[], recipeLibrary: Recipe[]): UnderusedBottle[] {
  const underused: UnderusedBottle[] = [];

  for (const bottle of inventory) {
    const name = bottle.name.toLowerCase();

    // Count how many recipes use this bottle
    let recipeCount = 0;
    const matchingRecipes: string[] = [];

    for (const recipe of recipeLibrary) {
      const usesBottle = recipe.ingredients.some((ing) => {
        const ingName = (typeof ing === 'string' ? ing : (ing?.name ?? '')).toLowerCase();
        return ingName.includes(name) || name.includes(ingName);
      });
      if (usesBottle) {
        recipeCount++;
        if (matchingRecipes.length < 3) matchingRecipes.push(recipe.title);
      }
    }

    // If a bottle appears in very few recipes, it's underused
    if (recipeCount <= 2) {
      underused.push({
        bottle,
        recipeCount,
        suggestion:
          recipeCount === 0
            ? `${bottle.name} doesn't match any recipes in your library`
            : `Try ${matchingRecipes[0]} with your ${bottle.name}`,
      });
    }
  }

  // Sort: least used first
  underused.sort((a, b) => a.recipeCount - b.recipeCount);

  return underused.slice(0, 10);
}

function analyzeFlavorCoverage(inventory: Bottle[], recipeLibrary: Recipe[]): FlavorCoverageItem[] {
  const allFlavors: FlavorProfile[] = [
    'citrus',
    'herbal',
    'bitter',
    'sweet',
    'smoky',
    'floral',
    'spiced',
  ];
  const displayNames: Record<FlavorProfile, string> = {
    citrus: 'Citrus & Fresh',
    herbal: 'Herbal & Green',
    bitter: 'Bitter & Complex',
    sweet: 'Sweet & Fruity',
    smoky: 'Smoky & Bold',
    floral: 'Floral & Light',
    spiced: 'Spiced & Warm',
  };

  return allFlavors.map((flavor) => {
    const recipesWithFlavor = recipeLibrary.filter((r) => r.flavorProfiles.includes(flavor));
    let makeableCount = 0;

    for (const recipe of recipesWithFlavor) {
      const result = getMissingIngredients(recipe, inventory);
      if (result.canMake) makeableCount++;
    }

    return {
      flavor,
      displayName: displayNames[flavor],
      makeableCount,
      totalCount: recipesWithFlavor.length,
      coveragePercent:
        recipesWithFlavor.length > 0
          ? Math.round((makeableCount / recipesWithFlavor.length) * 100)
          : 0,
    };
  });
}

function calculateCompletenessScore(
  makeablePercent: number,
  categoryBreakdown: CategoryAnalysis[],
  gaps: BarGap[],
): number {
  let score = 0;

  // 40% weight: recipe makeability
  score += makeablePercent * 0.4;

  // 35% weight: category health
  const healthScores: Record<string, number> = { strong: 100, adequate: 70, weak: 40, missing: 0 };
  const avgHealth =
    categoryBreakdown.reduce((sum, cat) => sum + (healthScores[cat.health] || 50), 0) /
    categoryBreakdown.length;
  score += avgHealth * 0.35;

  // 25% weight: gap severity (inverse — fewer gaps = higher score)
  const criticalGaps = gaps.filter((g) => g.severity === 'critical').length;
  const moderateGaps = gaps.filter((g) => g.severity === 'moderate').length;
  const gapPenalty = criticalGaps * 20 + moderateGaps * 10;
  score += Math.max(0, 100 - gapPenalty) * 0.25;

  return Math.round(Math.max(0, Math.min(100, score)));
}

// ============================================================================
// HELPERS
// ============================================================================

function guessCategory(ingredientName: string): string {
  const lower = ingredientName.toLowerCase();
  if (/vodka|gin|rum|whiskey|bourbon|tequila|mezcal|brandy|cognac|scotch/i.test(lower))
    return 'spirit';
  if (/liqueur|triple sec|cointreau|campari|aperol|vermouth|amaretto/i.test(lower))
    return 'liqueur';
  if (/juice|tonic|soda|water|beer|cola/i.test(lower)) return 'mixer';
  if (/bitters/i.test(lower)) return 'bitters';
  if (/syrup|honey|agave|grenadine|orgeat/i.test(lower)) return 'syrup';
  if (/lemon|lime|orange|cherry|mint|olive|cucumber/i.test(lower)) return 'garnish';
  return 'ingredient';
}
