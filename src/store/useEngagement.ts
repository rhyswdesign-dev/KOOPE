/**
 * Engagement Tracking Store
 * Tracks user engagement metrics for recipe unlocking
 * - App opens, streaks, saves, shares, invites, ratings
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EngagementState {
  // App Opens & Streaks
  totalAppOpens: number;
  appOpenDates: string[]; // ISO date strings (YYYY-MM-DD)
  currentStreak: number;
  longestStreak: number;
  lastOpenDate: string | null;

  // Lessons (tracked separately in useUser, referenced here)
  // completedLessons: string[] - comes from useUser

  // Challenges (tracked separately in useChallenges, referenced here)
  // completedChallenges: string[] - comes from useChallenges

  // Social Engagement
  savedRecipeIds: string[]; // Saved to favorites
  sharedRecipeIds: string[]; // Shared with friends
  ratedRecipeIds: string[]; // Rated cocktails
  invitedFriends: number; // Friend invite count

  // Unlocked Recipes (engagement-based)
  unlockedRecipeIds: string[]; // Recipes unlocked through engagement

  // Actions
  trackAppOpen: () => void;
  saveRecipe: (recipeId: string) => void;
  unsaveRecipe: (recipeId: string) => void;
  shareRecipe: (recipeId: string) => void;
  rateRecipe: (recipeId: string) => void;
  inviteFriend: () => void;
  unlockRecipe: (recipeId: string) => void;
  isRecipeUnlocked: (recipeId: string) => boolean;

  // Getters for unlock progress
  getProgress: (type: string, required: number) => number;
  canUnlockRecipe: (recipeId: string) => boolean;

  // Reset (for testing)
  resetEngagement: () => void;
}

export const useEngagement = create<EngagementState>()(
  persist(
    (set, get) => ({
      // Initial state
      totalAppOpens: 0,
      appOpenDates: [],
      currentStreak: 0,
      longestStreak: 0,
      lastOpenDate: null,
      savedRecipeIds: [],
      sharedRecipeIds: [],
      ratedRecipeIds: [],
      invitedFriends: 0,
      unlockedRecipeIds: [],

      // Track app open and update streak
      trackAppOpen: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const lastOpen = state.lastOpenDate?.split('T')[0];

        // Don't track if already opened today
        if (lastOpen === today) {
          return;
        }

        // Add today to open dates
        const newOpenDates = [...state.appOpenDates, today];

        // Calculate streak
        let newStreak = 1;
        if (lastOpen) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (lastOpen === yesterdayStr) {
            // Consecutive day - increment streak
            newStreak = state.currentStreak + 1;
          } else {
            // Streak broken - reset to 1
            newStreak = 1;
          }
        }

        const newLongestStreak = Math.max(state.longestStreak, newStreak);

        set({
          totalAppOpens: state.totalAppOpens + 1,
          appOpenDates: newOpenDates,
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
          lastOpenDate: new Date().toISOString(),
        });
      },

      // Save recipe to favorites
      saveRecipe: (recipeId: string) => {
        const state = get();
        if (!state.savedRecipeIds.includes(recipeId)) {
          set({
            savedRecipeIds: [...state.savedRecipeIds, recipeId],
          });
        }
      },

      // Remove from favorites
      unsaveRecipe: (recipeId: string) => {
        const state = get();
        set({
          savedRecipeIds: state.savedRecipeIds.filter(id => id !== recipeId),
        });
      },

      // Track recipe share
      shareRecipe: (recipeId: string) => {
        const state = get();
        if (!state.sharedRecipeIds.includes(recipeId)) {
          set({
            sharedRecipeIds: [...state.sharedRecipeIds, recipeId],
          });
        }
      },

      // Track recipe rating
      rateRecipe: (recipeId: string) => {
        const state = get();
        if (!state.ratedRecipeIds.includes(recipeId)) {
          set({
            ratedRecipeIds: [...state.ratedRecipeIds, recipeId],
          });
        }
      },

      // Track friend invite
      inviteFriend: () => {
        const state = get();
        set({
          invitedFriends: state.invitedFriends + 1,
        });
      },

      // Unlock recipe through engagement
      unlockRecipe: (recipeId: string) => {
        const state = get();
        if (!state.unlockedRecipeIds.includes(recipeId)) {
          set({
            unlockedRecipeIds: [...state.unlockedRecipeIds, recipeId],
          });
        }
      },

      // Check if recipe is unlocked
      isRecipeUnlocked: (recipeId: string) => {
        const state = get();
        return state.unlockedRecipeIds.includes(recipeId);
      },

      // Get progress for a specific unlock type
      getProgress: (type: string, required: number) => {
        const state = get();
        let current = 0;

        switch (type) {
          case 'streak':
            current = state.currentStreak;
            break;
          case 'app-opens':
            current = state.appOpenDates.length;
            break;
          case 'saved-recipes':
            current = state.savedRecipeIds.length;
            break;
          case 'shares':
            current = state.sharedRecipeIds.length;
            break;
          case 'ratings':
            current = state.ratedRecipeIds.length;
            break;
          case 'invites':
            current = state.invitedFriends;
            break;
          default:
            current = 0;
        }

        return Math.min((current / required) * 100, 100);
      },

      // Check if user can unlock a recipe (at least one method complete)
      canUnlockRecipe: (recipeId: string) => {
        const state = get();

        // Already unlocked
        if (state.unlockedRecipeIds.includes(recipeId)) {
          return false;
        }

        // This will be implemented with recipe unlock config
        // For now, return false - will be hooked up in next step
        return false;
      },

      // Reset engagement (for testing)
      resetEngagement: () => {
        set({
          totalAppOpens: 0,
          appOpenDates: [],
          currentStreak: 0,
          longestStreak: 0,
          lastOpenDate: null,
          savedRecipeIds: [],
          sharedRecipeIds: [],
          ratedRecipeIds: [],
          invitedFriends: 0,
          unlockedRecipeIds: [],
        });
      },
    }),
    {
      name: 'engagement-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
