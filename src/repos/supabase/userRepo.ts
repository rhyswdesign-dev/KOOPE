// @ts-nocheck
/**
 * User Repository - Supabase Implementation
 * Handles all user profile operations with Supabase
 */

import { supabase } from '../../lib/supabase';
import { log } from '../../lib/logger';
import { EnhancedUserProfile, TasteProfile, BarInventoryItem, InteractionHistory } from '../../types/userProfile';

// Database row type (snake_case from Supabase)
interface UserProfileRow {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  last_active_at: string;
  updated_at: string;
  taste_profile: any;
  bar_inventory: any[];
  saved_recipes: string[];
  interaction_history: any;
  mood_preferences: any;
  xp: number;
  level: number;
  keys: number;
  vault_cash: number;
  current_streak: number;
  longest_streak: number;
  last_streak_date: string | null;
  is_premium: boolean;
  subscription_tier: string | null;
  subscription_expires_at: string | null;
  unlocked_vault_items: string[];
  has_completed_onboarding: boolean;
  onboarding_step: string | null;
  notifications_enabled: boolean;
  analytics_consent: boolean;
  marketing_consent: boolean;
}

/**
 * Convert database row to EnhancedUserProfile type
 */
function rowToProfile(row: UserProfileRow): EnhancedUserProfile {
  return {
    id: row.id,
    displayName: row.display_name || '',
    email: row.email || '',
    avatarUrl: row.avatar_url,
    createdAt: new Date(row.created_at),
    lastActiveAt: new Date(row.last_active_at),

    tasteProfile: row.taste_profile as TasteProfile,
    barInventory: (row.bar_inventory || []).map((item: any) => ({
      ...item,
      addedAt: new Date(item.addedAt || item.added_at),
    })) as BarInventoryItem[],
    savedRecipes: row.saved_recipes || [],

    interactionHistory: row.interaction_history ? {
      lastUpdated: new Date(row.interaction_history.lastUpdated),
      viewedRecipes: (row.interaction_history.viewedRecipes || []).map((i: any) => ({
        ...i,
        timestamp: new Date(i.timestamp),
      })),
      savedRecipes: (row.interaction_history.savedRecipes || []).map((i: any) => ({
        ...i,
        timestamp: new Date(i.timestamp),
      })),
      completedRecipes: (row.interaction_history.completedRecipes || []).map((i: any) => ({
        ...i,
        timestamp: new Date(i.timestamp),
      })),
    } as InteractionHistory : undefined,

    moodPreferences: row.mood_preferences || {},

    xp: row.xp,
    level: row.level,
    keys: row.keys,
    vaultCash: row.vault_cash,

    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastStreakDate: row.last_streak_date ? new Date(row.last_streak_date) : undefined,

    isPremium: row.is_premium,
    subscriptionTier: row.subscription_tier as any,
    subscriptionExpiresAt: row.subscription_expires_at ? new Date(row.subscription_expires_at) : undefined,

    unlockedVaultItems: row.unlocked_vault_items || [],
    hasCompletedOnboarding: row.has_completed_onboarding,
    onboardingStep: row.onboarding_step,

    notificationsEnabled: row.notifications_enabled,
    analyticsConsent: row.analytics_consent,
    marketingConsent: row.marketing_consent,
  };
}

/**
 * Convert EnhancedUserProfile to database row format
 */
function profileToRow(profile: Partial<EnhancedUserProfile>): Partial<UserProfileRow> {
  const row: any = {};

  if (profile.id) row.id = profile.id;
  if (profile.displayName !== undefined) row.display_name = profile.displayName;
  if (profile.email !== undefined) row.email = profile.email;
  if (profile.avatarUrl !== undefined) row.avatar_url = profile.avatarUrl;
  if (profile.lastActiveAt) row.last_active_at = profile.lastActiveAt.toISOString();

  if (profile.tasteProfile) row.taste_profile = profile.tasteProfile;
  if (profile.barInventory) {
    row.bar_inventory = profile.barInventory.map(item => ({
      ...item,
      addedAt: item.addedAt.toISOString(),
    }));
  }
  if (profile.savedRecipes) row.saved_recipes = profile.savedRecipes;

  if (profile.interactionHistory) {
    row.interaction_history = {
      lastUpdated: profile.interactionHistory.lastUpdated.toISOString(),
      viewedRecipes: profile.interactionHistory.viewedRecipes.map(i => ({
        ...i,
        timestamp: i.timestamp.toISOString(),
      })),
      savedRecipes: profile.interactionHistory.savedRecipes.map(i => ({
        ...i,
        timestamp: i.timestamp.toISOString(),
      })),
      completedRecipes: profile.interactionHistory.completedRecipes.map(i => ({
        ...i,
        timestamp: i.timestamp.toISOString(),
      })),
    };
  }

  if (profile.moodPreferences) row.mood_preferences = profile.moodPreferences;

  if (profile.xp !== undefined) row.xp = profile.xp;
  if (profile.level !== undefined) row.level = profile.level;
  if (profile.keys !== undefined) row.keys = profile.keys;
  if (profile.vaultCash !== undefined) row.vault_cash = profile.vaultCash;

  if (profile.currentStreak !== undefined) row.current_streak = profile.currentStreak;
  if (profile.longestStreak !== undefined) row.longest_streak = profile.longestStreak;
  if (profile.lastStreakDate) row.last_streak_date = profile.lastStreakDate.toISOString().split('T')[0];

  if (profile.isPremium !== undefined) row.is_premium = profile.isPremium;
  if (profile.subscriptionTier) row.subscription_tier = profile.subscriptionTier;
  if (profile.subscriptionExpiresAt) row.subscription_expires_at = profile.subscriptionExpiresAt.toISOString();

  if (profile.unlockedVaultItems) row.unlocked_vault_items = profile.unlockedVaultItems;
  if (profile.hasCompletedOnboarding !== undefined) row.has_completed_onboarding = profile.hasCompletedOnboarding;
  if (profile.onboardingStep !== undefined) row.onboarding_step = profile.onboardingStep;

  if (profile.notificationsEnabled !== undefined) row.notifications_enabled = profile.notificationsEnabled;
  if (profile.analyticsConsent !== undefined) row.analytics_consent = profile.analyticsConsent;
  if (profile.marketingConsent !== undefined) row.marketing_consent = profile.marketingConsent;

  return row;
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<EnhancedUserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - user profile doesn't exist yet
        log.info('UserRepo', 'User profile not found', { userId });
        return null;
      }
      throw error;
    }

    if (!data) return null;

    return rowToProfile(data as UserProfileRow);
  } catch (error) {
    log.error('UserRepo', 'Failed to get user profile', error);
    throw new Error('Failed to get user profile');
  }
}

