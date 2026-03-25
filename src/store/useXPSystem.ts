/**
 * XP System Store
 * Manages XP earning, spending, and cocktail unlocking
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCocktailXPCost as getDefaultCocktailXPCost } from '../config/cocktailXPCosts';
import { achievementService } from '../services/achievementService';
import { useUserTier } from './useUserTier';
import { PRO_XP_MULTIPLIER } from '../config/proIdentity';

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
  | 'recipe-made'
  | 'recipe-rating'
  | 'streak-bonus'
  // Scan & inventory (matches monetization spec)
  | 'bottle-scanned-first'   // First time scanning a specific bottle — 50 XP
  | 'bottle-scanned-repeat'  // Repeat scan of same bottle — 5 XP, max 3×/bottle
  | 'bottle-submitted'       // User adds a NEW bottle to the global DB — 150 XP
  | 'scan-corrected'         // User corrects a wrong scan result — 75 XP
  // Discovery
  | 'recipe-viewed'          // Browsing recipes — 10 XP, capped at 5 views/day
  | 'taste-profile-completed' // One-time: filling out taste preferences — 100 XP
  // Challenges & logging
  | 'challenge-completed'    // Completing a challenge — 200–500 XP (set per challenge)
  | 'cocktail-logged-quick'  // "I made it" quick log — 50 XP
  | 'cocktail-logged-detailed' // Log with rating/notes — 75 XP
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

// Daily XP cap for free users — prevents farming while allowing 3-4 meaningful actions/day
export const FREE_DAILY_XP_CAP = 300;

// XP earning rates — aligned with monetization spec
export const XP_EARNING_RATES = {
  // Engagement
  dailyLogin: 10,
  lessonComplete: 25,
  makeCocktail: 50,
  saveRecipe: 5,
  addToCart: 5,
  shareCocktail: 15,
  vaultDailyDrop: 20,
  vaultSeasonalItem: 30,
  inviteFriend: 100,
  recipeRating: 5,
  streakBonus: 25,

  // Scanning & inventory (from monetization spec)
  bottleScannedFirst: 50,     // First time scanning any bottle
  bottleScannedRepeat: 5,     // Diminishing returns — max 3× per bottle
  bottleSubmitted: 150,       // Adding a new bottle to the shared database
  scanCorrected: 75,          // Correcting a wrong scan result

  // Discovery
  recipeViewed: 10,           // Browsing recipes — capped at 5 views/day (50 XP/day max)
  tasteProfileCompleted: 100, // One-time: filling out taste preferences

  // Challenges
  challengeMin: 200,          // Minimum per challenge (set individually up to 500)

  // Cocktail logging
  cocktailLoggedQuick: 50,    // "I made it" quick log
  cocktailLoggedDetailed: 75, // With rating/notes
};

// Per-bottle repeat scan limit (max times a single bottle awards repeat XP)
export const MAX_REPEAT_SCANS_PER_BOTTLE = 3;

// Daily recipe view cap for XP (after 5 views, no more XP awarded)
export const MAX_RECIPE_VIEWS_XP_PER_DAY = 5;

interface XPSystemState {
  // Core state
  balance: number;
  earnedToday: number;
  lastResetDate: string | null;
  unlockedCocktails: string[];
  unlockedVaultItems: string[];
  transactions: XPTransaction[];
  streaks: XPStreaks;
  cocktailCosts: CocktailUnlockCost;

  // Scan tracking — maps bottleId → number of times scanned (for repeat XP logic)
  scannedBottles: Record<string, number>;

  // Recipe view cap — reset daily alongside earnedToday
  recipesViewedToday: number;

  // One-time rewards tracking
  hasCompletedProfile: boolean;

  // Core XP actions
  earnXP: (amount: number, source: XPSource, description: string) => void;
  spendXP: (amount: number, cocktailId: string, description: string) => boolean;
  unlockCocktail: (cocktailId: string, cost: number) => boolean;
  unlockVaultItem: (itemId: string) => void;
  isVaultItemUnlocked: (itemId: string) => boolean;
  getCocktailCost: (cocktailId: string) => number;
  setCocktailCost: (cocktailId: string, cost: number) => void;
  canAffordCocktail: (cocktailId: string) => boolean;
  isCocktailUnlockedWithXP: (cocktailId: string) => boolean;

  // Scan & inventory XP (monetization spec)
  earnScanXP: (bottleId: string) => { xpEarned: number; reason: string };
  earnBottleSubmittedXP: () => void;
  earnScanCorrectedXP: () => void;

  // Discovery XP
  earnRecipeViewedXP: () => void;

  // Cocktail logging XP
  earnCocktailLoggedXP: (isDetailed: boolean, recipeName: string) => void;
  earnRecipeRatingXP: (recipeName: string) => void;

  // Challenge XP
  earnChallengeXP: (amount: number, challengeTitle: string) => void;

  // Daily/Streak management
  checkDailyLogin: () => void;
  resetDailyEarnings: () => void;

  // Transaction history
  getRecentTransactions: (limit?: number) => XPTransaction[];
  getTotalEarned: () => number;
  getTotalSpent: () => number;

  // Profile/taste completion
  markProfileComplete: () => void;

  // Reset (for testing)
  resetXPSystem: () => void;
}

export const useXPSystem = create<XPSystemState>()(
  persist(
    (set, get) => ({
      // Initial state (500 XP for testing Vault unlock flow)
      balance: 500,
      earnedToday: 0,
      lastResetDate: null,
      unlockedCocktails: [],
      unlockedVaultItems: [],
      transactions: [],
      streaks: {
        dailyLogin: 0,
        lastLoginDate: null,
        unlockStreak: 0,
        lastUnlockDate: null,
      },
      cocktailCosts: {},
      scannedBottles: {},
      recipesViewedToday: 0,
      hasCompletedProfile: false,

      // Earn XP
      earnXP: (amount: number, source: XPSource, description: string) => {
        const state = get();

        // Resolve earnedToday, auto-resetting if the calendar day has rolled over
        const today = new Date().toISOString().split('T')[0];
        const lastReset = state.lastResetDate?.split('T')[0];
        const isNewDay = lastReset !== today;
        const earnedToday = isNewDay ? 0 : state.earnedToday;

        // Enforce daily cap for FREE tier users
        const { tier } = useUserTier.getState();
        let effectiveAmount = amount;
        if (tier === 'FREE') {
          const remaining = FREE_DAILY_XP_CAP - earnedToday;
          effectiveAmount = Math.min(amount, Math.max(0, remaining));
          if (effectiveAmount <= 0) return; // Cap already reached for today
        }
        if (tier === 'PRO') {
          effectiveAmount = Math.round(effectiveAmount * PRO_XP_MULTIPLIER);
        }

        const transaction: XPTransaction = {
          id: `${Date.now()}-${Math.random()}`,
          type: 'earn',
          amount: effectiveAmount,
          source,
          description,
          timestamp: new Date().toISOString(),
        };

        const newBalance = state.balance + effectiveAmount;
        set({
          balance: newBalance,
          earnedToday: earnedToday + effectiveAmount,
          lastResetDate: isNewDay ? new Date().toISOString() : state.lastResetDate,
          transactions: [transaction, ...state.transactions].slice(0, 100),
        });

        // Sync XP to achievement service so achievements screen stays in sync
        achievementService.syncXP(newBalance);
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
        // Return custom cost if set, otherwise use cocktail-specific cost from config
        return state.cocktailCosts[cocktailId] || getDefaultCocktailXPCost(cocktailId);
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

      // Unlock a vault item (games, playbooks, etc.)
      unlockVaultItem: (itemId: string) => {
        const state = get();
        if (!state.unlockedVaultItems.includes(itemId)) {
          set({
            unlockedVaultItems: [...state.unlockedVaultItems, itemId],
          });
        }
      },

      // Check if a vault item is unlocked
      isVaultItemUnlocked: (itemId: string) => {
        const state = get();
        return state.unlockedVaultItems.includes(itemId);
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

          // Award streak bonuses
          if (newStreak === 3) {
            get().earnXP(XP_EARNING_RATES.streakBonus, 'streak-bonus', '3-day login streak!');
          } else if (newStreak === 7) {
            get().earnXP(XP_EARNING_RATES.streakBonus * 2, 'streak-bonus', '7-day login streak!');
          } else if (newStreak === 30) {
            get().earnXP(XP_EARNING_RATES.streakBonus * 4, 'streak-bonus', '30-day login streak!');
          }
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
            recipesViewedToday: 0,
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

      // One-time taste profile / profile completion bonus
      markProfileComplete: () => {
        const state = get();
        if (!state.hasCompletedProfile) {
          get().earnXP(XP_EARNING_RATES.tasteProfileCompleted, 'taste-profile-completed', 'Taste profile completed!');
          set({ hasCompletedProfile: true });
        }
      },

      // ── Scan & inventory XP ─────────────────────────────────────────────────

      // Awards XP for scanning a bottle.
      // First scan of a bottle: 50 XP. Repeat scans: 5 XP each, max 3 repeats.
      // After 4 total scans of the same bottle, no more XP is awarded.
      earnScanXP: (bottleId: string) => {
        const state = get();
        const scanCount = state.scannedBottles[bottleId] ?? 0;

        let xpEarned = 0;
        let reason = '';

        if (scanCount === 0) {
          xpEarned = XP_EARNING_RATES.bottleScannedFirst;
          reason = 'First scan — new bottle discovered';
        } else if (scanCount <= MAX_REPEAT_SCANS_PER_BOTTLE) {
          xpEarned = XP_EARNING_RATES.bottleScannedRepeat;
          reason = `Repeat scan (${scanCount}/${MAX_REPEAT_SCANS_PER_BOTTLE})`;
        } else {
          return { xpEarned: 0, reason: 'Max scans reached for this bottle' };
        }

        set({ scannedBottles: { ...state.scannedBottles, [bottleId]: scanCount + 1 } });
        get().earnXP(xpEarned, scanCount === 0 ? 'bottle-scanned-first' : 'bottle-scanned-repeat', reason);
        return { xpEarned, reason };
      },

      // User submits a bottle not yet in the shared database
      earnBottleSubmittedXP: () => {
        get().earnXP(XP_EARNING_RATES.bottleSubmitted, 'bottle-submitted', 'New bottle added to database');
      },

      // User corrects a wrong scan result
      earnScanCorrectedXP: () => {
        get().earnXP(XP_EARNING_RATES.scanCorrected, 'scan-corrected', 'Scan result corrected');
      },

      // ── Discovery XP ────────────────────────────────────────────────────────

      // Recipe view — 10 XP, capped at 5 views/day (50 XP/day max from browsing)
      earnRecipeViewedXP: () => {
        const state = get();

        // Resolve today's view count, resetting if new day
        const today = new Date().toISOString().split('T')[0];
        const lastReset = state.lastResetDate?.split('T')[0];
        const viewsToday = lastReset === today ? state.recipesViewedToday : 0;

        if (viewsToday >= MAX_RECIPE_VIEWS_XP_PER_DAY) return;

        set({ recipesViewedToday: viewsToday + 1 });
        get().earnXP(XP_EARNING_RATES.recipeViewed, 'recipe-viewed', 'Recipe browsed');
      },

      // ── Cocktail logging XP ─────────────────────────────────────────────────

      earnCocktailLoggedXP: (isDetailed: boolean, recipeName: string) => {
        const amount = isDetailed
          ? XP_EARNING_RATES.cocktailLoggedDetailed
          : XP_EARNING_RATES.cocktailLoggedQuick;
        const source = isDetailed ? 'cocktail-logged-detailed' : 'cocktail-logged-quick';
        get().earnXP(amount, source, `Logged: ${recipeName}`);
      },

      earnRecipeRatingXP: (recipeName: string) => {
        get().earnXP(XP_EARNING_RATES.recipeRating, 'recipe-rating', `Rated ${recipeName}`);
      },

      // ── Challenge XP ────────────────────────────────────────────────────────

      earnChallengeXP: (amount: number, challengeTitle: string) => {
        get().earnXP(amount, 'challenge-completed', `Challenge: ${challengeTitle}`);
      },

      // Reset XP system (for testing)
      resetXPSystem: () => {
        set({
          balance: 0,
          earnedToday: 0,
          lastResetDate: null,
          unlockedCocktails: [],
          unlockedVaultItems: [],
          transactions: [],
          streaks: {
            dailyLogin: 0,
            lastLoginDate: null,
            unlockStreak: 0,
            lastUnlockDate: null,
          },
          cocktailCosts: {},
          scannedBottles: {},
          recipesViewedToday: 0,
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
