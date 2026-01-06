/**
 * XP System Store
 * Manages XP earning, spending, and cocktail unlocking
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type XPSource =
  | 'daily-login'
  | 'lesson-complete'
  | 'make-cocktail'
  | 'save-recipe'
  | 'add-to-cart'
  | 'share-cocktail'
  | 'vault-daily-drop'
  | 'vault-seasonal-item'
  | 'profile-complete'
  | 'invite-friend'
  | 'cocktail-unlock'
  | 'other';

export interface XPTransaction {
  id: string;
  type: 'earn' | 'spend';
  amount: number;
  source: XPSource;
  description: string;
  cocktailId?: string;
  timestamp: string;
}

export interface XPStreaks {
  dailyLogin: number;
  lastLoginDate: string | null;
  unlockStreak: number;
  lastUnlockDate: string | null;
}

export interface CocktailUnlockCost {
  [key: string]: number;
}

// Default XP costs for cocktail unlocks
export const DEFAULT_COCKTAIL_COSTS: { [tier: string]: number } = {
  common: 150,
  popular: 250,
  signature: 400,
};

// XP earning rates
export const XP_EARNING_RATES = {
  dailyLogin: 10,
  lessonComplete: 25,
  makeCocktail: 50,
  saveRecipe: 5,
  addToCart: 5,
  shareCocktail: 15,
  vaultDailyDrop: 20,
  vaultSeasonalItem: 30,
  profileComplete: 50,
  inviteFriend: 100,
};

interface XPSystemState {
  // Core state
  balance: number;
  earnedToday: number;
  lastResetDate: string | null;
  unlockedCocktails: string[]; // Array of cocktail IDs unlocked with XP
  transactions: XPTransaction[];
  streaks: XPStreaks;
  cocktailCosts: CocktailUnlockCost; // Custom costs per cocktail

  // One-time rewards tracking
  hasCompletedProfile: boolean;

  // Actions
  earnXP: (amount: number, source: XPSource, description: string) => void;
  spendXP: (amount: number, cocktailId: string, description: string) => boolean;
  unlockCocktail: (cocktailId: string, cost: number) => boolean;
  getCocktailCost: (cocktailId: string) => number;
  setCocktailCost: (cocktailId: string, cost: number) => void;
  canAffordCocktail: (cocktailId: string) => boolean;
  isCocktailUnlockedWithXP: (cocktailId: string) => boolean;

  // Daily/Streak management
  checkDailyLogin: () => void;
  resetDailyEarnings: () => void;

  // Transaction history
  getRecentTransactions: (limit?: number) => XPTransaction[];
  getTotalEarned: () => number;
  getTotalSpent: () => number;

  // Profile completion
  markProfileComplete: () => void;

  // Reset (for testing)
  resetXPSystem: () => void;
}

export const useXPSystem = create<XPSystemState>()(
  persist(
    (set, get) => ({
      // Initial state
      balance: 500, // Start with 500 XP for testing!
      earnedToday: 0,
      lastResetDate: null,
      unlockedCocktails: [],
      transactions: [],
      streaks: {
        dailyLogin: 0,
        lastLoginDate: null,
        unlockStreak: 0,
        lastUnlockDate: null,
      },
      cocktailCosts: {},
      hasCompletedProfile: false,

      // Earn XP
      earnXP: (amount: number, source: XPSource, description: string) => {
        const state = get();
        const transaction: XPTransaction = {
          id: `${Date.now()}-${Math.random()}`,
          type: 'earn',
          amount,
          source,
          description,
          timestamp: new Date().toISOString(),
        };

        set({
          balance: state.balance + amount,
          earnedToday: state.earnedToday + amount,
          transactions: [transaction, ...state.transactions].slice(0, 100), // Keep last 100
        });
      },

      // Spend XP
      spendXP: (amount: number, cocktailId: string, description: string) => {
        const state = get();

        if (state.balance < amount) {
          return false; // Not enough XP
        }

        const transaction: XPTransaction = {
          id: `${Date.now()}-${Math.random()}`,
          type: 'spend',
          amount,
          source: 'cocktail-unlock',
          description,
          cocktailId,
          timestamp: new Date().toISOString(),
        };

        set({
          balance: state.balance - amount,
          transactions: [transaction, ...state.transactions].slice(0, 100),
        });

        return true;
      },

      // Unlock cocktail with XP
      unlockCocktail: (cocktailId: string, cost: number) => {
        const state = get();

        // Check if already unlocked
        if (state.unlockedCocktails.includes(cocktailId)) {
          return false;
        }

        // Try to spend XP
        const success = get().spendXP(cost, cocktailId, `Unlocked cocktail: ${cocktailId}`);

        if (success) {
          set({
            unlockedCocktails: [...state.unlockedCocktails, cocktailId],
          });

          // Update unlock streak
          const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
          const lastUnlock = state.streaks.lastUnlockDate?.split('T')[0];

          let newStreak = 1;
          if (lastUnlock) {
            const daysDiff = Math.floor(
              (new Date(now).getTime() - new Date(lastUnlock).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysDiff <= 7) {
              newStreak = state.streaks.unlockStreak + 1;
            }
          }

          set({
            streaks: {
              ...state.streaks,
              unlockStreak: newStreak,
              lastUnlockDate: new Date().toISOString(),
            },
          });

          // Check for streak bonus (unlock 3 in a week)
          if (newStreak === 3) {
            get().earnXP(50, 'other', 'Streak Bonus: Unlocked 3 cocktails in a week!');
          }
        }

        return success;
      },

      // Get cocktail unlock cost
      getCocktailCost: (cocktailId: string) => {
        const state = get();
        // Return custom cost if set, otherwise default to 'common' tier cost
        return state.cocktailCosts[cocktailId] || DEFAULT_COCKTAIL_COSTS.common;
      },

      // Set custom cocktail cost
      setCocktailCost: (cocktailId: string, cost: number) => {
        const state = get();
        set({
          cocktailCosts: {
            ...state.cocktailCosts,
            [cocktailId]: cost,
          },
        });
      },

      // Check if user can afford cocktail
      canAffordCocktail: (cocktailId: string) => {
        const state = get();
        const cost = get().getCocktailCost(cocktailId);
        return state.balance >= cost;
      },

      // Check if cocktail is unlocked with XP
      isCocktailUnlockedWithXP: (cocktailId: string) => {
        const state = get();
        return state.unlockedCocktails.includes(cocktailId);
      },

      // Check daily login
      checkDailyLogin: () => {
        const state = get();
        const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const lastLogin = state.streaks.lastLoginDate?.split('T')[0];

        if (lastLogin !== now) {
          // New day - award login XP
          get().earnXP(XP_EARNING_RATES.dailyLogin, 'daily-login', 'Daily login bonus');

          // Update streak
          let newStreak = 1;
          if (lastLogin) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastLogin === yesterdayStr) {
              newStreak = state.streaks.dailyLogin + 1;
            }
          }

          set({
            streaks: {
              ...state.streaks,
              dailyLogin: newStreak,
              lastLoginDate: new Date().toISOString(),
            },
          });
        }
      },

      // Reset daily earnings (called at midnight)
      resetDailyEarnings: () => {
        const state = get();
        const now = new Date().toISOString().split('T')[0];
        const lastReset = state.lastResetDate?.split('T')[0];

        if (lastReset !== now) {
          set({
            earnedToday: 0,
            lastResetDate: new Date().toISOString(),
          });
        }
      },

      // Get recent transactions
      getRecentTransactions: (limit: number = 10) => {
        const state = get();
        return state.transactions.slice(0, limit);
      },

      // Get total earned
      getTotalEarned: () => {
        const state = get();
        return state.transactions
          .filter(t => t.type === 'earn')
          .reduce((sum, t) => sum + t.amount, 0);
      },

      // Get total spent
      getTotalSpent: () => {
        const state = get();
        return state.transactions
          .filter(t => t.type === 'spend')
          .reduce((sum, t) => sum + t.amount, 0);
      },

      // Mark profile as complete
      markProfileComplete: () => {
        const state = get();
        if (!state.hasCompletedProfile) {
          get().earnXP(XP_EARNING_RATES.profileComplete, 'profile-complete', 'Profile completed!');
          set({ hasCompletedProfile: true });
        }
      },

      // Reset XP system (for testing)
      resetXPSystem: () => {
        set({
          balance: 0,
          earnedToday: 0,
          lastResetDate: null,
          unlockedCocktails: [],
          transactions: [],
          streaks: {
            dailyLogin: 0,
            lastLoginDate: null,
            unlockStreak: 0,
            lastUnlockDate: null,
          },
          cocktailCosts: {},
          hasCompletedProfile: false,
        });
      },
    }),
    {
      name: 'xp-system-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
