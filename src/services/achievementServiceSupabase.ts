/**
 * SUPABASE ACHIEVEMENT SERVICE
 * Manages user achievements, badges, and milestones using Supabase
 * Syncs achievements across devices
 */

import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';
import { rewardService } from './rewardService';

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: 'lessons' | 'recipes' | 'streaks' | 'social' | 'special';
  requirementType: 'count' | 'streak' | 'perfect' | 'collection' | 'special';
  requirementValue: number;
  xpReward: number;
  badgeIcon?: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  hidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
  progress: number;
  isCompleted: boolean;
  notified: boolean;
  achievement?: Achievement;
}

class AchievementServiceSupabase {
  private static instance: AchievementServiceSupabase;
  private listeners: Array<(achievement: Achievement) => void> = [];

  private constructor() {}

  public static getInstance(): AchievementServiceSupabase {
    if (!AchievementServiceSupabase.instance) {
      AchievementServiceSupabase.instance = new AchievementServiceSupabase();
    }
    return AchievementServiceSupabase.instance;
  }

  /**
   * Get all achievements from database
   */
  public async getAchievements(): Promise<Achievement[]> {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('rarity', { ascending: true })
        .order('requirement_value', { ascending: true });

      if (error) {
        log.error('AchievementServiceSupabase', 'Error fetching achievements', error);
        return [];
      }

      return this.mapAchievementsFromDB(data || []);
    } catch (error) {
      log.error('AchievementServiceSupabase', 'Error getting achievements', error);
      return [];
    }
  }

  /**
   * Get user's achievement progress
   */
  public async getUserAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievements (*)
        `)
        .eq('user_id', userId);

      if (error) {
        log.error('AchievementServiceSupabase', 'Error fetching user achievements', error);
        return [];
      }

      return this.mapUserAchievementsFromDB(data || []);
    } catch (error) {
      log.error('AchievementServiceSupabase', 'Error getting user achievements', error);
      return [];
    }
  }

  /**
   * Get all achievements with user progress
   */
  public async getAllAchievementsWithProgress(userId: string): Promise<Array<Achievement & { progress: number; isCompleted: boolean }>> {
    try {
      // Get all achievements
      const achievements = await this.getAchievements();

      // Get user progress
      const userAchievements = await this.getUserAchievements(userId);

      // Merge them
      return achievements.map(achievement => {
        const userProgress = userAchievements.find(ua => ua.achievementId === achievement.id);
        return {
          ...achievement,
          progress: userProgress?.progress || 0,
          isCompleted: userProgress?.isCompleted || false,
        };
      });
    } catch (error) {
      log.error('AchievementServiceSupabase', 'Error getting achievements with progress', error);
      return [];
    }
  }

  /**
   * Track progress for an achievement
   */
  public async trackProgress(
    userId: string,
    achievementKey: string,
    progress: number
  ): Promise<{ unlocked: boolean; achievement?: Achievement }> {
    try {
      // Get achievement by key
      const { data: achievementData, error: achievementError } = await supabase
        .from('achievements')
        .select('*')
        .eq('key', achievementKey)
        .single();

      if (achievementError || !achievementData) {
        log.error('AchievementServiceSupabase', 'Achievement not found', { achievementKey });
        return { unlocked: false };
      }

      const achievement = this.mapAchievementFromDB(achievementData);

      // Check if user already has this achievement
      const { data: existingProgress, error: progressError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .eq('achievement_id', achievement.id)
        .maybeSingle();

      if (progressError && progressError.code !== 'PGRST116') {
        log.error('AchievementServiceSupabase', 'Error checking progress', progressError);
        return { unlocked: false };
      }

      const isCompleted = progress >= achievement.requirementValue;

      if (existingProgress) {
        // Update existing progress
        if (!existingProgress.is_completed && isCompleted) {
          // Achievement just completed!
          const { error: updateError } = await supabase
            .from('user_achievements')
            .update({
              progress,
              is_completed: true,
              unlocked_at: new Date().toISOString(),
              notified: false,
            })
            .eq('id', existingProgress.id);

          if (updateError) {
            log.error('AchievementServiceSupabase', 'Error updating achievement', updateError);
            return { unlocked: false };
          }

          // Award XP
          await rewardService.awardXP(userId, achievement.xpReward);

          // Notify listeners
          this.notifyListeners(achievement);

          log.info('AchievementServiceSupabase', 'Achievement unlocked!', {
            userId,
            achievement: achievement.title,
            xp: achievement.xpReward,
          });

          return { unlocked: true, achievement };
        } else if (!existingProgress.is_completed) {
          // Update progress but not completed yet
          await supabase
            .from('user_achievements')
            .update({ progress })
            .eq('id', existingProgress.id);
        }
      } else {
        // Create new progress record
        const { error: insertError } = await supabase
          .from('user_achievements')
          .insert({
            user_id: userId,
            achievement_id: achievement.id,
            progress,
            is_completed: isCompleted,
            unlocked_at: isCompleted ? new Date().toISOString() : null,
            notified: false,
          });

        if (insertError) {
          log.error('AchievementServiceSupabase', 'Error creating progress', insertError);
          return { unlocked: false };
        }

        if (isCompleted) {
          // Award XP
          await rewardService.awardXP(userId, achievement.xpReward);

          // Notify listeners
          this.notifyListeners(achievement);

          log.info('AchievementServiceSupabase', 'Achievement unlocked!', {
            userId,
            achievement: achievement.title,
            xp: achievement.xpReward,
          });

          return { unlocked: true, achievement };
        }
      }

      return { unlocked: false };
    } catch (error) {
      log.error('AchievementServiceSupabase', 'Error tracking progress', error);
      return { unlocked: false };
    }
  }

  /**
   * Increment progress for an achievement
   */
  public async incrementProgress(
    userId: string,
    achievementKey: string,
    increment: number = 1
  ): Promise<{ unlocked: boolean; achievement?: Achievement }> {
    try {
      // Get current progress
      const userAchievements = await this.getUserAchievements(userId);
      const currentProgress = userAchievements.find(ua => ua.achievement?.key === achievementKey);

      const newProgress = (currentProgress?.progress || 0) + increment;

      return this.trackProgress(userId, achievementKey, newProgress);
    } catch (error) {
      log.error('AchievementServiceSupabase', 'Error incrementing progress', error);
      return { unlocked: false };
    }
  }

  /**
   * Get achievements by category
   */
  public async getAchievementsByCategory(
    category: Achievement['category']
  ): Promise<Achievement[]> {
    try {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('category', category)
        .order('requirement_value', { ascending: true });

      if (error) {
        log.error('AchievementServiceSupabase', 'Error fetching achievements by category', error);
        return [];
      }

      return this.mapAchievementsFromDB(data || []);
    } catch (error) {
      log.error('AchievementServiceSupabase', 'Error getting achievements by category', error);
      return [];
    }
  }

  /**
   * Get unlocked achievements for user
   */
  public async getUnlockedAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievements (*)
        `)
        .eq('user_id', userId)
        .eq('is_completed', true)
        .order('unlocked_at', { ascending: false });

      if (error) {
        log.error('AchievementServiceSupabase', 'Error fetching unlocked achievements', error);
        return [];
      }

      return this.mapUserAchievementsFromDB(data || []);
    } catch (error) {
      log.error('AchievementServiceSupabase', 'Error getting unlocked achievements', error);
      return [];
    }
  }

  /**
   * Get recently unlocked achievements that haven't been notified
   */
  public async getUnnotifiedAchievements(userId: string): Promise<UserAchievement[]> {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievements (*)
        `)
        .eq('user_id', userId)
        .eq('is_completed', true)
        .eq('notified', false);

      if (error) {
        log.error('AchievementServiceSupabase', 'Error fetching unnotified achievements', error);
        return [];
      }

      return this.mapUserAchievementsFromDB(data || []);
    } catch (error) {
      log.error('AchievementServiceSupabase', 'Error getting unnotified achievements', error);
      return [];
    }
  }

  /**
   * Mark achievement as notified
   */
  public async markAsNotified(userId: string, achievementId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_achievements')
        .update({ notified: true })
        .eq('user_id', userId)
        .eq('achievement_id', achievementId);

      if (error) {
        log.error('AchievementServiceSupabase', 'Error marking as notified', error);
        return false;
      }

      return true;
    } catch (error) {
      log.error('AchievementServiceSupabase', 'Error marking as notified', error);
      return false;
    }
  }

  /**
   * Subscribe to achievement unlocks
   */
  public addAchievementListener(listener: (achievement: Achievement) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify listeners of achievement unlock
   */
  private notifyListeners(achievement: Achievement): void {
    this.listeners.forEach(listener => listener(achievement));
  }

  /**
   * Map database achievement to Achievement type
   */
  private mapAchievementFromDB(data: any): Achievement {
    return {
      id: data.id,
      key: data.key,
      title: data.title,
      description: data.description,
      icon: data.icon,
      category: data.category,
      requirementType: data.requirement_type,
      requirementValue: data.requirement_value,
      xpReward: data.xp_reward,
      badgeIcon: data.badge_icon,
      rarity: data.rarity,
      hidden: data.hidden,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Map array of database achievements
   */
  private mapAchievementsFromDB(data: any[]): Achievement[] {
    return data.map(item => this.mapAchievementFromDB(item));
  }

  /**
   * Map database user achievement to UserAchievement type
   */
  private mapUserAchievementFromDB(data: any): UserAchievement {
    return {
      id: data.id,
      userId: data.user_id,
      achievementId: data.achievement_id,
      unlockedAt: data.unlocked_at,
      progress: data.progress,
      isCompleted: data.is_completed,
      notified: data.notified,
      achievement: data.achievements ? this.mapAchievementFromDB(data.achievements) : undefined,
    };
  }

  /**
   * Map array of database user achievements
   */
  private mapUserAchievementsFromDB(data: any[]): UserAchievement[] {
    return data.map(item => this.mapUserAchievementFromDB(item));
  }
}

// Export singleton instance
export const achievementServiceSupabase = AchievementServiceSupabase.getInstance();
