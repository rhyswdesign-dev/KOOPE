/**
 * Brand Partnership Service
 * Manages featured brand placements, impressions, and cart-add tracking.
 * Powers the $600k–$1.2M/year multi-category sponsorship revenue stream.
 *
 * Featured brands are stored in the `featured_brands` Supabase table.
 * This service fetches the current month's active brands and provides
 * helpers for the UI (RecipeCard, GroceryListModal, search results).
 */

import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';

export interface FeaturedBrand {
  id: string;
  brandName: string;
  category: string;
  month: number;
  year: number;
  tier: 'premium' | 'growth' | 'specialty';
  badgeLabel: string;        // 'Featured' | 'Sponsored' (FTC-compliant)
  vaultDropId?: string;
  challengeId?: string;
  xpBonus: number;
}

// In-memory cache so we don't hit Supabase on every render
let _cache: FeaturedBrand[] | null = null;
let _cacheMonth = -1;
let _cacheYear = -1;

/** Fetch and cache featured brands for the current month */
export async function getCurrentFeaturedBrands(): Promise<FeaturedBrand[]> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Return cached data if same month/year
  if (_cache && _cacheMonth === month && _cacheYear === year) {
    return _cache;
  }

  try {
    const { data, error } = await supabase
      .from('featured_brands')
      .select('*')
      .eq('month', month)
      .eq('year', year)
      .eq('is_active', true);

    if (error || !data) {
      log.error('BrandPartnershipService', 'Failed to fetch featured brands', error);
      return [];
    }

    _cache = data.map((row) => ({
      id: row.id,
      brandName: row.brand_name,
      category: row.category,
      month: row.month,
      year: row.year,
      tier: row.tier,
      badgeLabel: row.badge_label,
      vaultDropId: row.vault_drop_id ?? undefined,
      challengeId: row.challenge_id ?? undefined,
      xpBonus: row.xp_bonus,
    }));
    _cacheMonth = month;
    _cacheYear = year;

    return _cache;
  } catch (err) {
    log.error('BrandPartnershipService', 'Unexpected error fetching featured brands', err);
    return [];
  }
}

/**
 * Get the featured brand for a specific ingredient category this month.
 * Returns null if no brand is featured for this category.
 *
 * @param category - e.g. 'gin', 'bourbon', 'tequila', 'amaro', 'vodka', 'rum', 'liqueur'
 */
export async function getFeaturedBrandForCategory(category: string): Promise<FeaturedBrand | null> {
  const brands = await getCurrentFeaturedBrands();
  return brands.find((b) => b.category.toLowerCase() === category.toLowerCase()) ?? null;
}

/**
 * Guess the spirit category from an ingredient name.
 * Used by GroceryListModal to auto-detect which items might have featured brands.
 */
export function inferCategoryFromIngredient(ingredientName: string): string | null {
  const name = ingredientName.toLowerCase();

  // Gin
  if (/\bgin\b|tanqueray|hendrick|beefeater|bombay|sipsmith|aviation/.test(name)) return 'gin';
  // Bourbon / Whiskey
  if (/bourbon|whiskey|whisky|bulleit|maker'?s|woodford|buffalo trace|wild turkey|four roses/.test(name)) return 'bourbon';
  // Scotch
  if (/scotch|highland|speyside|lagavulin|laphroaig|glenlivet|glenfiddich|monkey shoulder/.test(name)) return 'scotch';
  // Rye
  if (/rye|rittenhouse|bulleit rye|templeton/.test(name)) return 'rye';
  // Tequila
  if (/tequila|blanco|reposado|añejo|patr[oó]n|espolón|espolon|casamigos|olmeca|herradura/.test(name)) return 'tequila';
  // Mezcal
  if (/mezcal|del maguey|vida|banhez|montelobos/.test(name)) return 'mezcal';
  // Rum
  if (/rum|appleton|havana|bacardi|mount gay|diplomatico|plantation/.test(name)) return 'rum';
  // Vodka
  if (/vodka|tito'?s|grey goose|ketel one|belvedere|ciroc|absolut/.test(name)) return 'vodka';
  // Amaro / Aperitif
  if (/amaro|campari|aperol|negroni|spritz|contratto/.test(name)) return 'amaro';
  // Aperitif
  if (/aperitif|lillet|cocchi|suze/.test(name)) return 'aperitif';
  // Vermouth
  if (/vermouth|martini|dolin|carpano|noilly/.test(name)) return 'vermouth';
  // Brandy
  if (/brandy|cognac|armagnac|calvados|r[eé]my|hennessy|courvoisier/.test(name)) return 'brandy';
  // Liqueur
  if (/liqueur|cointreau|grand marnier|triple sec|st.?germain|chartreuse|kahl[uú]a|baileys|amaretto|limoncello/.test(name)) return 'liqueur';

  return null;
}

/**
 * Record that a user saw a featured brand (impression event).
 * Called when recipe cards with featured ingredients are displayed.
 * Silently fails — never blocks the UI.
 */
export async function recordBrandImpression(params: {
  userId?: string;
  brandId: string;
  brandName: string;
  context: 'recipe_card' | 'ingredient_list' | 'cart' | 'vault' | 'challenge';
  recipeId?: string;
  userTier?: string;
}): Promise<void> {
  try {
    await supabase.from('brand_impressions').insert({
      user_id: params.userId ?? null,
      brand_id: params.brandId,
      brand_name: params.brandName,
      context: params.context,
      recipe_id: params.recipeId ?? null,
      user_tier: params.userTier ?? 'free',
    });
  } catch (err) {
    log.error('BrandPartnershipService', 'Failed to record brand impression', err);
  }
}

/**
 * Record a brand cart-add event.
 * Called when user adds a spirit ingredient to their shopping cart.
 * Feeds the purchase intent data that powers quarterly insights reports.
 */
export async function recordBrandCartAdd(params: {
  userId?: string;
  brandName?: string;
  ingredientName: string;
  recipeContext?: string;
  userTier?: string;
  userRegion?: string;
  isFeaturedBrand?: boolean;
}): Promise<void> {
  try {
    await supabase.from('brand_cart_adds').insert({
      user_id: params.userId ?? null,
      brand_name: params.brandName ?? null,
      ingredient_name: params.ingredientName,
      recipe_context: params.recipeContext ?? null,
      user_tier: params.userTier ?? 'free',
      user_region: params.userRegion ?? null,
      is_featured_brand: params.isFeaturedBrand ?? false,
    });
  } catch (err) {
    log.error('BrandPartnershipService', 'Failed to record brand cart add', err);
  }
}

/** Invalidate the featured brands cache (call after admin updates brands) */
export function invalidateFeaturedBrandsCache(): void {
  _cache = null;
  _cacheMonth = -1;
  _cacheYear = -1;
}
