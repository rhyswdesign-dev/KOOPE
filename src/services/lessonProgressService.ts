/**
 * LESSON PROGRESS SERVICE
 * Manages user lesson/module completion tracking in Supabase
 * Tracks quiz attempts, scores, XP, and overall progress
 */

import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';

export interface LessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  moduleId?: string;
  isCompleted: boolean;
  completedAt?: string;
  itemsAttempted: number;
  itemsCorrect: number;
  accuracy: number;
  bestAccuracy: number;
  xpEarned: number;
  totalXp: number;
  attemptCount: number;
  lastAttemptAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleProgress {
  id: string;
  userId: string;
  moduleId: string;
  isCompleted: boolean;
  completedAt?: string;
  lessonsCompleted: number;
  totalLessons: number;
  completionPercentage: number;
  totalXpEarned: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  lessonId: string;
  itemsAttempted: number;
  itemsCorrect: number;
  accuracy: number;
  xpEarned: number;
  timeSpentSeconds?: number;
  isPerfect: boolean;
  isBestScore: boolean;
  attemptedAt: string;
}

export interface LessonCompletionResult {
  success: boolean;
  progress?: LessonProgress;
  attempt?: QuizAttempt;
  isNewCompletion: boolean;
  isNewBestScore: boolean;
  moduleCompleted?: boolean;
}

class LessonProgressService {
  /**
   * Record a lesson attempt and update progress
   */
  async recordLessonAttempt(params: {
    userId: string;
    lessonId: string;
    moduleId?: string;
    itemsAttempted: number;
    itemsCorrect: number;
    xpEarned: number;
    timeSpentSeconds?: number;
  }): Promise<LessonCompletionResult> {
    try {
      const { userId, lessonId, moduleId, itemsAttempted, itemsCorrect, xpEarned, timeSpentSeconds } = params;

      // Calculate accuracy
      const accuracy = (itemsCorrect / itemsAttempted) * 100;
      const isPerfect = accuracy === 100;
      const isCompleted = accuracy >= 70; // 70% threshold for completion

      // Get or create lesson progress
      let { data: existingProgress, error: fetchError } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        log.error('LessonProgressService', 'Error fetching progress', fetchError);
        return { success: false, isNewCompletion: false, isNewBestScore: false };
      }

      const isNewCompletion = !existingProgress?.is_completed && isCompleted;
      const currentBestAccuracy = existingProgress?.best_accuracy || 0;
      const isNewBestScore = accuracy > currentBestAccuracy;
      const newBestAccuracy = Math.max(accuracy, currentBestAccuracy);

      // Calculate total XP (only add if new completion or best score)
      const xpToAdd = isNewCompletion || isNewBestScore ? xpEarned : 0;
      const totalXp = (existingProgress?.total_xp || 0) + xpToAdd;

      if (existingProgress) {
        // Update existing progress
        const { data: updatedProgress, error: updateError } = await supabase
          .from('lesson_progress')
          .update({
            is_completed: existingProgress.is_completed || isCompleted,
            completed_at: existingProgress.completed_at || (isCompleted ? new Date().toISOString() : null),
            items_attempted: itemsAttempted,
            items_correct: itemsCorrect,
            accuracy,
            best_accuracy: newBestAccuracy,
            xp_earned: xpToAdd,
            total_xp: totalXp,
            attempt_count: (existingProgress.attempt_count || 0) + 1,
            last_attempt_at: new Date().toISOString(),
          })
          .eq('id', existingProgress.id)
          .select()
          .single();

        if (updateError) {
          log.error('LessonProgressService', 'Error updating progress', updateError);
          return { success: false, isNewCompletion, isNewBestScore };
        }

        // Record quiz attempt
        const attempt = await this.recordQuizAttempt({
          userId,
          lessonId,
          itemsAttempted,
          itemsCorrect,
          accuracy,
          xpEarned: xpToAdd,
          timeSpentSeconds,
          isPerfect,
          isBestScore: isNewBestScore,
        });

        return {
          success: true,
          progress: this.mapProgressFromDB(updatedProgress),
          attempt,
          isNewCompletion,
          isNewBestScore,
        };
      } else {
        // Create new progress record
        const { data: newProgress, error: insertError } = await supabase
          .from('lesson_progress')
          .insert({
            user_id: userId,
            lesson_id: lessonId,
            module_id: moduleId,
            is_completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null,
            items_attempted: itemsAttempted,
            items_correct: itemsCorrect,
            accuracy,
            best_accuracy: accuracy,
            xp_earned: xpToAdd,
            total_xp: totalXp,
            attempt_count: 1,
            last_attempt_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          log.error('LessonProgressService', 'Error creating progress', insertError);
          return { success: false, isNewCompletion, isNewBestScore };
        }

        // Record quiz attempt
        const attempt = await this.recordQuizAttempt({
          userId,
          lessonId,
          itemsAttempted,
          itemsCorrect,
          accuracy,
          xpEarned: xpToAdd,
          timeSpentSeconds,
          isPerfect,
          isBestScore: true, // First attempt is always best score
        });

        return {
          success: true,
          progress: this.mapProgressFromDB(newProgress),
          attempt,
          isNewCompletion,
          isNewBestScore: true,
        };
      }
    } catch (error) {
      log.error('LessonProgressService', 'Error recording lesson attempt', error);
      return { success: false, isNewCompletion: false, isNewBestScore: false };
    }
  }