/**
 * Create or update user profile (upsert)
 */
export async function saveUserProfile(profile: EnhancedUserProfile): Promise<void> {
  try {
    const row = profileToRow(profile);

    const { error } = await supabase
      .from('users_profiles')
      .upsert(row, {
        onConflict: 'id',
      });

    if (error) throw error;

    log.info('UserRepo', 'User profile saved successfully', { userId: profile.id });
  } catch (error) {
    log.error('UserRepo', 'Failed to save user profile', error);
    throw new Error('Failed to save user profile');
  }
}

/**
 * Update specific fields in user profile
 */
export async function updateUserProfileFields(
  userId: string,
  fields: Partial<EnhancedUserProfile>
): Promise<void> {
  try {
    const row = profileToRow(fields);

    const { error } = await supabase
      .from('users_profiles')
      .update(row)
      .eq('id', userId);

    if (error) throw error;

    log.info('UserRepo', 'User profile fields updated', { userId, fields: Object.keys(fields) });
  } catch (error) {
    log.error('UserRepo', 'Failed to update user profile fields', error);
    throw new Error('Failed to update user profile fields');
  }
}

/**
 * Add recipe to saved recipes
 */
export async function addSavedRecipe(userId: string, recipeId: string): Promise<void> {
  try {
    // Use Postgres array append operation
    const { data: profile } = await supabase
      .from('users_profiles')
      .select('saved_recipes')
      .eq('id', userId)
      .single();

    const savedRecipes = profile?.saved_recipes || [];
    if (!savedRecipes.includes(recipeId)) {
      savedRecipes.push(recipeId);

      await supabase
        .from('users_profiles')
        .update({ saved_recipes: savedRecipes })
        .eq('id', userId);
    }

    log.info('UserRepo', 'Recipe added to saved list', { userId, recipeId });
  } catch (error) {
    log.error('UserRepo', 'Failed to add saved recipe', error);
    throw new Error('Failed to add saved recipe');
  }
}

/**
 * Remove recipe from saved recipes
 */
export async function removeSavedRecipe(userId: string, recipeId: string): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from('users_profiles')
      .select('saved_recipes')
      .eq('id', userId)
      .single();

    const savedRecipes = (profile?.saved_recipes || []).filter((id: string) => id !== recipeId);

    await supabase
      .from('users_profiles')
      .update({ saved_recipes: savedRecipes })
      .eq('id', userId);

    log.info('UserRepo', 'Recipe removed from saved list', { userId, recipeId });
  } catch (error) {
    log.error('UserRepo', 'Failed to remove saved recipe', error);
    throw new Error('Failed to remove saved recipe');
  }
}

/**
 * Update last active timestamp
 */
export async function updateLastActive(userId: string): Promise<void> {
  try {
    await supabase
      .from('users_profiles')
      .update({ last_active_at: new Date().toISOString() })
      .eq('id', userId);
  } catch (error) {
    log.error('UserRepo', 'Failed to update last active', error);
    // Don't throw - this is a non-critical operation
  }
}

/**
 * Award XP to user
 */
export async function awardXP(userId: string, amount: number): Promise<void> {
  try {
    // Use Postgres increment
    const { data: profile } = await supabase
      .from('users_profiles')
      .select('xp, level')
      .eq('id', userId)
      .single();

    if (!profile) throw new Error('User profile not found');

    const newXP = profile.xp + amount;
    const newLevel = Math.floor(newXP / 1000) + 1; // 1000 XP per level

    await supabase
      .from('users_profiles')
      .update({
        xp: newXP,
        level: newLevel,
      })
      .eq('id', userId);

    log.info('UserRepo', 'XP awarded', { userId, amount, newXP, newLevel });
  } catch (error) {
    log.error('UserRepo', 'Failed to award XP', error);
    throw new Error('Failed to award XP');
  }
}
