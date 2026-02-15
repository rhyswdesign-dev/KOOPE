/**
 * Hosting Planner Service — KOOPE PRO
 * Full party planning intelligence:
 *   - Guest-based menu generation (auto-pick recipes for crowd)
 *   - Prep timeline (ordered task list with time estimates)
 *   - Smart recipe selection (variety, crowd-pleasing, batch-friendly)
 *   - Inventory-aware planning (use what you have)
 *
 * Builds on top of batchCalculatorService (PLUS) with PRO intelligence.
 */

import { Recipe } from '../types/recipe';
import { Bottle } from '../types/database';
import { BatchPlan, ScaledRecipe, createBatchPlan } from './batchCalculatorService';
import { getMissingIngredients } from './missingIngredientService';

// ============================================================================
// TYPES
// ============================================================================

export interface HostingPlan {
  /** Event metadata */
  eventName: string;
  guestCount: number;
  drinksPerGuest: number;
  /** Selected recipes with batch scaling */
  batchPlan: BatchPlan;
  /** Menu summary for sharing */
  menuSummary: MenuSummary;
  /** Ordered prep timeline */
  prepTimeline: PrepStep[];
  /** What you need to buy */
  shoppingNeeded: ShoppingItem[];
  /** Estimated total prep time in minutes */
  totalPrepMinutes: number;
}

export interface MenuSummary {
  /** The menu as a shareable text block */
  displayText: string;
  /** Recipe count by category */
  recipesByCategory: { category: string; count: number }[];
  /** Flavor variety score (0-100, higher = more diverse) */
  flavorVariety: number;
  /** Does the menu cover non-drinkers? */
  hasNonAlcoholic: boolean;
}

export interface PrepStep {
  /** Step order (1-based) */
  order: number;
  /** Which recipe this step belongs to (null = general) */
  recipeName: string | null;
  /** The task to perform */
  task: string;
  /** When to do this relative to event start */
  timing: PrepTiming;
  /** Estimated duration in minutes */
  durationMinutes: number;
  /** Can this be done in parallel with other steps? */
  canParallelize: boolean;
}

export type PrepTiming = 'day-before' | '2-hours-before' | '1-hour-before' | '30-min-before' | 'just-before' | 'during';

export interface ShoppingItem {
  name: string;
  amount: string;
  category: string;
  /** Which recipes need this */
  usedIn: string[];
  /** Is this in the user's inventory? */
  inInventory: boolean;
}

