/**
 * Wishlist Store
 *
 * Bottles you've spotted but don't own yet — scan in a store, note the price,
 * compare later. Completely separate from the shelf (which is what you own).
 *
 * - Local persistence via AsyncStorage (offline-first, no Supabase sync initially)
 * - Free tier cap: 10 saved items
 * - Supports multiple price sightings per bottle (different stores / dates)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PriceEntry {
  price: number;
  currency: string;       // 'GBP' | 'USD' | 'EUR' etc.
  locationLabel: string;  // free-text: "Total Wine Miami", "Waitrose London"
  dateSeen: string;       // ISO
}

export interface WishlistItem {
  bottleId: string;
  name: string;
  brand: string;
  type: string;
  imageUri?: string;
  dateSaved: string;        // ISO — when first saved
  priceEntries: PriceEntry[];
}

export const WISHLIST_FREE_CAP = 10;

interface WishlistState {
  items: WishlistItem[];

  // Actions
  saveToWishlist: (
    bottle: { id?: string; name: string; brand: string; type?: string; imageUri?: string },
    priceEntry?: Omit<PriceEntry, 'dateSeen'>
  ) => 'saved' | 'duplicate' | 'cap_reached';

  addPriceEntry: (bottleId: string, entry: Omit<PriceEntry, 'dateSeen'>) => void;
  removeFromWishlist: (bottleId: string) => void;
  isWishlisted: (bottleId: string) => boolean;
  getItem: (bottleId: string) => WishlistItem | undefined;
  lowestPrice: (bottleId: string) => PriceEntry | undefined;
  clearAll: () => void;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      saveToWishlist: (bottle, priceEntry) => {
        const state = get();
        const bottleId = bottle.id || `${bottle.name}_${bottle.brand}`.toLowerCase().replace(/\s+/g, '_');

        // Already saved — just add price entry if provided
        const existing = state.items.find(i => i.bottleId === bottleId);
        if (existing) {
          if (priceEntry) {
            get().addPriceEntry(bottleId, priceEntry);
          }
          return 'duplicate';
        }

        // Cap check (Free tier enforced at call site — store just records state)
        if (state.items.length >= WISHLIST_FREE_CAP) {
          return 'cap_reached';
        }

        const now = new Date().toISOString();
        const newItem: WishlistItem = {
          bottleId,
          name: bottle.name,
          brand: bottle.brand,
          type: bottle.type || 'spirit',
          imageUri: bottle.imageUri,
          dateSaved: now,
          priceEntries: priceEntry
            ? [{ ...priceEntry, dateSeen: now }]
            : [],
        };

        set(state => ({ items: [newItem, ...state.items] }));
        return 'saved';
      },

      addPriceEntry: (bottleId, entry) => {
        set(state => ({
          items: state.items.map(item =>
            item.bottleId === bottleId
              ? {
                  ...item,
                  priceEntries: [
                    ...item.priceEntries,
                    { ...entry, dateSeen: new Date().toISOString() },
                  ],
                }
              : item
          ),
        }));
      },

      removeFromWishlist: (bottleId) => {
        set(state => ({ items: state.items.filter(i => i.bottleId !== bottleId) }));
      },

      isWishlisted: (bottleId) => {
        return get().items.some(i => i.bottleId === bottleId);
      },

      getItem: (bottleId) => {
        return get().items.find(i => i.bottleId === bottleId);
      },

      lowestPrice: (bottleId) => {
        const item = get().items.find(i => i.bottleId === bottleId);
        if (!item || item.priceEntries.length === 0) return undefined;
        return item.priceEntries.reduce((lowest, entry) =>
          entry.price < lowest.price ? entry : lowest
        );
      },

      clearAll: () => set({ items: [] }),
    }),
    {
      name: 'koope_wishlist',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
