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
  xpReward: number;
  keysReward?: number; // Optional vault keys
  badgeReward?: string; // Optional badge ID

  // Requirements
  requirementType: 'lesson_complete' | 'xp_earn' | 'streak_maintain' | 'recipe_view' | 'bar_visit' | 'vault_unlock' | 'quiz_perfect' | 'module_complete';
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
  keys?: number;
  badge?: string;
}
