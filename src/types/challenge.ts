/**
 * Challenge Types
 */

export type ChallengeFrequency = 'daily' | 'weekly' | 'monthly';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard' | 'epic';
export type ChallengeCategory = 'skill' | 'progress' | 'exploration' | 'social';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  frequency: ChallengeFrequency;
  difficulty: ChallengeDifficulty;

  // Access gating — 'free' is open to all, 'pro' requires a PRO subscription
  tier?: 'free' | 'pro';

  xpReward: number;
  badgeReward?: string; // Optional badge ID

  // Requirements
  requirementType:
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
  requirementCount: number; // How many times to do the action

  // Tracking
  currentProgress?: number; // User's current progress
  isCompleted?: boolean;
  completedAt?: string;
  expiresAt: string; // When this challenge expires

  // Metadata
  icon: string; // Ionicons icon name
  color: string; // Hex color for the challenge card
  createdAt: string;
  updatedAt: string;

  // Analytics — describes what behavior data completing this challenge captures.
  // Used for brand partnership reporting and recommendation refinement.
  dataCollected?: string[];
}

export interface UserChallengeProgress {
  userId: string;
  challengeId: string;
  progress: number;
  isCompleted: boolean;
  completedAt?: string;
  startedAt: string;
  updatedAt: string;
}

export interface ChallengeReward {
  xp: number;
  badge?: string;
}
