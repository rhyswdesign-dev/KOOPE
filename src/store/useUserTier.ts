/**
 * User Tier Store
 * Manages user subscription tier (FREE, KOOPE+, KOOPE PRO)
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type UserTier = 'FREE' | 'PLUS' | 'PRO';

interface UserTierState {
  // Current tier
  tier: UserTier;

  // Subscription metadata
  subscriptionStatus: 'active' | 'canceled' | 'expired' | 'trial' | null;
  subscriptionEndDate: string | null;

  // Trial information
  isTrialActive: boolean;
  trialEndDate: string | null;

  // Actions
  setTier: (tier: UserTier) => void;
  setSubscriptionStatus: (status: 'active' | 'canceled' | 'expired' | 'trial') => void;
  setSubscriptionEndDate: (date: string | null) => void;
  startTrial: (tier: UserTier, durationDays: number) => void;
  cancelSubscription: () => void;
  endTrial: () => void;

  // Helpers
  isPremium: () => boolean;
  isProUser: () => boolean;
}

export const useUserTier = create<UserTierState>()(
  persist(
    (set, get) => ({
      // Initial state
      tier: 'FREE',
      subscriptionStatus: null,
      subscriptionEndDate: null,
      isTrialActive: false,
      trialEndDate: null,

      // Actions
      setTier: (tier: UserTier) => set({ tier }),

      setSubscriptionStatus: (status) => set({ subscriptionStatus: status }),

      setSubscriptionEndDate: (date) => set({ subscriptionEndDate: date }),

      startTrial: (tier: UserTier, durationDays: number) => {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + durationDays);

        set({
          tier,
          isTrialActive: true,
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
          trialEndDate: null,
          subscriptionStatus: null,
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
    }),
    {
      name: 'user-tier-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
