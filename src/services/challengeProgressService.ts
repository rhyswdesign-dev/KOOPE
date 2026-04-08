/**
 * Challenge Progress Service
 * Tracks user actions and automatically updates challenge progress
 * Integrates with lessons, XP, streaks, and recipes
 */

import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';
import { Challenge } from '../types/challenge';
import { challengeService } from './challengeService';

export type ActionType =
  | 'lesson_complete'
  | 'xp_earn'
  | 'streak_maintain'
  | 'recipe_view'
  | 'bar_visit'
  | 'vault_unlock'
  | 'quiz_perfect'
  | 'module_complete'
  | 'scan_bottle'
  | 'scan_new_category'
  | 'log_make'
  | 'rate_recipe'
  | 'add_to_inventory'
  | 'save_recipe'
  | 'explore_spirit'
  | 'complete_profile'
  | 'share_moment';

export interface ActionMetadata {
  lessonId?: string;
  moduleId?: string;
  xpAmount?: number;
  recipeId?: string;
  barId?: string;
  streakDays?: number;
  quizScore?: number;
  bottleId?: string;
  spiritCategory?: string;
  rating?: number;
  profileField?: string;
  [key: string]: any;
}

class ChallengeProgressService {
  /**
   * Track a user action and update relevant challenges
   */
  async trackAction(
    userId: string,
    actionType: ActionType,
    metadata: ActionMetadata = {}
  ): Promise<Challenge[]> {
    try {
      log.info('challengeProgressService', 'Tracking action', {
        userId,
        actionType,
        metadata
      });

      // Get all active challenges that match this action type
      const activeChallenges = await challengeService.getActiveChallenges(userId);
      const matchingChallenges = activeChallenges.filter(
        challenge => challenge.requirementType === actionType && !challenge.isCompleted
      );

      if (matchingChallenges.length === 0) {
        log.info('challengeProgressService', 'No matching challenges found', { actionType });
        return [];
      }

      const completedChallenges: Challenge[] = [];

      // Update progress for each matching challenge
      for (const challenge of matchingChallenges) {
        const increment = this.calculateIncrement(actionType, metadata);
        const isCompleted = await challengeService.updateProgress(
          userId,
          challenge.id,
          increment
        );

        if (isCompleted) {
          completedChallenges.push(challenge);
          log.info('challengeProgressService', 'Challenge completed!', {
            userId,
            challengeId: challenge.id,
            title: challenge.title
          });
        }
      }

      return completedChallenges;
    } catch (error) {
      log.error('challengeProgressService', 'Error tracking action', error, {
        userId,
        actionType
      });
      return [];
    }
  }

  /**
   * Calculate increment amount based on action type and metadata
   */
  private calculateIncrement(actionType: ActionType, metadata: ActionMetadata): number {
    switch (actionType) {
      case 'xp_earn':
        // For XP challenges, increment by actual XP amount
        return metadata.xpAmount || 1;

      case 'streak_maintain':
        // For streaks, increment by 1 day
        return 1;

      case 'lesson_complete':
      case 'recipe_view':
      case 'bar_visit':
      case 'vault_unlock':
      case 'quiz_perfect':
      case 'module_complete':
      case 'scan_bottle':
      case 'scan_new_category':
      case 'log_make':
      case 'rate_recipe':
      case 'add_to_inventory':
      case 'save_recipe':
      case 'explore_spirit':
      case 'complete_profile':
      case 'share_moment':
      default:
        // For countable actions, increment by 1
        return 1;
    }
  }

  /**
   * Check if an action would complete any challenges (for UI previews)
   */
  async checkPotentialCompletions(
    userId: string,
    actionType: ActionType
  ): Promise<Challenge[]> {
    try {
      const activeChallenges = await challengeService.getActiveChallenges(userId);
      const matchingChallenges = activeChallenges.filter(
        challenge => challenge.requirementType === actionType && !challenge.isCompleted
      );

      // Return challenges that are 1 action away from completion
      return matchingChallenges.filter(
        challenge => (challenge.currentProgress || 0) >= challenge.requirementCount - 1
      );
    } catch (error) {
      log.error('challengeProgressService', 'Error checking potential completions', error);
      return [];
    }
  }

