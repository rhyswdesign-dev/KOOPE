/**
 * Multi-Bar Profile Store
 * Manages multiple home bar profiles per user.
 *
 * Tier limits:
 *   FREE:  1 bar profile (default only)
 *   PLUS:  2 bar profiles
 *   PRO:   Unlimited bar profiles
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarIngredient } from '../services/homeBarService';
import { TIER_LIMITS } from '../config/tierAccess';
import type { UserTier } from '../config/tierAccess';
import { log } from '../lib/logger';

export interface BarProfile {
  id: string;
  name: string;
  description?: string;
  ingredients: BarIngredient[];
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

interface MultiBarState {
  /** All bar profiles for the current user */
  bars: BarProfile[];
  /** Currently active bar profile ID */
  activeBarId: string;

  // Actions
  /** Create a new bar profile. Returns the new bar's ID or null if at limit. */
  createBar: (name: string, tier: UserTier, description?: string) => string | null;
  /** Delete a bar profile (cannot delete the default bar) */
  deleteBar: (barId: string) => boolean;
  /** Rename a bar profile */
  renameBar: (barId: string, name: string, description?: string) => void;
  /** Switch the active bar */
  setActiveBar: (barId: string) => void;
  /** Get the active bar profile */
  getActiveBar: () => BarProfile;
  /** Get ingredients for the active bar */
  getActiveIngredients: () => BarIngredient[];
  /** Add ingredient to the active bar */
  addIngredient: (ingredient: BarIngredient) => void;
  /** Remove ingredient from the active bar */
  removeIngredient: (ingredientId: string) => void;
  /** Update ingredient in the active bar */
  updateIngredient: (ingredientId: string, updates: Partial<BarIngredient>) => void;
  /** Set all ingredients for the active bar (used for bulk import / migration) */
  setIngredients: (ingredients: BarIngredient[]) => void;
  /** Check if user can create another bar profile */
  canCreateBar: (tier: UserTier) => boolean;
  /** Get the bar limit for a tier */
  getBarLimit: (tier: UserTier) => number;
  /** Migrate from single-bar HomeBarService storage */
  migrateFromSingleBar: (ingredients: BarIngredient[]) => void;
}

const DEFAULT_BAR_ID = 'default-bar';

function createDefaultBar(): BarProfile {
  const now = new Date().toISOString();
  return {
    id: DEFAULT_BAR_ID,
    name: 'My Home Bar',
    ingredients: [],
    createdAt: now,
    updatedAt: now,
    isDefault: true,
  };
}

function generateBarId(): string {
  return `bar_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export const useMultiBar = create<MultiBarState>()(
  persist(
    (set, get) => ({
      bars: [createDefaultBar()],
      activeBarId: DEFAULT_BAR_ID,

      createBar: (name: string, tier: UserTier, description?: string) => {
        const state = get();
        const limit = TIER_LIMITS[tier].maxBarProfiles;

        if (state.bars.length >= limit) {
          log.warn('MultiBar', 'Bar limit reached', { current: state.bars.length, limit, tier });
          return null;
        }

        const newBar: BarProfile = {
          id: generateBarId(),
          name,
          description,
          ingredients: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isDefault: false,
        };

        set({ bars: [...state.bars, newBar] });
        log.info('MultiBar', 'Created new bar profile', { id: newBar.id, name });
        return newBar.id;
      },

      deleteBar: (barId: string) => {
        const state = get();
        const bar = state.bars.find(b => b.id === barId);

        if (!bar || bar.isDefault) {
          log.warn('MultiBar', 'Cannot delete default bar or bar not found', { barId });
          return false;
        }

        const updatedBars = state.bars.filter(b => b.id !== barId);
        const newActiveId = state.activeBarId === barId ? DEFAULT_BAR_ID : state.activeBarId;

        set({ bars: updatedBars, activeBarId: newActiveId });
        log.info('MultiBar', 'Deleted bar profile', { barId, name: bar.name });
        return true;
      },

      renameBar: (barId: string, name: string, description?: string) => {
        set(state => ({
          bars: state.bars.map(bar =>
            bar.id === barId
              ? { ...bar, name, description: description ?? bar.description, updatedAt: new Date().toISOString() }
              : bar
          ),
        }));
      },

      setActiveBar: (barId: string) => {
        const state = get();
        if (state.bars.some(b => b.id === barId)) {
          set({ activeBarId: barId });
          log.info('MultiBar', 'Switched active bar', { barId });
        }
      },

      getActiveBar: () => {
        const state = get();
        return state.bars.find(b => b.id === state.activeBarId) ?? state.bars[0] ?? createDefaultBar();
      },

      getActiveIngredients: () => {
        return get().getActiveBar().ingredients;
      },

      addIngredient: (ingredient: BarIngredient) => {
        set(state => ({
          bars: state.bars.map(bar =>
            bar.id === state.activeBarId
              ? { ...bar, ingredients: [...bar.ingredients, ingredient], updatedAt: new Date().toISOString() }
              : bar
          ),
        }));
      },

      removeIngredient: (ingredientId: string) => {
        set(state => ({
          bars: state.bars.map(bar =>
            bar.id === state.activeBarId
              ? {
                  ...bar,
                  ingredients: bar.ingredients.filter(i => i.id !== ingredientId),
                  updatedAt: new Date().toISOString(),
                }
              : bar
          ),
        }));
      },

      updateIngredient: (ingredientId: string, updates: Partial<BarIngredient>) => {
        set(state => ({
          bars: state.bars.map(bar =>
            bar.id === state.activeBarId
              ? {
                  ...bar,
                  ingredients: bar.ingredients.map(i =>
                    i.id === ingredientId ? { ...i, ...updates } : i
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : bar
          ),
        }));
      },

      setIngredients: (ingredients: BarIngredient[]) => {
        set(state => ({
          bars: state.bars.map(bar =>
            bar.id === state.activeBarId
              ? { ...bar, ingredients, updatedAt: new Date().toISOString() }
              : bar
          ),
        }));
      },

      canCreateBar: (tier: UserTier) => {
        const state = get();
        return state.bars.length < TIER_LIMITS[tier].maxBarProfiles;
      },

      getBarLimit: (tier: UserTier) => {
        return TIER_LIMITS[tier].maxBarProfiles;
      },

      migrateFromSingleBar: (ingredients: BarIngredient[]) => {
        set(state => {
          const defaultBar = state.bars.find(b => b.isDefault);
          if (defaultBar && defaultBar.ingredients.length === 0 && ingredients.length > 0) {
            log.info('MultiBar', 'Migrated from single-bar storage', { count: ingredients.length });
            return {
              bars: state.bars.map(bar =>
                bar.isDefault
                  ? { ...bar, ingredients, updatedAt: new Date().toISOString() }
                  : bar
              ),
            };
          }
          return state;
        });
      },
    }),
    {
      name: 'multi-bar-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
