/**
 * Recipe engagement signals — view / save / unsave / thumbs / dismiss.
 *
 * The third taste-signal stream, alongside makeLogService (made_events) and
 * scanContextService (scan_events). See migration
 * supabase/migrations/033_recipe_signals.sql for the rationale and the
 * reference rollup queries.
 *
 * Consent-gated and fire-and-forget, matching scanContextService exactly:
 * never throws, never blocks a UI action, and degrades to a warning if the
 * migration has not been applied yet.
 */
import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';
import { getConsentChoices } from '../lib/consentStore';

export type RecipeSignal = 'view' | 'save' | 'unsave' | 'thumbs_up' | 'thumbs_down' | 'dismiss';

/**
 * Resolve the signed-in user. Call sites are often plain utils with no auth
 * context in scope (recipeActions.ts), so the service resolves it rather than
 * forcing every caller to thread a userId through.
 */
async function resolveUserId(explicit?: string): Promise<string | null> {
  if (explicit) return explicit;
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

async function hasAnalyticsConsent(): Promise<boolean> {
  try {
    const choices = await getConsentChoices();
    return choices.analytics === true;
  } catch (error) {
    log.warn('recipeSignalService', 'Failed to read consent choices', { error });
    return false;
  }
}

/**
 * Log one recipe engagement signal.
 *
 * Resolves silently to false when there is no signed-in user, consent has not
 * been granted, or the insert fails — callers should not await this or branch
 * on the result beyond diagnostics.
 */
export async function logRecipeSignal(params: {
  userId?: string;
  recipeId: string;
  signal: RecipeSignal;
  source?: string;
}): Promise<boolean> {
  const { recipeId, signal, source } = params;

  if (!recipeId) return false;
  const userId = await resolveUserId(params.userId);
  if (!userId) return false;
  if (!(await hasAnalyticsConsent())) return false;

  try {
    const { error } = await supabase.from('recipe_signals').insert({
      user_id: userId,
      recipe_id: recipeId,
      signal,
      source: source ?? null,
    });

    if (error) {
      log.warn(
        'recipeSignalService',
        'Failed to insert recipe_signals row (migration 033 applied?)',
        {
          error,
          signal,
        },
      );
      return false;
    }

    return true;
  } catch (error) {
    log.error('recipeSignalService', 'recipe_signals insert threw', error as Error, {
      recipeId,
      signal,
    });
    return false;
  }
}

/**
 * Recent signals for a user, newest first. Input to the taste-vector
 * recompute. Returns an empty array on any failure — a missing table must
 * degrade to "no signal," never to a thrown error inside a render path.
 */
export async function getRecentRecipeSignals(
  userId: string,
  limit = 200,
): Promise<{ recipeId: string; signal: RecipeSignal; createdAt: string }[]> {
  try {
    const { data, error } = await supabase
      .from('recipe_signals')
      .select('recipe_id, signal, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      log.warn('recipeSignalService', 'Failed to read recipe_signals', { error });
      return [];
    }

    return data.map((row: any) => ({
      recipeId: row.recipe_id as string,
      signal: row.signal as RecipeSignal,
      createdAt: row.created_at as string,
    }));
  } catch (error) {
    log.error('recipeSignalService', 'recipe_signals read threw', error as Error);
    return [];
  }
}