  /**
   * Get user's progress summary across all challenges
   */
  async getProgressSummary(userId: string): Promise<{
    total: number;
    completed: number;
    inProgress: number;
    byFrequency: {
      daily: { total: number; completed: number };
      weekly: { total: number; completed: number };
      monthly: { total: number; completed: number };
    };
  }> {
    try {
      const challenges = await challengeService.getActiveChallenges(userId);

      const summary = {
        total: challenges.length,
        completed: challenges.filter(c => c.isCompleted).length,
        inProgress: challenges.filter(c => !c.isCompleted && (c.currentProgress || 0) > 0).length,
        byFrequency: {
          daily: {
            total: challenges.filter(c => c.frequency === 'daily').length,
            completed: challenges.filter(c => c.frequency === 'daily' && c.isCompleted).length
          },
          weekly: {
            total: challenges.filter(c => c.frequency === 'weekly').length,
            completed: challenges.filter(c => c.frequency === 'weekly' && c.isCompleted).length
          },
          monthly: {
            total: challenges.filter(c => c.frequency === 'monthly').length,
            completed: challenges.filter(c => c.frequency === 'monthly' && c.isCompleted).length
          }
        }
      };

      log.info('challengeProgressService', 'Progress summary', summary);
      return summary;
    } catch (error) {
      log.error('challengeProgressService', 'Error getting progress summary', error);
      return {
        total: 0,
        completed: 0,
        inProgress: 0,
        byFrequency: {
          daily: { total: 0, completed: 0 },
          weekly: { total: 0, completed: 0 },
          monthly: { total: 0, completed: 0 }
        }
      };
    }
  }

  /**
   * Convenience methods for specific actions
   */

  async trackLessonComplete(userId: string, lessonId: string): Promise<Challenge[]> {
    return this.trackAction(userId, 'lesson_complete', { lessonId });
  }

  async trackXPEarned(userId: string, amount: number): Promise<Challenge[]> {
    return this.trackAction(userId, 'xp_earn', { xpAmount: amount });
  }

  async trackStreakMaintained(userId: string, streakDays: number): Promise<Challenge[]> {
    return this.trackAction(userId, 'streak_maintain', { streakDays });
  }

  async trackRecipeViewed(userId: string, recipeId: string): Promise<Challenge[]> {
    return this.trackAction(userId, 'recipe_view', { recipeId });
  }

  async trackBarVisit(userId: string, barId: string): Promise<Challenge[]> {
    return this.trackAction(userId, 'bar_visit', { barId });
  }

  async trackVaultUnlock(userId: string): Promise<Challenge[]> {
    return this.trackAction(userId, 'vault_unlock');
  }

  async trackQuizPerfect(userId: string, lessonId: string, score: number): Promise<Challenge[]> {
    return this.trackAction(userId, 'quiz_perfect', { lessonId, quizScore: score });
  }

  async trackModuleComplete(userId: string, moduleId: string): Promise<Challenge[]> {
    return this.trackAction(userId, 'module_complete', { moduleId });
  }

  async trackScanBottle(userId: string, bottleId: string, spiritCategory?: string): Promise<Challenge[]> {
    return this.trackAction(userId, 'scan_bottle', { bottleId, spiritCategory });
  }

  async trackScanNewCategory(userId: string, spiritCategory: string): Promise<Challenge[]> {
    return this.trackAction(userId, 'scan_new_category', { spiritCategory });
  }

  async trackLogMake(userId: string, recipeId: string): Promise<Challenge[]> {
    return this.trackAction(userId, 'log_make', { recipeId });
  }

  async trackRateRecipe(userId: string, recipeId: string, rating: number): Promise<Challenge[]> {
    return this.trackAction(userId, 'rate_recipe', { recipeId, rating });
  }

  async trackAddToInventory(userId: string, bottleId: string): Promise<Challenge[]> {
    return this.trackAction(userId, 'add_to_inventory', { bottleId });
  }

  async trackSaveRecipe(userId: string, recipeId: string): Promise<Challenge[]> {
    return this.trackAction(userId, 'save_recipe', { recipeId });
  }

  async trackExploreSpirit(userId: string, spiritCategory: string): Promise<Challenge[]> {
    return this.trackAction(userId, 'explore_spirit', { spiritCategory });
  }

  async trackCompleteProfile(userId: string, profileField: string): Promise<Challenge[]> {
    return this.trackAction(userId, 'complete_profile', { profileField });
  }

  async trackShareMoment(userId: string, recipeId?: string): Promise<Challenge[]> {
    return this.trackAction(userId, 'share_moment', { recipeId });
  }
}

export const challengeProgressService = new ChallengeProgressService();