  /**
   * Record individual quiz attempt
   */
  private async recordQuizAttempt(params: {
    userId: string;
    lessonId: string;
    itemsAttempted: number;
    itemsCorrect: number;
    accuracy: number;
    xpEarned: number;
    timeSpentSeconds?: number;
    isPerfect: boolean;
    isBestScore: boolean;
  }): Promise<QuizAttempt | undefined> {
    try {
      const { data, error } = await supabase
        .from('user_quiz_attempts')
        .insert({
          user_id: params.userId,
          lesson_id: params.lessonId,
          items_attempted: params.itemsAttempted,
          items_correct: params.itemsCorrect,
          accuracy: params.accuracy,
          xp_earned: params.xpEarned,
          time_spent_seconds: params.timeSpentSeconds,
          is_perfect: params.isPerfect,
          is_best_score: params.isBestScore,
        })
        .select()
        .single();

      if (error) {
        log.error('LessonProgressService', 'Error recording quiz attempt', error);
        return undefined;
      }

      return this.mapAttemptFromDB(data);
    } catch (error) {
      log.error('LessonProgressService', 'Error in recordQuizAttempt', error);
      return undefined;
    }
  }

  /**
   * Get lesson progress for a user
   */
  async getLessonProgress(userId: string, lessonId: string): Promise<LessonProgress | null> {
    try {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (error) {
        log.error('LessonProgressService', 'Error getting lesson progress', error);
        return null;
      }

      return data ? this.mapProgressFromDB(data) : null;
    } catch (error) {
      log.error('LessonProgressService', 'Error in getLessonProgress', error);
      return null;
    }
  }

  /**
   * Get all lesson progress for a user
   */
  async getAllLessonProgress(userId: string): Promise<LessonProgress[]> {
    try {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        log.error('LessonProgressService', 'Error getting all lesson progress', error);
        return [];
      }

      return (data || []).map(this.mapProgressFromDB);
    } catch (error) {
      log.error('LessonProgressService', 'Error in getAllLessonProgress', error);
      return [];
    }
  }

  /**
   * Get module progress for a user
   */
  async getModuleProgress(userId: string, moduleId: string): Promise<ModuleProgress | null> {
    try {
      const { data, error } = await supabase
        .from('user_module_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .maybeSingle();

      if (error) {
        log.error('LessonProgressService', 'Error getting module progress', error);
        return null;
      }

      return data ? this.mapModuleProgressFromDB(data) : null;
    } catch (error) {
      log.error('LessonProgressService', 'Error in getModuleProgress', error);
      return null;
    }
  }

  /**
   * Get all module progress for a user
   */
  async getAllModuleProgress(userId: string): Promise<ModuleProgress[]> {
    try {
      const { data, error } = await supabase
        .from('user_module_progress')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        log.error('LessonProgressService', 'Error getting all module progress', error);
        return [];
      }

      return (data || []).map(this.mapModuleProgressFromDB);
    } catch (error) {
      log.error('LessonProgressService', 'Error in getAllModuleProgress', error);
      return [];
    }
  }

  /**
   * Get quiz attempt history for a lesson
   */
  async getQuizAttempts(userId: string, lessonId: string): Promise<QuizAttempt[]> {
    try {
      const { data, error } = await supabase
        .from('user_quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .order('attempted_at', { ascending: false });

      if (error) {
        log.error('LessonProgressService', 'Error getting quiz attempts', error);
        return [];
      }

      return (data || []).map(this.mapAttemptFromDB);
    } catch (error) {
      log.error('LessonProgressService', 'Error in getQuizAttempts', error);
      return [];
    }
  }

  /**
   * Map database progress to LessonProgress type
   */
  private mapProgressFromDB(data: any): LessonProgress {
    return {
      id: data.id,
      userId: data.user_id,
      lessonId: data.lesson_id,
      moduleId: data.module_id,
      isCompleted: data.is_completed,
      completedAt: data.completed_at,
      itemsAttempted: data.items_attempted,
      itemsCorrect: data.items_correct,
      accuracy: data.accuracy,
      bestAccuracy: data.best_accuracy,
      xpEarned: data.xp_earned,
      totalXp: data.total_xp,
      attemptCount: data.attempt_count,
      lastAttemptAt: data.last_attempt_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Map database module progress to ModuleProgress type
   */
  private mapModuleProgressFromDB(data: any): ModuleProgress {
    return {
      id: data.id,
      userId: data.user_id,
      moduleId: data.module_id,
      isCompleted: data.is_completed,
      completedAt: data.completed_at,
      lessonsCompleted: data.lessons_completed,
      totalLessons: data.total_lessons,
      completionPercentage: data.completion_percentage,
      totalXpEarned: data.total_xp_earned,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Map database attempt to QuizAttempt type
   */
  private mapAttemptFromDB(data: any): QuizAttempt {
    return {
      id: data.id,
      userId: data.user_id,
      lessonId: data.lesson_id,
      itemsAttempted: data.items_attempted,
      itemsCorrect: data.items_correct,
      accuracy: data.accuracy,
      xpEarned: data.xp_earned,
      timeSpentSeconds: data.time_spent_seconds,
      isPerfect: data.is_perfect,
      isBestScore: data.is_best_score,
      attemptedAt: data.attempted_at,
    };
  }
}

export const lessonProgressService = new LessonProgressService();
