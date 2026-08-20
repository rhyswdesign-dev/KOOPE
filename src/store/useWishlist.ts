/**
 * Wishlist Store
 *
 * Bottles you've spotted but don't own yet — scan in a store, note the price,
 * compare later. Completely separate from the shelf (which is what you own).
 *
 * - Local persistence via AsyncStorage (offline-first — still the source of
 *   truth, and the only store for signed-out or offline users)
 * - Best-effort Supabase mirror to `want_list_items` (migration 035) via
 *   wantListService, so the list survives a reinstall and is query-able for
 *   brand insights. Never blocks or fails a local action.
 * - Free tier cap: 10 saved items
 * - Supports multiple price sightings per bottle (different stores / dates).
 *   Price sightings sync separately, through spottedPriceService ->
 *   spotted_prices (migration 031) — the one write path for prices.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  syncWantListItemSaved,
  syncWantListItemRemoved,
  fetchWantList,
} from '../services/wantListService';
import { useXPSystem, XP_EARNING_RATES } from './useXPSystem';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PriceEntry {
  price: number;
  currency: string; // 'GBP' | 'USD' | 'EUR' etc.
  locationLabel: string; // free-text: "Total Wine Miami", "Waitrose London"
  dateSeen: string; // ISO
}

export interface WishlistItem {
  bottleId: string;
  name: string;
  brand: string;
  type: string;
  imageUri?: string;
  dateSaved: string; // ISO — when first saved
  priceEntries: PriceEntry[];
}

export const WISHLIST_FREE_CAP = 10;

interface WishlistState {
  items: WishlistItem[];

  // Actions
  saveToWishlist: (
    bottle: { id?: string; name: string; brand: string; type?: string; imageUri?: string },
    priceEntry?: Omit<PriceEntry, 'dateSeen'>,
  ) => 'saved' | 'duplicate' | 'cap_reached';

  addPriceEntry: (bottleId: string, entry: Omit<PriceEntry, 'dateSeen'>) => void;
  removeFromWishlist: (bottleId: string) => void;
  isWishlisted: (bottleId: string) => boolean;
  getItem: (bottleId: string) => WishlistItem | undefined;
  lowestPrice: (bottleId: string) => PriceEntry | undefined;
  clearAll: () => void;

  /**
   * One-time pull-and-merge from `want_list_items` on sign-in / app load.
   * Union of both sides — never drops a local item that the server hasn't
   * seen yet, and pushes those local-only items up.
   */
  syncFromServer: (userId?: string | null) => Promise<void>;
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      saveToWishlist: (bottle, priceEntry) => {
        const state = get();
        const bottleId =
          bottle.id || `${bottle.name}_${bottle.brand}`.toLowerCase().replace(/\s+/g, '_');

        // Already saved — just add price entry if provided
        const existing = state.items.find((i) => i.bottleId === bottleId);
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
          priceEntries: priceEntry ? [{ ...priceEntry, dateSeen: now }] : [],
        };

        set((state) => ({ items: [newItem, ...state.items] }));

        // Genuinely new save (the 'duplicate' and 'cap_reached' paths both
        // returned above) — reward it and mirror it to the server.
        useXPSystem
          .getState()
          .earnXP(
            XP_EARNING_RATES.wantListAdd,
            'want-list-add',
            `Added to want list: ${newItem.name}`,
          );
        void syncWantListItemSaved(newItem);

        return 'saved';
      },

      addPriceEntry: (bottleId, entry) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.bottleId === bottleId
              ? {
                  ...item,
                  priceEntries: [
                    ...item.priceEntries,
                    { ...entry, dateSeen: new Date().toISOString() },
                  ],
                }
              : item,
          ),
        }));
      },

      removeFromWishlist: (bottleId) => {
        set((state) => ({ items: state.items.filter((i) => i.bottleId !== bottleId) }));
        void syncWantListItemRemoved(bottleId);
      },

      isWishlisted: (bottleId) => {
        return get().items.some((i) => i.bottleId === bottleId);
      },

      getItem: (bottleId) => {
        return get().items.find((i) => i.bottleId === bottleId);
      },

      lowestPrice: (bottleId) => {
        const item = get().items.find((i) => i.bottleId === bottleId);
        if (!item || item.priceEntries.length === 0) return undefined;
        return item.priceEntries.reduce((lowest, entry) =>
          entry.price < lowest.price ? entry : lowest,
        );
      },

      clearAll: () => set({ items: [] }),

      syncFromServer: async (userId) => {
        const remote = await fetchWantList(userId);
        const local = get().items;

        // Local wins on conflict: it carries priceEntries, which the server
        // table deliberately doesn't store (prices live in spotted_prices).
        const localIds = new Set(local.map((i) => i.bottleId));
        const remoteOnly: WishlistItem[] = remote
          .filter((r) => !localIds.has(r.bottleId))
          .map((r) => ({
            bottleId: r.bottleId,
            name: r.name,
            brand: r.brand,
            type: r.type,
            imageUri: r.imageUri,
            dateSaved: r.dateSaved,
            priceEntries: [],
          }));

        if (remoteOnly.length > 0) {
          // Deliberately not capped at WISHLIST_FREE_CAP — this is the user's
          // own list coming back after a reinstall, not a new save. The cap
          // gates new saves, and saveToWishlist still enforces it.
          set((state) => ({
            items: [...state.items, ...remoteOnly].sort((a, b) =>
              b.dateSaved.localeCompare(a.dateSaved),
            ),
          }));
        }

        // Push anything the server hasn't seen (saved offline or signed out).
        const remoteIds = new Set(remote.map((r) => r.bottleId));
        for (const item of local) {
          if (!remoteIds.has(item.bottleId)) {
            void syncWantListItemSaved(item, userId);
          }
        }
      },
    }),
    {
      name: 'koope_wishlist',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
