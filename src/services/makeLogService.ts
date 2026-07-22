/**
 * Make Log Service — the North Star sensor (Phase 0.8)
 *
 * ONE write path for "I made this." Every "Made It" tap across the app
 * (recipe detail, Tonight's Pick, Hosting, What Can I Make) should call
 * logMadeIt() and nothing else write to made_events directly.
 *
 * This is additive, not a replacement for the existing
 * recipeCompletionService (local AsyncStorage completion log + the
 * brand_selections sync, which feeds the separate brand-partnership
 * pipeline) or the existing earnCocktailLoggedXP() XP award already
 * called by CocktailDetailScreen.tsx / RecipeDetailScreen.tsx — those
 * keep working exactly as they do today. logMadeIt() is the new,
 * durable, queryable signal underneath: Weekly Makers, the repeat-make
 * taste signal, and "made Nx" card scaffolding all read from here.
 *
 * Requires migration 030_made_events.sql to be applied before any
 * insert will succeed — see that file's header for how to apply.
 */

import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';
import { trackEvent } from '../lib/analytics';
import { useTasteModel } from '../store/useTasteModel';
import { RecipesRepository } from '../repos/supabase';

export type MadeEventSource = 'recipe_detail' | 'tonights_pick' | 'hosting' | 'whatcanimake';

export interface LogMadeItParams {
  userId: string;
  recipeId: string;
  recipeName?: string;
  source: MadeEventSource;
  /** Flavor tags on the recipe, if available — feeds the taste model's repeat-make signal. */
  flavorProfiles?: string[];
  substitutionsUsed?: Record<string, unknown> | null;
  rating?: number | null;
}

export interface LogMadeItResult {
  success: boolean;
  /** Total times this user has made this exact recipe, including this one. Powers "made Nx" card scaffolding. */
  timesMade: number;
}

/**
 * Log a "made it" event. Fire-and-forget safe: never throws, degrades
 * to a logged warning if the network/table is unavailable (the table
 * won't exist until migration 030 is applied — see this file's header).
 */
export async function logMadeIt(params: LogMadeItParams): Promise<LogMadeItResult> {
  const {
    userId,
    recipeId,
    source,
    flavorProfiles,
    substitutionsUsed = null,
    rating = null,
  } = params;

  try {
    const { error: insertError } = await supabase.from('made_events').insert({
      user_id: userId,
      recipe_id: recipeId,
      source,
      substitutions_used: substitutionsUsed,
      rating,
    });

    if (insertError) {
      log.warn('MakeLogService', 'Failed to insert made_events row (migration 030 applied?)', {
        error: insertError,
      });
    }
  } catch (error) {
    log.error('MakeLogService', 'made_events insert threw', error, { recipeId, source });
  }

  // Repeat-make is the strongest taste signal there is — stronger than a
  // view or a save. Reinforce the taste model the same way a "thumbs up"
  // would, using the recipe's flavor tags if we have them.
  if (flavorProfiles && flavorProfiles.length > 0) {
    try {
      useTasteModel.getState().recordThumbsUp({ flavorProfile: flavorProfiles });
    } catch (error) {
      log.warn('MakeLogService', 'Failed to update taste model from made-it signal', { error });
    }
  }

  // The made_it analytics event — distinct from the existing
  // RECIPE_MADE event some screens already fire (that one predates this
  // sensor and stays for its own funnel); this is the one 1.1/3.x read.
  trackEvent('made_it', {
    recipe_id: recipeId,
    recipe_name: params.recipeName,
    source,
    has_substitutions: Boolean(substitutionsUsed),
  });

  const timesMade = await getTimesMade(userId, recipeId);
  return { success: true, timesMade };
}

/**
 * How many times has this user made this recipe (including any logged
 * before migration 030 was applied — returns 0 gracefully if the table
 * doesn't exist yet or the query fails).
 */
export async function getTimesMade(userId: string, recipeId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('made_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('recipe_id', recipeId);

    if (error || count === null) return 0;
    return count;
  } catch (error) {
    log.warn('MakeLogService', 'Failed to read times-made count', { error });
    return 0;
  }
}

export interface MadeHistoryEntry {
  id: string;
  recipeId: string;
  recipeName: string;
  recipeImage?: string;
  madeAt: string;
  source: MadeEventSource;
  rating: number | null;
}

/**
 * Recent "made it" history for the Drinks tab's Made-It History list, most
 * recent first. `made_events` only stores recipe_id + timestamp + source
 * (no name/image), so this resolves each *distinct* recipe_id once via
 * RecipesRepository (a repeat-made cocktail collapses N rows to 1 lookup)
 * rather than one lookup per row. Uses allSettled so one missing/failed
 * recipe lookup doesn't take down the rest of the history — the made-it
 * event itself is still real history even if its recipe was later removed.
 */
export async function getMadeHistory(
  userId: string,
  limit: number = 20,
): Promise<MadeHistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('made_events')
      .select('id, recipe_id, made_at, source, rating')
      .eq('user_id', userId)
      .order('made_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    const distinctRecipeIds = Array.from(new Set(data.map((row: any) => row.recipe_id)));
    const settled = await Promise.allSettled(
      distinctRecipeIds.map((id) => RecipesRepository.getRecipeById(id)),
    );
    const recipeById = new Map<
      string,
      { title?: string; name?: string; image?: string; imageUrl?: string } | null
    >(
      distinctRecipeIds.map((id, index) => {
        const result = settled[index];
        return [id, result.status === 'fulfilled' ? result.value : null];
      }),
    );

    return data.map((row: any) => {
      const recipe = recipeById.get(row.recipe_id);
      return {
        id: row.id,
        recipeId: row.recipe_id,
        recipeName: recipe?.name || recipe?.title || 'Recipe',
        recipeImage: recipe?.image || recipe?.imageUrl,
        madeAt: row.made_at,
        source: row.source,
        rating: row.rating,
      };
    });
  } catch (error) {
    log.warn('MakeLogService', 'Failed to read made-it history', { error });
    return [];
  }
}

/**
 * Weekly Makers input for this user: have they made anything since the
 * start of this calendar week? Used by the weekly streak (0.6 reads
 * this table instead of a daily check-in).
 */
export async function hasMadeSomethingThisWeek(userId: string): Promise<boolean> {
  try {
    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diffToMonday = (day + 6) % 7; // Monday-start week
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
    startOfWeek.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('made_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('made_at', startOfWeek.toISOString());

    if (error || count === null) return false;
    return count > 0;
  } catch (error) {
    log.warn('MakeLogService', 'Failed to check weekly makers status', { error });
    return false;
  }
}
