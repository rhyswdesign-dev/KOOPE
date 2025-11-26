/**
 * Recipes Repository - Supabase
 * Fetches recipes from Supabase with persistent caching and offline support
 */

import { supabase } from '../../lib/supabase';
import { Recipe, RecipeFilters } from '../../types/recipe';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCocktailImage } from '../../../assets/images/cocktails';
import { offlineService } from '../../services/offlineService';

// Cache keys
const CACHE_KEY = '@recipes_cache';
const CACHE_TIMESTAMP_KEY = '@recipes_cache_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Simple in-memory cache for current session
interface CacheEntry {
  data: Recipe[];
  timestamp: number;
}

export class RecipesRepository {
  private static memoryCache: Map<string, CacheEntry> = new Map();
  private static isInitialized = false;
  private static persistentCache: Recipe[] | null = null;

  /**
   * Force clear all caches (both AsyncStorage and in-memory)
   * Use this when you need to completely reset recipe data
   */
  static async clearAllCaches(): Promise<void> {
    console.log('🗑️ Clearing all recipe caches...');

    // Clear AsyncStorage
    await AsyncStorage.multiRemove([CACHE_KEY, CACHE_TIMESTAMP_KEY]);

    // Clear in-memory caches
    this.persistentCache = null;
    this.memoryCache.clear();
    this.isInitialized = false;

    console.log('✅ All caches cleared');
  }

