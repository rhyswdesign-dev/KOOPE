/**
 * Shopping Cart Store — P4 Infrastructure
 *
 * Zustand store with:
 *   - Local persistence via AsyncStorage (offline-first)
 *   - Supabase sync for cross-device access
 *   - Recipe-linked items (knows which recipe needs this ingredient)
 *   - Affiliate link integration
 *   - Analytics tracking on add/remove
 *
 * Replaces the old CartContext useReducer that lost state on app close.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';
import { log } from '../lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ShoppingCartItem {
  /** Unique ID for this cart item */
  id: string;
  /** Ingredient/product name */
  name: string;
  /** Category (spirit, liqueur, mixer, etc.) */
  category: string;
  /** Quantity string (e.g., "750ml", "1 bottle") */
  quantity: string;
  /** Which recipe(s) need this ingredient */
  recipeIds: string[];
  /** Recipe names for display */
  recipeNames: string[];
  /** Estimated price range */
  priceEstimate?: string;
  /** Is this item checked off? */
  isChecked: boolean;
  /** When this was added */
  addedAt: string;
  /** Notes from user */
  notes?: string;
}

interface ShoppingCartState {
  items: ShoppingCartItem[];
  lastSyncedAt: string | null;
  isSyncing: boolean;

  // Actions
  addItem: (item: Omit<ShoppingCartItem, 'id' | 'isChecked' | 'addedAt'>) => void;
  removeItem: (itemId: string) => void;
  toggleChecked: (itemId: string) => void;
  updateNotes: (itemId: string, notes: string) => void;
  clearChecked: () => void;
  clearAll: () => void;

  // Bulk operations
  addMissingIngredients: (ingredients: Array<{ name: string; category: string; recipeId?: string; recipeName?: string }>) => void;

  // Sync
  syncToServer: () => Promise<void>;
  syncFromServer: () => Promise<void>;

  // Helpers
  getItemCount: () => number;
  getCheckedCount: () => number;
  hasItem: (ingredientName: string) => boolean;
  getItemsByRecipe: (recipeId: string) => ShoppingCartItem[];
  exportAsText: () => string;
}

// ============================================================================
// STORE
// ============================================================================

export const useShoppingCart = create<ShoppingCartState>()(
  persist(
    (set, get) => ({
      items: [],
      lastSyncedAt: null,
      isSyncing: false,

      addItem: (item) => {
        const existing = get().items.find(
          i => i.name.toLowerCase() === item.name.toLowerCase()
        );

        if (existing) {
          // Merge recipe references instead of duplicating
          set(state => ({
            items: state.items.map(i =>
              i.id === existing.id
                ? {
                    ...i,
                    recipeIds: [...new Set([...i.recipeIds, ...item.recipeIds])],
                    recipeNames: [...new Set([...i.recipeNames, ...item.recipeNames])],
                  }
                : i
            ),
          }));
          get().syncToServer();
          return;
        }

        const newItem: ShoppingCartItem = {
          ...item,
          id: generateId(),
          isChecked: false,
          addedAt: new Date().toISOString(),
        };

        set(state => ({ items: [...state.items, newItem] }));

        trackEvent(ANALYTICS_EVENTS.CART_ITEM_ADDED, {
          [ANALYTICS_PROPS.INGREDIENT_NAME]: item.name,
          [ANALYTICS_PROPS.SOURCE]: 'shopping_cart',
        });

        get().syncToServer();
      },

      removeItem: (itemId) => {
        set(state => ({
          items: state.items.filter(i => i.id !== itemId),
        }));
        get().syncToServer();
      },

      toggleChecked: (itemId) => {
        set(state => ({
          items: state.items.map(i =>
            i.id === itemId ? { ...i, isChecked: !i.isChecked } : i
          ),
        }));
      },

      updateNotes: (itemId, notes) => {
        set(state => ({
          items: state.items.map(i =>
            i.id === itemId ? { ...i, notes } : i
          ),
        }));
      },

      clearChecked: () => {
        set(state => ({
          items: state.items.filter(i => !i.isChecked),
        }));
        get().syncToServer();
      },

      clearAll: () => {
        set({ items: [] });
        get().syncToServer();
      },

      addMissingIngredients: (ingredients) => {
        const current = get().items;

        for (const ing of ingredients) {
          const existing = current.find(
            i => i.name.toLowerCase() === ing.name.toLowerCase()
          );

          if (!existing) {
            get().addItem({
              name: ing.name,
              category: ing.category,
              quantity: '1',
              recipeIds: ing.recipeId ? [ing.recipeId] : [],
              recipeNames: ing.recipeName ? [ing.recipeName] : [],
            });
          }
        }
      },

      // Server sync
      syncToServer: async () => {
        try {
          set({ isSyncing: true });

          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            set({ isSyncing: false });
            return;
          }

          const items = get().items;

          await supabase
            .from('user_shopping_cart')
            .upsert({
              user_id: session.user.id,
              items: JSON.stringify(items),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id' });

          set({ lastSyncedAt: new Date().toISOString(), isSyncing: false });
        } catch (error) {
          log.error('ShoppingCart', 'Sync to server failed', error);
          set({ isSyncing: false });
        }
      },

      syncFromServer: async () => {
        try {
          set({ isSyncing: true });

          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            set({ isSyncing: false });
            return;
          }

          const { data, error } = await supabase
            .from('user_shopping_cart')
            .select('items, updated_at')
            .eq('user_id', session.user.id)
            .single();

          if (error || !data) {
            set({ isSyncing: false });
            return;
          }

          // Only use server data if it's newer than local
          const serverUpdated = new Date(data.updated_at).getTime();
          const localSynced = get().lastSyncedAt
            ? new Date(get().lastSyncedAt!).getTime()
            : 0;

          if (serverUpdated > localSynced) {
            const serverItems = typeof data.items === 'string'
              ? JSON.parse(data.items)
              : data.items;

            set({
              items: serverItems || [],
              lastSyncedAt: data.updated_at,
              isSyncing: false,
            });
          } else {
            set({ isSyncing: false });
          }
        } catch (error) {
          log.error('ShoppingCart', 'Sync from server failed', error);
          set({ isSyncing: false });
        }
      },

      // Helpers
      getItemCount: () => get().items.length,
      getCheckedCount: () => get().items.filter(i => i.isChecked).length,

      hasItem: (ingredientName) =>
        get().items.some(
          i => i.name.toLowerCase() === ingredientName.toLowerCase()
        ),

      getItemsByRecipe: (recipeId) =>
        get().items.filter(i => i.recipeIds.includes(recipeId)),

      exportAsText: () => {
        const items = get().items;
        if (items.length === 0) return 'Shopping list is empty';

        const byCategory = new Map<string, ShoppingCartItem[]>();
        for (const item of items) {
          const cat = item.category || 'Other';
          if (!byCategory.has(cat)) byCategory.set(cat, []);
          byCategory.get(cat)!.push(item);
        }

        let text = 'KOOPE Shopping List\n';
        text += '==================\n\n';

        for (const [category, catItems] of byCategory) {
          text += `${category.toUpperCase()}\n`;
          for (const item of catItems) {
            const check = item.isChecked ? '[x]' : '[ ]';
            const recipes = item.recipeNames.length > 0
              ? ` (for ${item.recipeNames.join(', ')})`
              : '';
            text += `  ${check} ${item.name}${recipes}\n`;
          }
          text += '\n';
        }

        return text.trim();
      },
    }),
    {
      name: 'koope-shopping-cart',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ============================================================================
// HELPERS
// ============================================================================

function generateId(): string {
  return `cart_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
