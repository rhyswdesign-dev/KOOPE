/**
 * Challenge Context
 * Provides app-wide challenge tracking and automatic progress updates
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Challenge } from '../types/challenge';
import { challengeService } from '../services/challengeService';
import {
  challengeProgressService,
  ActionType,
  ActionMetadata,
} from '../services/challengeProgressService';
import { useAuth } from './AuthContext';
import { useXPSystem } from '../store/useXPSystem';
import { log } from '../lib/logger';

interface ChallengeContextType {
  // State
  challenges: Challenge[];
  isLoading: boolean;
  lastCompletedChallenges: Challenge[];

  // Actions
  refreshChallenges: () => Promise<void>;
  trackAction: (actionType: ActionType, metadata?: ActionMetadata) => Promise<Challenge[]>;
  claimReward: (
    challengeId: string,
  ) => Promise<{ xp: number; keys?: number; badge?: string } | null>;
  clearCompletedNotifications: () => void;

  // Progress summary
  totalChallenges: number;
  completedChallenges: number;
  inProgressChallenges: number;
}

const ChallengeContext = createContext<ChallengeContextType | undefined>(undefined);

export const ChallengeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCompletedChallenges, setLastCompletedChallenges] = useState<Challenge[]>([]);

  /**
   * Load challenges for the current user
   */
  const refreshChallenges = useCallback(async () => {
    if (!user) {
      setChallenges([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const userChallenges = await challengeService.getActiveChallenges(user.id);
      setChallenges(userChallenges);
      log.info('ChallengeContext', 'Challenges loaded', { count: userChallenges.length });
    } catch (error) {
      log.error('ChallengeContext', 'Error loading challenges', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * Track a user action and update challenge progress
   */
  const trackAction = useCallback(
    async (actionType: ActionType, metadata?: ActionMetadata): Promise<Challenge[]> => {
      if (!user) {
        log.warn('ChallengeContext', 'Cannot track action - no user');
        return [];
      }

      try {
        const completedChallenges = await challengeProgressService.trackAction(
          user.id,
          actionType,
          metadata,
        );

        if (completedChallenges.length > 0) {
          // Award XP for each completed challenge (200 XP base per spec)
          const { earnChallengeXP } = useXPSystem.getState();
          for (const challenge of completedChallenges) {
            earnChallengeXP(200, challenge.title);
          }

          // Store completed challenges for notification
          setLastCompletedChallenges((prev) => [...prev, ...completedChallenges]);

          // Refresh challenges to get updated progress
          await refreshChallenges();

          log.info('ChallengeContext', 'Challenges completed', {
            count: completedChallenges.length,
            titles: completedChallenges.map((c) => c.title),
          });
        }

        return completedChallenges;
      } catch (error) {
        log.error('ChallengeContext', 'Error tracking action', error, { actionType });
        return [];
      }
    },
    [user, refreshChallenges],
  );

  /**
   * Claim reward for a completed challenge
   */
  const claimReward = useCallback(
    async (challengeId: string) => {
      if (!user) {
        log.warn('ChallengeContext', 'Cannot claim reward - no user');
        return null;
      }

      try {
        const reward = await challengeService.claimReward(user.id, challengeId);

        if (reward) {
          log.info('ChallengeContext', 'Reward claimed', { challengeId, reward });
          // Refresh challenges to update claimed status
          await refreshChallenges();
        }

        return reward;
      } catch (error) {
        log.error('ChallengeContext', 'Error claiming reward', error, { challengeId });
        return null;
      }
    },
    [user, refreshChallenges],
  );

  /**
   * Clear completed challenge notifications
   */
  const clearCompletedNotifications = useCallback(() => {
    setLastCompletedChallenges([]);
  }, []);

  /**
   * Load challenges on mount and when user changes
   */
  useEffect(() => {
    refreshChallenges();
  }, [refreshChallenges]);

  /**
   * Set up periodic refresh (every 5 minutes to catch new challenges)
   */
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(
      () => {
        refreshChallenges();
      },
      5 * 60 * 1000,
    ); // 5 minutes

    return () => clearInterval(interval);
  }, [user, refreshChallenges]);

  // Calculate progress summary
  const totalChallenges = challenges.length;
  const completedChallenges = challenges.filter((c) => c.isCompleted).length;
  const inProgressChallenges = challenges.filter(
    (c) => !c.isCompleted && (c.currentProgress || 0) > 0,
  ).length;

  const value: ChallengeContextType = useMemo(
    () => ({
      challenges,
      isLoading,
      lastCompletedChallenges,
      refreshChallenges,
      trackAction,
      claimReward,
      clearCompletedNotifications,
      totalChallenges,
      completedChallenges,
      inProgressChallenges,
    }),
    [
      challenges,
      isLoading,
      lastCompletedChallenges,
      refreshChallenges,
      trackAction,
      claimReward,
      clearCompletedNotifications,
      totalChallenges,
      completedChallenges,
      inProgressChallenges,
    ],
  );

  return <ChallengeContext.Provider value={value}>{children}</ChallengeContext.Provider>;
};

/**
 * Hook to use challenge context
 */
export const useChallenges = (): ChallengeContextType => {
  const context = useContext(ChallengeContext);
  if (!context) {
    throw new Error('useChallenges must be used within a ChallengeProvider');
  }
  return context;
};
