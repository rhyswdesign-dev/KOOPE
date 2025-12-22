/**
 * Challenge Service
 * Manages challenge rotation, progress tracking, and rewards
 */

import { Challenge, UserChallengeProgress, ChallengeFrequency } from '../types/challenge';
import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';

class ChallengeService {
  /**
   * Get active challenges for a user
   */
  async getActiveChallenges(userId: string): Promise<Challenge[]> {
    try {
      const now = new Date().toISOString();

      // Get all active challenges (not expired)
      const { data: challenges, error: challengesError } = await supabase
        .from('challenges')
        .select('*')
        .gte('expiresAt', now)
        .order('frequency', { ascending: true })
        .order('difficulty', { ascending: true });

      if (challengesError) throw challengesError;

      if (!challenges || challenges.length === 0) {
        log.warn('challengeService', 'No active challenges found');
        return [];
      }

      // Get user's progress for these challenges
      const challengeIds = challenges.map(c => c.id);
      const { data: progress, error: progressError } = await supabase
        .from('user_challenge_progress')
        .select('*')
        .eq('userId', userId)
        .in('challengeId', challengeIds);

      if (progressError) {
        log.warn('challengeService', 'Could not load progress', { error: progressError });
      }

      // Merge challenges with user progress
      const progressMap = new Map(progress?.map(p => [p.challengeId, p]) || []);

      const challengesWithProgress: Challenge[] = challenges.map(challenge => ({
        ...challenge,
        currentProgress: progressMap.get(challenge.id)?.progress || 0,
        isCompleted: progressMap.get(challenge.id)?.isCompleted || false,
        completedAt: progressMap.get(challenge.id)?.completedAt,
      }));

      log.info('challengeService', 'Loaded active challenges', {
        count: challengesWithProgress.length,
        completed: challengesWithProgress.filter(c => c.isCompleted).length
      });

      return challengesWithProgress;
    } catch (error) {
      log.error('challengeService', 'Error loading challenges', error);
      return [];
    }
  }

  /**
   * Update challenge progress
   */
  async updateProgress(
    userId: string,
    challengeId: string,
    increment: number = 1
  ): Promise<boolean> {
    try {
      // Get current progress
      const { data: existing, error: fetchError } = await supabase
        .from('user_challenge_progress')
        .select('*')
        .eq('userId', userId)
        .eq('challengeId', challengeId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows
        throw fetchError;
      }

      // Get challenge to check requirement
      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

      if (challengeError) throw challengeError;

      const newProgress = (existing?.progress || 0) + increment;
      const isCompleted = newProgress >= challenge.requirementCount;

      // Upsert progress
      const { error: upsertError } = await supabase
        .from('user_challenge_progress')
        .upsert({
          userId,
          challengeId,
          progress: newProgress,
          isCompleted,
          completedAt: isCompleted ? new Date().toISOString() : existing?.completedAt,
          startedAt: existing?.startedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

      if (upsertError) throw upsertError;

      if (isCompleted) {
        log.info('challengeService', 'Challenge completed!', {
          userId,
          challengeId,
          title: challenge.title
        });
      }

      return isCompleted;
    } catch (error) {
      log.error('challengeService', 'Error updating progress', error, {
        userId,
        challengeId
      });
      return false;
    }
  }

  /**
   * Claim challenge reward
   */
  async claimReward(userId: string, challengeId: string): Promise<{
    xp: number;
    keys?: number;
    badge?: string;
  } | null> {
    try {
      // Get challenge
      const { data: challenge, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('id', challengeId)
        .single();

      if (challengeError) throw challengeError;

      // Verify completion
      const { data: progress, error: progressError } = await supabase
        .from('user_challenge_progress')
        .select('*')
        .eq('userId', userId)
        .eq('challengeId', challengeId)
        .single();

      if (progressError || !progress?.isCompleted) {
        log.warn('challengeService', 'Cannot claim - not completed', {
          userId,
          challengeId
        });
        return null;
      }

      log.info('challengeService', 'Reward claimed', {
        userId,
        challengeId,
        xp: challenge.xpReward,
        keys: challenge.keysReward
      });

      return {
        xp: challenge.xpReward,
        keys: challenge.keysReward,
        badge: challenge.badgeReward,
      };
    } catch (error) {
      log.error('challengeService', 'Error claiming reward', error);
      return null;
    }
  }

  /**
   * Generate new challenges for a frequency period
   * Call this from a scheduled job or when challenges expire
   */
  async generateChallenges(frequency: ChallengeFrequency): Promise<void> {
    try {
      const expiresAt = this.getExpirationDate(frequency);

      // TODO: Implement challenge generation logic
      // This would create new random challenges from a pool
      // and insert them into the challenges table

      log.info('challengeService', 'Generated new challenges', {
        frequency,
        expiresAt
      });
    } catch (error) {
      log.error('challengeService', 'Error generating challenges', error);
    }
  }

  /**
   * Calculate expiration date based on frequency
   */
  private getExpirationDate(frequency: ChallengeFrequency): string {
    const now = new Date();

    switch (frequency) {
      case 'daily':
        // Expire at midnight tonight
        const midnight = new Date(now);
        midnight.setHours(23, 59, 59, 999);
        return midnight.toISOString();

      case 'weekly':
        // Expire next Monday at midnight
        const nextMonday = new Date(now);
        nextMonday.setDate(now.getDate() + (7 - now.getDay() + 1));
        nextMonday.setHours(23, 59, 59, 999);
        return nextMonday.toISOString();

      case 'monthly':
        // Expire on last day of current month
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        lastDay.setHours(23, 59, 59, 999);
        return lastDay.toISOString();

      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
  }
}

export const challengeService = new ChallengeService();
