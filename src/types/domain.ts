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
  lessonIds?: string[]; // Legacy field name
  brief?: string;
  whyItMatters?: string;
  unlockReward?: string;
  bestFor?: string[];
  contextBrief?: string;
  requiredTier?: 'FREE' | 'PLUS' | 'PRO';
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string; // Legacy field name
  types?: ExerciseType[];
  itemIds: string[];
  estimatedMinutes: number;
  prerequisiteIds: string[];
  prereqs?: string[]; // Legacy field name
  xpReward?: number; // Legacy field name
  tags?: string[]; // Legacy field name
  brief?: string;
  practiceFocus?: string;
  commonMistake?: string;
  showLessonBrief?: boolean;
  contextBrief?: string;
}

export type ExerciseType = 'mcq' | 'order' | 'short' | 'checkbox' | 'match';
export type ShortAnswerValidationMode = 'exact' | 'contains' | 'keywords';

export interface RoleplayMeta {
  mode?: 'scenario';
  tags?: string[];
}

export interface Item {
  id: string;
  type: ExerciseType;
  prompt: string;
  insight?: string;
  options?: string[]; // For MCQ and checkbox
  answerIndex?: number; // For MCQ
  orderTarget?: string[]; // For order exercises
  expectedOrder?: string[]; // Legacy field name
  answerText?: string; // For short answer
  expectedAnswer?: string; // Legacy field name
  acceptableAnswers?: string[]; // For short answer variations
  validationMode?: ShortAnswerValidationMode;
  requiredKeywords?: string[];
  correct?: string[]; // For checkbox exercises
  pairs?: Array<{left: string; right: string}>; // For match exercises
  roleplay?: RoleplayMeta; // Rendered as MCQ with scenario labeling
  tags: string[];
  conceptId?: string;
  difficulty: number; // 0-1 scale
  xpAward?: number;
  reviewWeight?: number;
}

export interface UserProfile {
  id: string;
  username?: string; // Legacy field name
  email?: string; // Legacy field name
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
  longestStreak?: number; // Legacy field name
  lives: number;
  badges: string[];
  badgeIds?: string[]; // Legacy field name
  createdAt?: Date; // Legacy field name
  lastActiveAt?: Date; // Legacy field name
  preferences?: any; // Legacy field name
}

export interface UserProgress {
  userId: string;
  lessonId: string;
  itemId?: string; // Legacy field name
  mastery: number; // 0-1 scale
  difficulty?: number; // Legacy field name
  interval?: number; // Legacy field name
  easeFactor?: number; // Legacy field name
  dueAt: number; // timestamp
  reviewCount?: number; // Legacy field name
  lapseCount?: number; // Legacy field name
  lastReviewed?: number; // Legacy field name
  skillLevel?: number; // Legacy field name
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
  track?: 'alcoholic' | 'low-abv' | 'zero-proof'; // Legacy field name
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
