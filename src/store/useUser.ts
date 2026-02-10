/**
 * User Store using Zustand
 * Manages persistent user state (lives, completed lessons)
 *
 * NOTE: XP/level is managed by useXPSystem (single source of truth)
 * NOTE: Streaks are managed by streakService (single source of truth)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useXPSystem } from './useXPSystem';

interface UserState {
  // Persistent user data
  lives: number;
  completedLessons: string[];
  lastLifeLossTime: number | null;

  // Actions
  loseLife: () => void;
  gainLife: () => void;
  completeLesson: (lessonId: string, xpEarned: number) => void;
  checkLifeRefresh: () => void;
  resetUser: () => void;
}

const INITIAL_LIVES = 3;
const LIFE_REFRESH_TIME = 60 * 60 * 1000; // 1 hour in milliseconds
const SUBSEQUENT_REFRESH_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const useUser = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      lives: INITIAL_LIVES,
      completedLessons: [],
      lastLifeLossTime: null,

      loseLife: () => {
        set(state => {
          const newLives = Math.max(0, state.lives - 1);
          return {
            lives: newLives,
            lastLifeLossTime: Date.now()
          };
        });
      },

      gainLife: () => {
        set(state => ({
          lives: Math.min(INITIAL_LIVES, state.lives + 1)
        }));
      },

      completeLesson: (lessonId: string, xpEarned: number) => {
        const state = get();
        if (state.completedLessons.includes(lessonId)) {
          return; // Already completed
        }

        set({
          completedLessons: [...state.completedLessons, lessonId],
        });

        // Award XP through the global XP system (single source of truth)
        useXPSystem.getState().earnXP(xpEarned, 'lesson-complete', `Completed lesson: ${lessonId}`);
      },

      checkLifeRefresh: () => {
        const state = get();
        if (state.lives >= INITIAL_LIVES || !state.lastLifeLossTime) {
          return; // Already at max lives or never lost a life
        }

        const now = Date.now();
        const timeSinceLastLoss = now - state.lastLifeLossTime;

        // Check if enough time has passed for life refresh
        const refreshTime = state.lives === 0 ? SUBSEQUENT_REFRESH_TIME : LIFE_REFRESH_TIME;

        if (timeSinceLastLoss >= refreshTime) {
          set({
            lives: INITIAL_LIVES,
            lastLifeLossTime: null
          });
        }
      },

      resetUser: () => {
        set({
          lives: INITIAL_LIVES,
          completedLessons: [],
          lastLifeLossTime: null
        });
      }
    }),
    {
      name: 'user-store', // Storage key
    }
  )
);
