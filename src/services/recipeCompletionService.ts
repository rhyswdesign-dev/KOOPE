import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../lib/logger';

const STORAGE_KEY = 'recipe_completion_logs_v1';

type SupabaseClient = {
  from: (table: string) => {
    insert: (rows: unknown[]) => Promise<unknown>;
  };
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
};

let cachedSupabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (cachedSupabase) return cachedSupabase;
  try {
    const mod = require('../lib/supabase') as { supabase?: SupabaseClient };
    cachedSupabase = mod.supabase ?? null;
    return cachedSupabase;
  } catch (error) {
    log.warn('RecipeCompletionService', 'Supabase unavailable; skipping sync operation', { error });
    return null;
  }
}

export interface IngredientBrandSelection {
  ingredient: string;
  amount?: string;
  brandUsed: string;
}

export interface RecipeCompletionLog {
  id: string;
  userId?: string;
  recipeId?: string;
  recipeName: string;
  madeAt: string;
  userTier?: 'free' | 'plus' | 'pro';
  ingredientBrands: IngredientBrandSelection[];
  substitutions?: string;
  techniqueVariations?: string;
  personalModifications?: string;
  rating?: number;
  notes?: string;
}

async function readAll(): Promise<RecipeCompletionLog[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    log.error('RecipeCompletionService', 'Failed to read completion logs', error);
    return [];
  }
}

async function writeAll(logs: RecipeCompletionLog[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch (error) {
    log.error('RecipeCompletionService', 'Failed to write completion logs', error);
  }
}

export async function logRecipeCompletion(entry: Omit<RecipeCompletionLog, 'id' | 'madeAt'>): Promise<RecipeCompletionLog> {
  const logs = await readAll();

  const logEntry: RecipeCompletionLog = {
    ...entry,
    id: `completion_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    madeAt: new Date().toISOString(),
  };

  logs.unshift(logEntry);
  await writeAll(logs.slice(0, 500));

  return logEntry;
}

export async function updateCompletionRating(
  logId: string,
  rating: number,
  notes?: string
): Promise<RecipeCompletionLog | null> {
  const logs = await readAll();
  const idx = logs.findIndex((l) => l.id === logId);
  if (idx === -1) return null;

  logs[idx] = {
    ...logs[idx],
    rating,
    notes: notes?.trim() || logs[idx].notes,
  };

  await writeAll(logs);
  return logs[idx];
}

export async function getRecipeCompletions(userId?: string): Promise<RecipeCompletionLog[]> {
  const logs = await readAll();
  if (!userId) return logs;
  return logs.filter((l) => l.userId === userId);
}

/**
 * Syncs a completion log to Supabase brand_selections table.
 * Called after logRecipeCompletion for all tiers — feeds the brand partnership data pipeline.
 * Silently fails (never blocks the user flow).
 */
export async function syncCompletionToSupabase(log_entry: RecipeCompletionLog): Promise<void> {
  if (!log_entry.userId) return;
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const rows = log_entry.ingredientBrands
      .filter((b) => b.brandUsed && b.brandUsed !== 'Not specified')
      .map((b) => ({
        completion_id: log_entry.id,
        user_id: log_entry.userId,
        recipe_id: log_entry.recipeId ?? null,
        ingredient_slot: b.ingredient,
        brand_selected: b.brandUsed,
        user_rating: log_entry.rating ?? null,
        user_tier: log_entry.userTier ?? 'free',
        created_at: log_entry.madeAt,
      }));

    if (rows.length === 0) return;

    await supabase.from('brand_selections').insert(rows);
  } catch (err) {
    log.error('RecipeCompletionService', 'Failed to sync to Supabase brand_selections', err);
  }
}

/**
 * Returns aggregated brand preference data for a recipe.
 * Used for the quarterly insights pipeline — privacy floor: min 5 completions.
 */
export async function getAggregatedBrandData(recipeId: string): Promise<
  { ingredient: string; brand: string; count: number }[]
> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase.rpc('get_recipe_brand_aggregates', {
      p_recipe_id: recipeId,
      p_min_count: 5,
    });
    if (error || !data) return [];
    return data as { ingredient: string; brand: string; count: number }[];
  } catch {
    return [];
  }
}
