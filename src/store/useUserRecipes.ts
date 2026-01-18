/**
 * USER RECIPES STORE
 * Manages user-created, AI-generated, and modified recipes
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../lib/logger';

export interface UserRecipe {
  id: string;
  name: string;
  type: 'created' | 'ai_generated' | 'modified' | 'imported';
  createdAt: Date;
  updatedAt: Date;
  description?: string;
  ingredients: Array<{
    name: string;
    amount: string;
    unit?: string;
  }>;
  instructions: string[];
  image?: string;
  tags?: string[];
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  prepTime?: number; // in minutes
  servings?: number;
  base?: string; // primary spirit/base
  notes?: string;
  rating?: number; // 1-5 stars
}

interface UserRecipesState {
  recipes: UserRecipe[];
  isLoading: boolean;

  // Actions
  addRecipe: (recipe: Omit<UserRecipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateRecipe: (id: string, updates: Partial<UserRecipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  getRecipeById: (id: string) => UserRecipe | undefined;
  getRecipesByType: (type: UserRecipe['type']) => UserRecipe[];
  loadRecipes: () => Promise<void>;
  clearAllRecipes: () => Promise<void>;
}

const STORAGE_KEY = 'user_recipes';

export const useUserRecipes = create<UserRecipesState>((set, get) => ({
  recipes: [],
  isLoading: false,

  addRecipe: async (recipeData) => {
    try {
      const newRecipe: UserRecipe = {
        ...recipeData,
        id: `recipe_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedRecipes = [...get().recipes, newRecipe];

      set({ recipes: updatedRecipes });

      // Save to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecipes));

      log.info('UserRecipesStore', 'Recipe added successfully', { recipeName: newRecipe.name });
    } catch (error) {
      log.error('UserRecipesStore', 'Error adding recipe', error);
    }
  },

  updateRecipe: async (id, updates) => {
    try {
      const updatedRecipes = get().recipes.map(recipe =>
        recipe.id === id
          ? { ...recipe, ...updates, updatedAt: new Date() }
          : recipe
      );

      set({ recipes: updatedRecipes });

      // Save to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecipes));

      log.info('UserRecipesStore', 'Recipe updated successfully', { id });
    } catch (error) {
      log.error('UserRecipesStore', 'Error updating recipe', error, { id });
    }
  },

  deleteRecipe: async (id) => {
    try {
      const updatedRecipes = get().recipes.filter(recipe => recipe.id !== id);

      set({ recipes: updatedRecipes });

      // Save to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRecipes));

      log.info('UserRecipesStore', 'Recipe deleted successfully', { id });
    } catch (error) {
      log.error('UserRecipesStore', 'Error deleting recipe', error, { id });
    }
  },

  getRecipeById: (id) => {
    return get().recipes.find(recipe => recipe.id === id);
  },

  getRecipesByType: (type) => {
    return get().recipes.filter(recipe => recipe.type === type);
  },

  loadRecipes: async () => {
    try {
      set({ isLoading: true });

      const stored = await AsyncStorage.getItem(STORAGE_KEY);

      if (stored) {
        const recipes = JSON.parse(stored).map((recipe: any) => ({
          ...recipe,
          createdAt: new Date(recipe.createdAt),
          updatedAt: new Date(recipe.updatedAt),
        }));

        set({ recipes, isLoading: false });
        log.info('UserRecipesStore', `Loaded ${recipes.length} user recipes from storage`);
      } else {
        set({ isLoading: false });
        log.info('UserRecipesStore', 'No user recipes found in storage');
      }
    } catch (error) {
      log.error('UserRecipesStore', 'Error loading recipes', error);
      set({ isLoading: false });
    }
  },

  clearAllRecipes: async () => {
    try {
      set({ recipes: [] });
      await AsyncStorage.removeItem(STORAGE_KEY);
      log.info('UserRecipesStore', 'All user recipes cleared');
    } catch (error) {
      log.error('UserRecipesStore', 'Error clearing recipes', error);
    }
  },
}));

/**
 * Initialize recipes on app start
 */
export const initializeUserRecipes = async () => {
  await useUserRecipes.getState().loadRecipes();
};