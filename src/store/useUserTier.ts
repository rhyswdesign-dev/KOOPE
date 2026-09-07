/**
 * User Tier Store
 * Manages user subscription tier (FREE, KOOPE+, KOOPE PRO)
 *
 * Phase 0.7 (tier collapse): the product is two tiers, FREE and KŌOPE+.
 * 'PRO' is a legacy value only — see the UserTier comment below and
 * `normalizeLegacyTier`. Every write path in this store (setTier,
 * startTrial, and the persist `migrate` hook for state written before this
 * pass) normalizes 'PRO' to 'PLUS', so `tier` can never actually read
 * 'PRO' after this store has run once.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 'PRO' is kept in the type for backward compatibility with code that
 * still checks `tier === 'PRO'` (tierAccess.ts's UserTier has the same
 * note) — but this store never actually stores it; see
 * `normalizeLegacyTier`.
 */
export type UserTier = 'FREE' | 'PLUS' | 'PRO';

/** Legacy-mapping shim (workplan 0.7 accept criterion): PRO -> PLUS. */
function normalizeLegacyTier(tier: UserTier): UserTier {
  return tier === 'PRO' ? 'PLUS' : tier;
}

interface UserTierState {
  // Current tier
  tier: UserTier;

  // Subscription metadata
  subscriptionStatus: 'active' | 'canceled' | 'expired' | 'trial' | null;
  subscriptionEndDate: string | null;

  // Trial information
  isTrialActive: boolean;
  trialStartDate: string | null;
  trialEndDate: string | null;

  // Founder status
  isFounder: boolean;
  founderLockedPriceCents: number | null;
  founderNumber: number | null;

  /**
   * Phase 4 (state consolidation): Prestige is a separate RevenueCat
   * entitlement, not a rung on the FREE/PLUS/PRO ladder (see
   * entitlementMapping.ts's deriveEntitlementState — a Prestige-only
   * subscriber does NOT elevate `tier`, an intentionally-unresolved
   * product question, not a bug). This flag is the store-side home for
   * that fact so SubscriptionContext no longer has to keep its own
   * parallel copy of it.
   */
  isPrestige: boolean;

  // Actions
  setTier: (tier: UserTier) => void;
  setPrestigeStatus: (active: boolean) => void;
  setSubscriptionStatus: (status: 'active' | 'canceled' | 'expired' | 'trial') => void;
  setSubscriptionEndDate: (date: string | null) => void;
  startTrial: (tier: UserTier, durationDays: number) => void;
  /**
   * Phase 0.7: records trial metadata (isTrialActive/dates/status) WITHOUT
   * touching `tier`. Added so SubscriptionContext.startFreeTrial can record
   * "this purchase was a trial" after updateSubscriptionState(...) has
   * already set `tier` from the real RevenueCat entitlement — calling
   * startTrial() there instead would silently overwrite that with the
   * tier *requested*, not the tier RevenueCat actually granted. This is
   * the one genuine duplicate-write among the "5 imperative .getState()
   * sync sites" the workplan flags; the other 4 (dev-tier-override x2,
   * founder-status, and updateSubscriptionState's own tier sync) each
   * write something no other path writes and are not duplicates.
   */
  markTrialStarted: (durationDays: number) => void;
  cancelSubscription: () => void;
  endTrial: () => void;
  setFounderStatus: (isFounder: boolean, priceCents?: number, founderNumber?: number) => void;

  // Helpers
  isPremium: () => boolean;
  isProUser: () => boolean;
  isSubscriber: () => boolean;
  isInTrial: () => boolean;
}

export const useUserTier = create<UserTierState>()(
  persist(
    (set, get) => ({
      // Initial state
      tier: 'FREE',
      subscriptionStatus: null,
      subscriptionEndDate: null,
      isTrialActive: false,
      trialStartDate: null,
      trialEndDate: null,
      isFounder: false,
      founderLockedPriceCents: null,
      founderNumber: null,
      isPrestige: false,

      // Actions
      setTier: (tier: UserTier) => set({ tier: normalizeLegacyTier(tier) }),

      setPrestigeStatus: (active: boolean) => set({ isPrestige: active }),

      setSubscriptionStatus: (status) => set({ subscriptionStatus: status }),

      setSubscriptionEndDate: (date) => set({ subscriptionEndDate: date }),

      startTrial: (tier: UserTier, durationDays: number) => {
        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + durationDays);

        set({
          tier: normalizeLegacyTier(tier),
          isTrialActive: true,
          trialStartDate: now.toISOString(),
          trialEndDate: trialEnd.toISOString(),
          subscriptionStatus: 'trial',
        });
      },

      markTrialStarted: (durationDays: number) => {
        const now = new Date();
        const trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + durationDays);

        set({
          isTrialActive: true,
          trialStartDate: now.toISOString(),
          trialEndDate: trialEnd.toISOString(),
          subscriptionStatus: 'trial',
        });
      },

      cancelSubscription: () => {
        set({ subscriptionStatus: 'canceled' });
      },

      endTrial: () => {
        set({
          tier: 'FREE',
          isTrialActive: false,
          trialStartDate: null,
          trialEndDate: null,
          subscriptionStatus: null,
        });
      },

      setFounderStatus: (isFounder: boolean, priceCents?: number, founderNumber?: number) => {
        set({
          isFounder,
          founderLockedPriceCents: priceCents ?? null,
          founderNumber: founderNumber ?? null,
        });
      },

      // Helper methods
      isPremium: () => {
        const tier = get().tier;
        return tier === 'PLUS' || tier === 'PRO';
      },

      isProUser: () => {
        return get().tier === 'PRO';
      },

      isSubscriber: () => {
        const state = get();
        return state.tier === 'PLUS' || state.tier === 'PRO' || state.isPrestige;
      },

      isInTrial: () => {
        const state = get();
        if (!state.isTrialActive) return false;
        if (!state.trialEndDate) return false;
        return new Date(state.trialEndDate) > new Date();
      },
    }),
    {
      name: 'user-tier-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      // Phase 0.7: normalize any tier:'PRO' written to AsyncStorage before
      // the tier collapse — without this, a device that already had 'PRO'
      // persisted would keep reading 'PRO' back forever (setTier's
      // normalization only catches *future* writes, not what's already on
      // disk from before this pass).
      migrate: (persistedState) => {
        const state = persistedState as UserTierState;
        if (state?.tier === 'PRO') {
          return { ...state, tier: 'PLUS' };
        }
        return state;
      },
    },
  ),
);