export interface GuestMenuOptions {
  /** Number of guests */
  guestCount: number;
  /** Drinks per guest estimate */
  drinksPerGuest?: number;
  /** User's inventory for ingredient matching */
  inventory: Bottle[];
  /** Prefer recipes the user can already make? */
  preferMakeable?: boolean;
  /** Include a non-alcoholic option? */
  includeNonAlcoholic?: boolean;
  /** Max number of recipes on the menu */
  maxRecipes?: number;
  /** Custom event name */
  eventName?: string;
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Generate a full hosting plan for a party.
 * PRO's crown jewel — takes guest count + inventory and produces
 * a complete menu, prep timeline, and shopping list.
 */
export function generateHostingPlan(
  allRecipes: Recipe[],
  options: GuestMenuOptions
): HostingPlan {
  const {
    guestCount,
    drinksPerGuest = 3,
    inventory,
    preferMakeable = true,
    includeNonAlcoholic = true,
    maxRecipes = Math.max(3, Math.min(6, Math.ceil(guestCount / 5))),
    eventName = 'Party',
  } = options;

  // Step 1: Select recipes for the menu
  const selectedRecipes = selectRecipesForMenu(
    allRecipes,
    inventory,
    maxRecipes,
    preferMakeable,
    includeNonAlcoholic
  );

  // Step 2: Create batch plan (scaling + consolidated shopping)
  const batchPlan = createBatchPlan(selectedRecipes, guestCount, drinksPerGuest);

  // Step 3: Build menu summary
  const menuSummary = buildMenuSummary(selectedRecipes);

  // Step 4: Generate prep timeline
  const prepTimeline = generatePrepTimeline(batchPlan.recipes);

  // Step 5: Build shopping list with inventory awareness
  const shoppingNeeded = buildShoppingList(batchPlan, inventory);

  // Step 6: Estimate total prep time
  const totalPrepMinutes = prepTimeline.reduce((sum, step) => sum + step.durationMinutes, 0);

  return {
    eventName,
    guestCount,
    drinksPerGuest,
    batchPlan,
    menuSummary,
    prepTimeline,
    shoppingNeeded,
    totalPrepMinutes,
  };
}

// ============================================================================
// RECIPE SELECTION
// ============================================================================

/**
 * Smart recipe selection for a menu.
 * Optimizes for: variety, makeability, crowd-appeal, and batch-friendliness.
 */
function selectRecipesForMenu(
  allRecipes: Recipe[],
  inventory: Bottle[],
  maxRecipes: number,
  preferMakeable: boolean,
  includeNonAlcoholic: boolean
): Recipe[] {
  // Score each recipe for menu suitability
  const scored = allRecipes.map(recipe => {
    let score = 0;

    // Makeability: recipes the user can make get a big boost
    if (preferMakeable && inventory.length > 0) {
      const missing = getMissingIngredients(recipe, inventory);
      if (missing.canMake) score += 50;
      else if (missing.missingCount <= 1) score += 30;
      else if (missing.missingCount <= 2) score += 15;
    }

    // Batch-friendliness: simpler recipes batch better
    if (recipe.difficulty === 'beginner') score += 15;
    else if (recipe.difficulty === 'intermediate') score += 10;

    // Crowd appeal: citrus and sweet flavors are universally liked
    if (recipe.flavorProfiles.includes('citrus')) score += 8;
    if (recipe.flavorProfiles.includes('sweet')) score += 8;

    // Batch metadata bonus
    if (recipe.batchMultiplier && recipe.batchMultiplier > 1) score += 10;

    // Penalize very complex recipes for parties
    if (recipe.complexity > 0.8) score -= 10;

    return { recipe, score };
  });

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Select with variety in mind (don't pick all the same spirit)
  const selected: Recipe[] = [];
  const usedSpirits = new Set<string>();
  const usedCategories = new Set<string>();

  for (const { recipe } of scored) {
    if (selected.length >= maxRecipes) break;

    // Variety check: avoid duplicating base spirits unless needed
    if (recipe.baseSpirit && usedSpirits.has(recipe.baseSpirit) && selected.length < maxRecipes - 1) {
      continue; // Skip duplicate spirits early, but allow at the end if needed
    }

    selected.push(recipe);
    if (recipe.baseSpirit) usedSpirits.add(recipe.baseSpirit);
    if (recipe.category) usedCategories.add(recipe.category);
  }

  // If we need a non-alcoholic option and don't have one, add one
  if (includeNonAlcoholic && !selected.some(r => r.recipeType === 'mocktail' || r.abv === 0)) {
    const mocktail = scored.find(({ recipe }) =>
      recipe.recipeType === 'mocktail' || recipe.abv === 0
    );
    if (mocktail && selected.length < maxRecipes + 1) {
      selected.push(mocktail.recipe);
    }
  }

  // Fallback: if variety filtering was too aggressive, backfill
  if (selected.length < maxRecipes) {
    for (const { recipe } of scored) {
      if (selected.length >= maxRecipes) break;
      if (!selected.includes(recipe)) {
        selected.push(recipe);
      }
    }
  }

  return selected.slice(0, maxRecipes);
}

// ============================================================================
// MENU SUMMARY
// ============================================================================

function buildMenuSummary(recipes: Recipe[]): MenuSummary {
  // Category counts
  const catMap = new Map<string, number>();
  for (const r of recipes) {
    const cat = r.category || 'Other';
    catMap.set(cat, (catMap.get(cat) || 0) + 1);
  }
  const recipesByCategory = Array.from(catMap.entries())
    .map(([category, count]) => ({ category, count }));

  // Flavor variety: how many unique flavors are represented?
  const allFlavors = new Set<string>();
  for (const r of recipes) {
    r.flavorProfiles.forEach(f => allFlavors.add(f));
  }
  const maxPossibleFlavors = 7; // Total FlavorProfile options
  const flavorVariety = Math.round((allFlavors.size / maxPossibleFlavors) * 100);

  // Non-alcoholic check
  const hasNonAlcoholic = recipes.some(r => r.recipeType === 'mocktail' || r.abv === 0);

  // Display text
  const lines = recipes.map(r => `  ${r.title}`);
  const displayText = `Menu (${recipes.length} cocktails):\n${lines.join('\n')}`;

  return { displayText, recipesByCategory, flavorVariety, hasNonAlcoholic };
}

// ============================================================================
// PREP TIMELINE
// ============================================================================

/**
 * Generate a prep timeline for batch recipes.
 * Orders tasks by when they should be done relative to event start.
 */
function generatePrepTimeline(scaledRecipes: ScaledRecipe[]): PrepStep[] {
  const steps: PrepStep[] = [];
  let order = 1;

  // Day-before tasks: prep syrups, infusions, juices
  for (const sr of scaledRecipes) {
    const recipe = sr.recipe;

    // Check for syrups that could be made ahead
    const hasSyrup = recipe.ingredients.some(i =>
      i.name.toLowerCase().includes('syrup')
    );
    if (hasSyrup) {
      steps.push({
        order: order++,
        recipeName: recipe.title,
        task: 'Prepare any homemade syrups',
        timing: 'day-before',
        durationMinutes: 15,
        canParallelize: true,
      });
    }

    // Check for juicing
    const hasCitrus = recipe.ingredients.some(i =>
      /lime|lemon|orange|grapefruit/i.test(i.name) && /juice/i.test(i.name)
    );
    if (hasCitrus) {
      steps.push({
        order: order++,
        recipeName: recipe.title,
        task: `Juice citrus for ${recipe.title} (${sr.servings} servings)`,
        timing: '2-hours-before',
        durationMinutes: Math.max(5, Math.ceil(sr.servings / 4) * 3),
        canParallelize: true,
      });
    }
  }

  // 1-hour-before: set up bar area, prep garnishes
  steps.push({
    order: order++,
    recipeName: null,
    task: 'Set up bar area — glasses, ice bucket, tools',
    timing: '1-hour-before',
    durationMinutes: 15,
    canParallelize: false,
  });

  for (const sr of scaledRecipes) {
    const hasGarnish = sr.recipe.garnish && sr.recipe.garnish.length > 0;
    if (hasGarnish) {
      steps.push({
        order: order++,
        recipeName: sr.recipe.title,
        task: `Prep garnishes: ${sr.recipe.garnish}`,
        timing: '1-hour-before',
        durationMinutes: 10,
        canParallelize: true,
      });
    }
  }

  // 30-min-before: batch mix what can be pre-mixed
  for (const sr of scaledRecipes) {
    const canPreBatch = sr.recipe.difficulty === 'beginner' || sr.recipe.difficulty === 'intermediate';
    if (canPreBatch && sr.servings > 2) {
      steps.push({
        order: order++,
        recipeName: sr.recipe.title,
        task: `Pre-batch ${sr.recipe.title} (${sr.servings} servings) — combine spirits and mixers`,
        timing: '30-min-before',
        durationMinutes: Math.max(5, Math.ceil(sr.servings / 6) * 5),
        canParallelize: true,
      });
    }
  }

  // Just before: ice, final touches
  steps.push({
    order: order++,
    recipeName: null,
    task: 'Fill ice buckets and chill glasses',
    timing: 'just-before',
    durationMinutes: 10,
    canParallelize: false,
  });

  // Sort by timing priority
  const timingOrder: Record<PrepTiming, number> = {
    'day-before': 0,
    '2-hours-before': 1,
    '1-hour-before': 2,
    '30-min-before': 3,
    'just-before': 4,
    'during': 5,
  };
  steps.sort((a, b) => timingOrder[a.timing] - timingOrder[b.timing]);

  // Re-number after sort
  steps.forEach((step, i) => { step.order = i + 1; });

  return steps;
}

// ============================================================================
// SHOPPING LIST
// ============================================================================

function buildShoppingList(batchPlan: BatchPlan, inventory: Bottle[]): ShoppingItem[] {
  const invNames = inventory.map(b => b.name.toLowerCase());

  return batchPlan.consolidatedIngredients.map(ci => {
    const inInventory = invNames.some(inv =>
      inv.includes(ci.name.toLowerCase()) || ci.name.toLowerCase().includes(inv)
    );

    return {
      name: ci.name,
      amount: `${ci.totalAmount} ${ci.unit}`,
      category: ci.category || 'other',
      usedIn: ci.usedInRecipes,
      inInventory,
    };
  });
}