  /**
   * Initialize cache from AsyncStorage
   */
  static async initializeCache(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const [cachedData, cachedTimestamp] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY),
        AsyncStorage.getItem(CACHE_TIMESTAMP_KEY),
      ]);

      if (cachedData && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp, 10);
        const now = Date.now();

        // Check if cache is still valid
        if (now - timestamp < CACHE_DURATION) {
          // Parse cached data and restore local image references
          const cachedRecipes = JSON.parse(cachedData);
          this.persistentCache = cachedRecipes.map((recipe: Recipe) => ({
            ...recipe,
            // Restore local image reference using getCocktailImage
            image: getCocktailImage(recipe.id, recipe.imageUrl || recipe.image as any),
          }));
          console.log(`✅ Loaded ${this.persistentCache.length} recipes from cache (images restored)`);
        } else {
          console.log('🔄 Cache expired, will fetch fresh data');
          await this.clearPersistentCache();
        }
      }
    } catch (error) {
      console.error('Error loading cache:', error);
    }

    this.isInitialized = true;
  }

  /**
   * Save recipes to persistent cache
   */
  private static async saveToPersistentCache(recipes: Recipe[]): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(recipes)),
        AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString()),
      ]);
      this.persistentCache = recipes;
      console.log(`💾 Saved ${recipes.length} recipes to cache`);
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }

  /**
   * Clear persistent cache
   */
  static async clearPersistentCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEY),
        AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY),
      ]);
      this.persistentCache = null;
      this.memoryCache.clear();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Clear the memory cache
   */
  static clearCache() {
    this.memoryCache.clear();
  }

  /**
   * Get cached data from memory if valid
   */
  private static getCached(key: string): Recipe[] | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > CACHE_DURATION) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set memory cache data
   */
  private static setCache(key: string, data: Recipe[]) {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Get all recipes with caching and pagination
   * @param page Page number (0-indexed)
   * @param pageSize Number of recipes per page
   */
  static async getAllRecipes(page: number = 0, pageSize: number = 50): Promise<Recipe[]> {
    const cacheKey = `all-recipes-${page}-${pageSize}`;

    // Check cache first
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }

    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('is_public', true)
      .order('title')
      .range(from, to);

    if (error) {
      console.error('Error fetching recipes:', error);
      return [];
    }

    const recipes = (data || []).map(this.mapFromDatabase);

    // Cache the result
    this.setCache(cacheKey, recipes);

    return recipes;
  }

  /**
   * Get initial recipes (optimized with persistent cache and offline support)
   * Returns cached data immediately if available, fetches in background
   */
  static async getInitialRecipes(limit: number = 30): Promise<Recipe[]> {
    // Initialize cache if not done
    await this.initializeCache();

    // Return persistent cache immediately if available
    if (this.persistentCache && this.persistentCache.length > 0) {
      console.log('⚡ Returning recipes from persistent cache');

      // Fetch fresh data in background if online (don't await)
      if (offlineService.isOnline()) {
        this.refreshCacheInBackground();
      }

      return this.persistentCache.slice(0, limit);
    }

    // Check if offline and use offline service cache
    if (offlineService.isOffline()) {
      console.log('📱 Device offline, checking offline cache...');
      const cachedRecipes = await offlineService.getCachedRecipes();
      if (cachedRecipes.length > 0) {
        console.log(`📦 Loaded ${cachedRecipes.length} recipes from offline cache`);
        return cachedRecipes.slice(0, limit);
      }
    }

    // No cache available, fetch from network
    console.log('🌐 Fetching recipes from network...');
    const cacheKey = `initial-recipes-${limit}`;

    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, title, image_url, difficulty, preparation_time, category, base_spirit, tags, description')
        .eq('is_public', true)
        .order('title')
        .limit(limit);

      if (error) {
        console.error('Error fetching initial recipes:', error);
        return [];
      }

      const recipes = (data || []).map(item => this.mapFromDatabaseLite(item));

      // Cache the result
      this.setCache(cacheKey, recipes);

      // Cache for offline use
      await offlineService.cacheRecipes(recipes);

      // Fetch full data in background
      this.fetchAndCacheAllRecipes();

      return recipes;
    } catch (error) {
      console.error('Network error fetching recipes:', error);
      // Try offline cache as fallback
      const cachedRecipes = await offlineService.getCachedRecipes();
      return cachedRecipes.slice(0, limit);
    }
  }

  /**
   * Refresh cache in background (non-blocking)
   */
  private static refreshCacheInBackground(): void {
    setTimeout(async () => {
      try {
        const recipes = await this.fetchAllRecipesFromDB();
        if (recipes.length > 0) {
          await this.saveToPersistentCache(recipes);
        }
      } catch (error) {
        console.error('Background cache refresh failed:', error);
      }
    }, 2000); // Wait 2 seconds before refreshing
  }

  /**
   * Fetch all recipes from database
   */
  private static async fetchAllRecipesFromDB(): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('is_public', true)
      .order('title');

    if (error) {
      console.error('Error fetching all recipes:', error);
      return [];
    }

    return (data || []).map(this.mapFromDatabase);
  }

  /**
   * Fetch and cache all recipes in background
   */
  private static async fetchAndCacheAllRecipes(): Promise<void> {
    setTimeout(async () => {
      try {
        const recipes = await this.fetchAllRecipesFromDB();
        if (recipes.length > 0) {
          await this.saveToPersistentCache(recipes);
        }
      } catch (error) {
        console.error('Background fetch failed:', error);
      }
    }, 1000);
  }

  /**
   * Get recipe by ID
   */
  static async getRecipeById(id: string): Promise<Recipe | null> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching recipe:', error);
      return null;
    }

    return data ? this.mapFromDatabase(data) : null;
  }

  /**
   * Get recipes by category
   */
  static async getRecipesByCategory(category: string): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('category', category)
      .eq('is_public', true)
      .order('title');

    if (error) {
      console.error('Error fetching recipes by category:', error);
      return [];
    }

    return (data || []).map(this.mapFromDatabase);
  }

  /**
   * Get recipes by base spirit
   */
  static async getRecipesBySpirit(spirit: string): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('base_spirit', spirit)
      .eq('is_public', true)
      .order('title');

    if (error) {
      console.error('Error fetching recipes by spirit:', error);
      return [];
    }

    return (data || []).map(this.mapFromDatabase);
  }

  /**
   * Search recipes
   */
  static async searchRecipes(query: string): Promise<Recipe[]> {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('is_public', true)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('title')
      .limit(50);

    if (error) {
      console.error('Error searching recipes:', error);
      return [];
    }

    return (data || []).map(this.mapFromDatabase);
  }

  /**
   * Filter recipes
   */
  static async filterRecipes(filters: RecipeFilters): Promise<Recipe[]> {
    let query = supabase
      .from('recipes')
      .select('*')
      .eq('is_public', true);

    // Apply filters
    if (filters.spirits && filters.spirits.length > 0) {
      query = query.in('base_spirit', filters.spirits);
    }

    if (filters.difficulty && filters.difficulty.length > 0) {
      query = query.in('difficulty', filters.difficulty);
    }

    if (filters.category && filters.category.length > 0) {
      query = query.in('category', filters.category);
    }

    if (filters.abvRange) {
      query = query
        .gte('abv', filters.abvRange.min)
        .lte('abv', filters.abvRange.max);
    }

    if (filters.preparationTimeMax) {
      query = query.lte('preparation_time', filters.preparationTimeMax);
    }

    const { data, error } = await query.order('title').limit(100);

    if (error) {
      console.error('Error filtering recipes:', error);
      return [];
    }

    return (data || []).map(this.mapFromDatabase);
  }

  /**
   * Map database record to Recipe type (lite version for initial load)
   * Only maps essential fields for faster processing
   */
  private static mapFromDatabaseLite(data: any): Recipe {
    return {
      id: data.id,
      title: data.title,
      name: data.title,
      description: data.description || '',
      createdAt: new Date(),
      updatedAt: new Date(),

      ingredients: [],
      instructions: [],

      category: data.category || 'classic',
      difficulty: data.difficulty || 'intermediate',
      time: data.preparation_time ? `${data.preparation_time} min` : '5 min',
      recipeType: 'cocktail',

      baseSpirit: data.base_spirit,
      spiritsUsed: [],
      flavorProfiles: [],
      abv: 0,
      complexity: 0.5,

      preparationTime: data.preparation_time || 5,
      servings: 1,
      tools: [],

      image: getCocktailImage(data.id, data.image_url || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=240&h=160&fit=crop'),
      imageUrl: data.image_url,

      tags: data.tags || [],
      isPublic: true,
      likes: 0,
      saves: 0,
    };
  }

  /**
   * Map database record to Recipe type (full version)
   */
  private static mapFromDatabase(data: any): Recipe {
    return {
      id: data.id,
      title: data.title,
      name: data.title, // Add name field for compatibility with RecipeCard
      description: data.description || '',
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),

      // Parse ingredients from JSON
      ingredients: typeof data.ingredients === 'string'
        ? JSON.parse(data.ingredients)
        : data.ingredients,
      instructions: data.instructions || [],
      garnish: data.garnish,
      glassware: data.glassware,

      category: data.category,
      difficulty: data.difficulty || 'intermediate',
      time: data.preparation_time ? `${data.preparation_time} min` : '5 min', // Add time field for RecipeCard
      recipeType: data.recipe_type,

      baseSpirit: data.base_spirit,
      spiritsUsed: data.spirits_used || [],
      flavorProfiles: data.flavor_profiles || [],
      abv: parseFloat(data.abv) || 0,
      complexity: parseFloat(data.complexity) || 0.5,

      preparationTime: data.preparation_time,
      servings: data.servings || 1,
      tools: data.tools || [],

      image: getCocktailImage(data.id, data.image_url || 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=240&h=160&fit=crop'), // Map imageUrl to image for RecipeCard compatibility
      imageUrl: data.image_url,
      sourceUrl: data.source_url,
      videoUrl: data.video_url,

      tags: data.tags || [],
      occasion: data.occasion || [],
      season: data.season || [],
      timeOfDay: data.time_of_day || [],

      createdBy: data.created_by,
      isPublic: data.is_public,
      likes: data.likes || 0,
      saves: data.saves || 0,

      nutrition: {
        calories: data.calories,
        sugar: data.sugar ? parseFloat(data.sugar) : undefined,
        carbs: data.carbs ? parseFloat(data.carbs) : undefined,
      },

      // Parse history data from JSON if available
      history: data.history ? (typeof data.history === 'string' ? JSON.parse(data.history) : data.history) : undefined,
    };
  }
}
