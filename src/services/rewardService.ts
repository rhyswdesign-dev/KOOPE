/**
 * Reward Service
 * Handles claiming and distributing challenge rewards
 * Awards XP, keys, and badges to user profiles
 */

import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';
import { ChallengeReward } from '../types/challenge';

class RewardService {
  /**
   * Claim reward for a completed challenge
   * Updates user profile with XP, keys, and badges
   */
  async claimReward(
    userId: string,
    challengeId: string,
    reward: ChallengeReward
  ): Promise<boolean> {
    try {
      log.info('rewardService', 'Claiming reward', { userId, challengeId, reward });

      // Update user profile with rewards
      if (reward.xp > 0) {
        await this.awardXP(userId, reward.xp);
      }

      if (reward.keys && reward.keys > 0) {
        await this.awardKeys(userId, reward.keys);
      }

      if (reward.badge) {
        await this.awardBadge(userId, reward.badge);
      }

      // Mark challenge reward as claimed
      const { error } = await supabase
        .from('user_challenge_progress')
        .update({
          reward_claimed: true,
          claimed_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('challenge_id', challengeId);

      if (error) {
        log.error('rewardService', 'Error marking reward as claimed', error);
        return false;
      }

      log.info('rewardService', 'Reward claimed successfully', {
        userId,
        challengeId,
        xp: reward.xp,
        keys: reward.keys,
        badge: reward.badge
      });

      return true;
    } catch (error) {
      log.error('rewardService', 'Error claiming reward', error, { userId, challengeId });
      return false;
    }
  }

  /**
   * Award XP to user profile
   */
  async awardXP(userId: string, amount: number): Promise<boolean> {
    try {
      // Get current profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('xp, level')
        .eq('id', userId)
        .single();

      if (fetchError) {
        log.error('rewardService', 'Error fetching profile for XP award', fetchError);
        return false;
      }

      const currentXP = profile?.xp || 0;
      const newXP = currentXP + amount;

      // Calculate level (simple formula: level = floor(xp / 100))
      const newLevel = Math.floor(newXP / 100);
      const leveledUp = newLevel > (profile?.level || 0);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          xp: newXP,
          level: newLevel,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        log.error('rewardService', 'Error updating profile with XP', updateError);
        return false;
      }

      log.info('rewardService', 'XP awarded', {
        userId,
        amount,
        newXP,
        newLevel,
        leveledUp
      });

      return true;
    } catch (error) {
      log.error('rewardService', 'Error awarding XP', error);
      return false;
    }
  }

  /**
   * Award vault keys to user profile
   */
  async awardKeys(userId: string, amount: number): Promise<boolean> {
    try {
      // Get current profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('vault_keys')
        .eq('id', userId)
        .single();

      if (fetchError) {
        log.error('rewardService', 'Error fetching profile for keys award', fetchError);
        return false;
      }

      const currentKeys = profile?.vault_keys || 0;
      const newKeys = currentKeys + amount;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          vault_keys: newKeys,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        log.error('rewardService', 'Error updating profile with keys', updateError);
        return false;
      }

      log.info('rewardService', 'Keys awarded', {
        userId,
        amount,
        newKeys
      });

      return true;
    } catch (error) {
      log.error('rewardService', 'Error awarding keys', error);
      return false;
    }
  }

  /**
   * Award badge to user profile
   */
  async awardBadge(userId: string, badgeId: string): Promise<boolean> {
    try {
      // Get current profile
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('badges')
        .eq('id', userId)
        .single();

      if (fetchError) {
        log.error('rewardService', 'Error fetching profile for badge award', fetchError);
        return false;
      }

      const currentBadges = profile?.badges || [];

      // Check if badge already awarded
      if (currentBadges.includes(badgeId)) {
        log.info('rewardService', 'Badge already awarded', { userId, badgeId });
        return true;
      }

      const newBadges = [...currentBadges, badgeId];

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          badges: newBadges,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        log.error('rewardService', 'Error updating profile with badge', updateError);
        return false;
      }

      log.info('rewardService', 'Badge awarded', {
        userId,
        badgeId,
        totalBadges: newBadges.length
      });

      return true;
    } catch (error) {
      log.error('rewardService', 'Error awarding badge', error);
      return false;
    }
  }

  /**
   * Get user's total rewards from all claimed challenges
   */
  async getUserRewardsSummary(userId: string): Promise<{
    totalXPFromChallenges: number;
    totalKeysFromChallenges: number;
    totalBadgesFromChallenges: number;
    claimedChallenges: number;
  }> {
    try {
      // Get all claimed challenge progress
      const { data: progress, error } = await supabase
        .from('user_challenge_progress')
        .select(`
          *,
          challenges (
            xp_reward,
            keys_reward,
            badge_reward
          )
        `)
        .eq('user_id', userId)
        .eq('reward_claimed', true);

      if (error) {
        log.error('rewardService', 'Error fetching rewards summary', error);
        return {
          totalXPFromChallenges: 0,
          totalKeysFromChallenges: 0,
          totalBadgesFromChallenges: 0,
          claimedChallenges: 0
        };
      }

      const summary = (progress || []).reduce(
        (acc, item: any) => {
          const challenge = item.challenges;
          if (challenge) {
            acc.totalXPFromChallenges += challenge.xp_reward || 0;
            acc.totalKeysFromChallenges += challenge.keys_reward || 0;
            if (challenge.badge_reward) {
              acc.totalBadgesFromChallenges += 1;
            }
          }
          return acc;
        },
        {
          totalXPFromChallenges: 0,
          totalKeysFromChallenges: 0,
          totalBadgesFromChallenges: 0,
          claimedChallenges: progress?.length || 0
        }
      );

      log.info('rewardService', 'Rewards summary retrieved', { userId, summary });
      return summary;
    } catch (error) {
      log.error('rewardService', 'Error getting rewards summary', error);
      return {
        totalXPFromChallenges: 0,
        totalKeysFromChallenges: 0,
        totalBadgesFromChallenges: 0,
        claimedChallenges: 0
      };
    }
  }
}

export const rewardService = new RewardService();
