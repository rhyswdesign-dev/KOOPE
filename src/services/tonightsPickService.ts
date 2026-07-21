// @ts-nocheck
/**
 * "Tonight's Pick" — an all-tiers, inventory-aware recommendation rail for the
 * Browse tab. Reuses the same predictiveEngine flow RecipesScreen already runs
 * for PRO users in "For You" mode, but skips the taste-graph/scoring pass
 * entirely when the user has no scanned inventory (the common case for new
 * users), so it stays cheap to call on every screen focus. Also fetches its
 * own full-ingredient recipe data (see withFullIngredientData below) rather
 * than trusting the caller's pool, since RecipesScreen's Browse pool is
 * ingredient-less for real cocktails.
 */
import { InventoryService } from './inventoryService';
import { toBottle } from '../types/database';
import { loadUserProfile } from './userProfileService';
import { initializeTasteGraph } from './tasteGraphService';
import {
  getPredictiveRecommendations,
  detectTimeOfDay,
  detectSeason,
  type PredictedRecipe,
} from './predictiveEngine';
import {
  buildEnhancedProfileFallback,
  buildTasteProfileFromPersonalization,
} from './enhancedProfileFallback';
import { RecipesRepository } from '../repos/supabase';
import { log } from '../lib/logger';
import type { Recipe } from '../types/recipe';

export interface TonightsPickResult {
  hasInventory: boolean;
  recommendations: PredictedRecipe[];
}

const EMPTY_RESULT: TonightsPickResult = { hasInventory: false, recommendations: [] };
const FULL_RECIPE_PAGE_SIZE = 100;
const FULL_RECIPE_MAX_PAGES = 5; // covers up to 500 recipes in one call

function dedupeById(items: PredictedRecipe[]): PredictedRecipe[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/**
 * RecipesScreen's Browse pool (ALL_COCKTAILS) is built from
 * `RecipesRepository.getInitialRecipes()`, which uses the DB's "lite" mapper
 * — it hardcodes `ingredients: []`/`spiritsUsed: []`/`abv: 0` for every real
 * cocktail (only the hand-written mocktail fallbacks carry real inline
 * ingredients). `calculateInventoryBoost` in predictiveEngine returns 0
 * whenever `ingredients.length === 0`, so real cocktails could never earn an
 * inventoryMatch signal — this rail would only ever surface mocktails
 * regardless of what's in the user's bar. Fetch the full-ingredient catalog
 * here and prefer it, id-for-id, over whatever the caller passed in.
 */
async function withFullIngredientData(allCocktails: Recipe[]): Promise<Recipe[]> {
  try {
    const fullRecipes: Recipe[] = [];
    for (let page = 0; page < FULL_RECIPE_MAX_PAGES; page++) {
      const batch = await RecipesRepository.getAllRecipes(page, FULL_RECIPE_PAGE_SIZE);
      fullRecipes.push(...batch);
      if (batch.length < FULL_RECIPE_PAGE_SIZE) break;
    }

    const fullById = new Map(fullRecipes.map((recipe) => [recipe.id, recipe]));
    return allCocktails.map((recipe) => fullById.get(recipe.id) || recipe);
  } catch (error) {
    log.error(
      'tonightsPickService',
      'Failed to load full-ingredient recipe data, falling back to lite pool',
      error as Error,
    );
    return allCocktails;
  }
}

export async function getTonightsPick(params: {
  userId?: string;
  profile: any;
  savedItems: any;
  allCocktails: Recipe[];
  limit?: number;
}): Promise<TonightsPickResult> {
  const { userId, profile, savedItems, allCocktails, limit = 10 } = params;

  if (!userId) {
    return EMPTY_RESULT;
  }

  try {
    const userInventory = await InventoryService.getUserInventory(userId);
    if (!userInventory || userInventory.length === 0) {
      return EMPTY_RESULT;
    }

    const inventoryBottles = userInventory.map((item: any) =>
      toBottle(item, {
        // Real inventory rows have occasionally reached this with a null/
        // missing item_name (data quality issue upstream, not something we
        // can fix retroactively here). toBottle() otherwise passes that
        // straight through as `name`, and predictiveEngine calls
        // `b.name.toLowerCase()` unconditionally on every bottle — one bad
        // row crashed the whole Tonight's Pick computation (caught by the
        // try/catch below, but silently degrading everyone to the
        // "scan a bottle" empty state). Guard it here so a single
        // malformed row can't take out the feature for the whole user.
        name: item.item_name || 'Unnamed bottle',
        subcategory: item.subcategory || undefined,
        brand: item.brand || undefined,
        abv: item.abv || undefined,
        volume: item.volume || undefined,
        quantity: (item.quantity as any) || 'full',
        isFavorite: item.is_favorite || false,
        notes: item.notes || undefined,
        expiryDate: item.expiry_date || undefined,
        scanCount: item.scan_count || 1,
      }),
    );

    const loadedProfile = await loadUserProfile(userId).catch(() => null);
    const enhancedProfile =
      loadedProfile || buildEnhancedProfileFallback(userId, profile, savedItems);
    enhancedProfile.tasteProfile =
      enhancedProfile.tasteProfile || buildTasteProfileFromPersonalization(profile);

    const scoringPool = await withFullIngredientData(allCocktails);

    const tasteGraph = initializeTasteGraph(enhancedProfile.tasteProfile);
    // Score the whole candidate pool (not just the overall top N) before
    // filtering for inventoryMatch — inventoryMatch is only 10 of the 100
    // scoring points (vs. 35 for tasteGraph alone), so a cocktail the user
    // can actually make routinely misses a small top-N cut. Capping here
    // caused the rail to intermittently show zero matches (and therefore
    // render nothing) even when the user had matching inventory.
    const predictions = getPredictiveRecommendations(
      scoringPool as any,
      enhancedProfile as any,
      tasteGraph,
      {
        timeOfDay: detectTimeOfDay(),
        season: detectSeason(),
        inventory: inventoryBottles,
        recentScans: inventoryBottles.slice(0, 5),
      },
      scoringPool.length,
    );

    const inventoryMatches = predictions.filter((item) =>
      item.signals?.some((signal) => signal.source === 'inventoryMatch'),
    );

    return {
      hasInventory: true,
      recommendations: dedupeById(inventoryMatches).slice(0, limit),
    };
  } catch (error) {
    log.error('tonightsPickService', "Failed to compute Tonight's Pick", error as Error);
    return EMPTY_RESULT;
  }
}
