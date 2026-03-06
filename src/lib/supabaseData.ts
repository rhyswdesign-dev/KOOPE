/**
 * Supabase Data Access Layer
 * Provides type-safe methods for database operations
 */

import { supabase } from './supabase';
import { log } from './logger';

export interface UserProfile {
  id: string;
  display_name?: string;
  bio?: string;
  featured_badges?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Recipe {
  id?: string;
  user_id: string;
  name: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  category?: string;
  difficulty?: string;
  prep_time?: number;
  cook_time?: number;
  servings?: number;
  image_url?: string;
  is_favorite?: boolean;
  ratio_profile?: any;
  ratio_estimated?: boolean;
  ratio_editor_state?: any;
  created_at?: string;
  updated_at?: string;
}

export interface Feedback {
  id?: string;
  user_id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  rating?: number;
  email?: string;
  device_info?: any;
  status: string;
  created_at?: string;
}

export interface UserPreferences {
  user_id: string;
  analytics_consent?: boolean;
  marketing_consent?: boolean;
  notifications_enabled?: boolean;
  preferences?: any;
  updated_at?: string;
}

/**
 * User Profile Operations
 */
export const userProfileService = {
  async get(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // No rows
        throw error;
      }

      return data;
    } catch (error) {
      log.error('SupabaseData', 'Error getting user profile', error);
      return null;
    }
  },

  async upsert(profile: Partial<UserProfile>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          ...profile,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      log.info('SupabaseData', 'Profile upserted', { userId: profile.id });
      return true;
    } catch (error) {
      log.error('SupabaseData', 'Error upserting profile', error);
      return false;
    }
  },

  async update(userId: string, updates: Partial<UserProfile>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      log.info('SupabaseData', 'Profile updated', { userId });
      return true;
    } catch (error) {
      log.error('SupabaseData', 'Error updating profile', error);
      return false;
    }
  }
};

/**
 * Recipe Operations
 */
export const recipeService = {
  async create(recipe: Recipe): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .insert({
          ...recipe,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) throw error;

      log.info('SupabaseData', 'Recipe created', { recipeId: data.id });
      return data.id;
    } catch (error) {
      log.error('SupabaseData', 'Error creating recipe', error);
      return null;
    }
  },

  async getUserRecipes(userId: string): Promise<Recipe[]> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      log.error('SupabaseData', 'Error getting user recipes', error);
      return [];
    }
  },

  async update(recipeId: string, updates: Partial<Recipe>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recipes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', recipeId);

      if (error) throw error;

      log.info('SupabaseData', 'Recipe updated', { recipeId });
      return true;
    } catch (error) {
      log.error('SupabaseData', 'Error updating recipe', error);
      return false;
    }
  },

  async delete(recipeId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', recipeId);

      if (error) throw error;

      log.info('SupabaseData', 'Recipe deleted', { recipeId });
      return true;
    } catch (error) {
      log.error('SupabaseData', 'Error deleting recipe', error);
      return false;
    }
  }
};

/**
 * Feedback Operations
 */
export const feedbackService = {
  async submit(feedback: Feedback): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          ...feedback,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      log.info('SupabaseData', 'Feedback submitted', { userId: feedback.user_id });
      return true;
    } catch (error) {
      log.error('SupabaseData', 'Error submitting feedback', error);
      return false;
    }
  }
};

/**
 * User Preferences Operations
 */
export const preferencesService = {
  async get(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (error) {
      log.error('SupabaseData', 'Error getting preferences', error);
      return null;
    }
  },

  async upsert(preferences: UserPreferences): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      log.info('SupabaseData', 'Preferences upserted', { userId: preferences.user_id });
      return true;
    } catch (error) {
      log.error('SupabaseData', 'Error upserting preferences', error);
      return false;
    }
  }
};

/**
 * Storage Helper Functions
 */
export const storageService = {
  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    bucket: string,
    path: string,
    file: Blob | File,
    options?: { contentType?: string; cacheControl?: string }
  ): Promise<string | null> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, options);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      log.info('SupabaseData', 'File uploaded', { bucket, path });
      return urlData.publicUrl;
    } catch (error) {
      log.error('SupabaseData', 'Error uploading file', error);
      return null;
    }
  },

  /**
   * Delete a file from Supabase Storage
   */
  async deleteFile(bucket: string, path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;

      log.info('SupabaseData', 'File deleted', { bucket, path });
      return true;
    } catch (error) {
      log.error('SupabaseData', 'Error deleting file', error);
      return false;
    }
  },

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }
};
