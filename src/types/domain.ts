/**
 * Domain Models for Duolingo-style Bartending App
 * TypeScript interfaces for all core entities
 */

export interface Module {
  id: string;
  title: string;
  chapterIndex: number;
  description: string;
  prerequisiteIds: string[];
  estimatedMinutes: number;
  tags: string[];
  lessonIds?: string[]; // For Firestore compatibility
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string; // For Firestore compatibility
  types?: ExerciseType[];
  itemIds: string[];
  estimatedMinutes: number;
  prerequisiteIds: string[];
  prereqs?: string[]; // For Firestore compatibility
  xpReward?: number; // For Firestore compatibility
  tags?: string[]; // For Firestore compatibility
}

export type ExerciseType = 'mcq' | 'order' | 'short' | 'checkbox' | 'match';

export interface Item {
  id: string;
  type: ExerciseType;
  prompt: string;
  insight?: string;
  options?: string[]; // For MCQ and checkbox
  answerIndex?: number; // For MCQ
  orderTarget?: string[]; // For order exercises
  expectedOrder?: string[]; // For Firestore compatibility
  answerText?: string; // For short answer
  expectedAnswer?: string; // For Firestore compatibility
  acceptableAnswers?: string[]; // For short answer variations
  correct?: string[]; // For checkbox exercises
  pairs?: Array<{left: string; right: string}>; // For match exercises
  roleplay?: any; // For roleplay exercises
  tags: string[];
  conceptId?: string;
  difficulty: number; // 0-1 scale
  xpAward?: number;
  reviewWeight?: number;
}

export interface UserProfile {
  id: string;
  username?: string; // For Firestore compatibility
  email?: string; // For Firestore compatibility
  level: number;
  track: 'alcoholic' | 'low-abv' | 'zero-proof';
  spiritFocus: string[];
  goals: string[];
  sessionMinutes: number;
  consent: {
    analytics: boolean;
    date: number;
  };
  xp: number;
  streak: number;
  longestStreak?: number; // For Firestore compatibility
  lives: number;
  badges: string[];
  badgeIds?: string[]; // For Firestore compatibility
  createdAt?: Date; // For Firestore compatibility
  lastActiveAt?: Date; // For Firestore compatibility
  preferences?: any; // For Firestore compatibility
}

export interface UserProgress {
  userId: string;
  lessonId: string;
  itemId?: string; // For Firestore compatibility
  mastery: number; // 0-1 scale
  difficulty?: number; // For Firestore compatibility
  interval?: number; // For Firestore compatibility
  easeFactor?: number; // For Firestore compatibility
  dueAt: number; // timestamp
  reviewCount?: number; // For Firestore compatibility
  lapseCount?: number; // For Firestore compatibility
  lastReviewed?: number; // For Firestore compatibility
  skillLevel?: number; // For Firestore compatibility
  streak: number;
  lastResult: 'pass' | 'fail';
  stability: number; // For spaced repetition
}

export interface Attempt {
  id: string;
  userId: string;
  itemId: string;
  correct: boolean;
  msToAnswer: number;
  timestamp: number;
  exerciseType: ExerciseType;
}

export interface PlacementResult {
  level: 'beginner' | 'intermediate' | 'advanced';
  track: 'alcoholic' | 'low-abv' | 'zero-proof';
  spirits: string[];
  startModuleId: string;
  interlude: string;
  sessionMinutes: number;
}

export interface PersonalizationProfile {
  topSpirits: string[];
  flavorVibes: string[];
  outingPriorities: string[];
  track?: 'alcoholic' | 'low-abv' | 'zero-proof'; // For Firestore compatibility
  adsEligible?: boolean;
}

export interface SurveyAnswer {
  questionId: string;
  value: string | string[];
}

export interface SurveyResponse {
  questionId: string;
  selectedAnswers: string[];
}

export interface FeedCard {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: number;
  tags?: string[];
  imageUrl?: string;
}

export interface SessionPlan {
  items: Item[];
  mix: {
    current: number;
    review: number;
    older: number;
  };
  expectedMinutes: number;
}

export interface FeedCard {
  id: string;
  type: 'featured_cocktail' | 'spirit_module' | 'venue' | 'sponsored';
  title: string;
  subtitle?: string;
  imageUrl?: string;
  priority: 'gold' | 'silver' | 'bronze';
  metadata: Record<string, any>;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  unlockedAt?: number;
}

export interface AnalyticsEvent {
  type: string;
  userId?: string;
  timestamp: number;
  properties: Record<string, any>;
}
