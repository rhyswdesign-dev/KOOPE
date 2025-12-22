/**
 * useChallengeProgress Hook
 * Provides easy access to challenge tracking methods
 */

import { useCallback } from 'react';
import { useChallenges } from '../contexts/ChallengeContext';
import { Challenge } from '../types/challenge';
import { log } from '../lib/logger';

export const useChallengeProgress = () => {
  const { trackAction } = useChallenges();

  /**
   * Track lesson completion
   */
  const trackLessonComplete = useCallback(async (lessonId: string): Promise<Challenge[]> => {
    log.info('useChallengeProgress', 'Tracking lesson completion', { lessonId });
    return trackAction('lesson_complete', { lessonId });
  }, [trackAction]);

  /**
   * Track XP earned
   */
  const trackXPEarned = useCallback(async (amount: number): Promise<Challenge[]> => {
    log.info('useChallengeProgress', 'Tracking XP earned', { amount });
    return trackAction('xp_earn', { xpAmount: amount });
  }, [trackAction]);

  /**
   * Track streak maintained
   */
  const trackStreakMaintained = useCallback(async (streakDays: number): Promise<Challenge[]> => {
    log.info('useChallengeProgress', 'Tracking streak maintained', { streakDays });
    return trackAction('streak_maintain', { streakDays });
  }, [trackAction]);

  /**
   * Track recipe viewed
   */
  const trackRecipeViewed = useCallback(async (recipeId: string): Promise<Challenge[]> => {
    log.info('useChallengeProgress', 'Tracking recipe viewed', { recipeId });
    return trackAction('recipe_view', { recipeId });
  }, [trackAction]);

  /**
   * Track bar visit
   */
  const trackBarVisit = useCallback(async (barId: string): Promise<Challenge[]> => {
    log.info('useChallengeProgress', 'Tracking bar visit', { barId });
    return trackAction('bar_visit', { barId });
  }, [trackAction]);

  /**
   * Track vault unlock
   */
  const trackVaultUnlock = useCallback(async (): Promise<Challenge[]> => {
    log.info('useChallengeProgress', 'Tracking vault unlock');
    return trackAction('vault_unlock');
  }, [trackAction]);

  /**
   * Track quiz perfect score
   */
  const trackQuizPerfect = useCallback(async (lessonId: string, score: number): Promise<Challenge[]> => {
    log.info('useChallengeProgress', 'Tracking quiz perfect', { lessonId, score });
    return trackAction('quiz_perfect', { lessonId, quizScore: score });
  }, [trackAction]);

  /**
   * Track module completion
   */
  const trackModuleComplete = useCallback(async (moduleId: string): Promise<Challenge[]> => {
    log.info('useChallengeProgress', 'Tracking module complete', { moduleId });
    return trackAction('module_complete', { moduleId });
  }, [trackAction]);

  return {
    trackLessonComplete,
    trackXPEarned,
    trackStreakMaintained,
    trackRecipeViewed,
    trackBarVisit,
    trackVaultUnlock,
    trackQuizPerfect,
    trackModuleComplete,
  };
};
