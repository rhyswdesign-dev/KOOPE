/**
 * Spotted Prices Store — the price journal (Value-on-scan v1, Phase 1.2)
 *
 * The single local source of truth for "I saw this bottle for $X at Y",
 * regardless of whether the bottle is wishlisted. Prior to this store,
 * spotted prices lived only inside useWishlist's per-item priceEntries —
 * which meant at-scan capture (before any save decision) had no home.
 *
 * Relationship to useWishlist.priceEntries: the wishlist entries stay as a
 * legacy display cache for HomeBarScreen's SAVED-grid pill (untouched this
 * pass); every NEW capture writes here via spottedPriceService (which also
 * syncs to Supabase spotted_prices). Existing wishlist entries are
 * backfilled into this journal once on first hydrate. Follow-up (not this
 * pass): point HomeBar's pill here and retire priceEntries.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useWishlist } from './useWishlist';

export interface SpottedPrice {
  bottleId: string;
  price: number;
  currency: string;
  locationLabel?: string;
  seenAt: string; // ISO
}

interface SpottedPricesState {
  entries: SpottedPrice[];
  /** One-time guard: wishlist priceEntries already copied in. */
  wishlistBackfillDone: boolean;

  logPrice: (entry: Omit<SpottedPrice, 'seenAt'> & { seenAt?: string }) => void;
  latestFor: (bottleId: string) => SpottedPrice | undefined;
  lowestFor: (bottleId: string) => SpottedPrice | undefined;
  backfillFromWishlist: () => void;
  clearAll: () => void;
}

export const useSpottedPrices = create<SpottedPricesState>()(
  persist(
    (set, get) => ({
      entries: [],
      wishlistBackfillDone: false,

      logPrice: (entry) => {
        const record: SpottedPrice = {
          bottleId: entry.bottleId,
          price: entry.price,
          currency: entry.currency,
          locationLabel: entry.locationLabel,
          seenAt: entry.seenAt ?? new Date().toISOString(),
        };
        set((state) => ({ entries: [record, ...state.entries] }));
      },

      latestFor: (bottleId) => {
        // entries are newest-first by construction
        return get().entries.find((e) => e.bottleId === bottleId);
      },

      lowestFor: (bottleId) => {
        const matches = get().entries.filter((e) => e.bottleId === bottleId);
        if (matches.length === 0) return undefined;
        return matches.reduce((lowest, e) => (e.price < lowest.price ? e : lowest));
      },

      backfillFromWishlist: () => {
        if (get().wishlistBackfillDone) return;
        const wishlistItems = useWishlist.getState().items;
        const migrated: SpottedPrice[] = wishlistItems.flatMap((item) =>
          item.priceEntries.map((p) => ({
            bottleId: item.bottleId,
            price: p.price,
            currency: p.currency,
            locationLabel: p.locationLabel,
            seenAt: p.dateSeen,
          })),
        );
        set((state) => ({
          entries: [...migrated, ...state.entries],
          wishlistBackfillDone: true,
        }));
      },

      clearAll: () => set({ entries: [] }),
    }),
    {
      name: 'koope_spotted_prices',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Run the one-time wishlist backfill after this store hydrates.
        // Deferred a tick so useWishlist's own hydration can complete first
        // (both stores hydrate on app start; wishlist is registered earlier).
        setTimeout(() => state?.backfillFromWishlist(), 500);
      },
    },
  ),
);
