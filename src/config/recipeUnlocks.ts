/**
 * Recipe Unlock Configuration
 * Defines engagement-driven unlock requirements for the 11 earnable cocktails
 * FREE tier users can unlock these through streaks, lessons, challenges, or XP
 */

export type UnlockMethodType =
  | 'streak'
  | 'lessons'
  | 'challenges'
  | 'xp'
  | 'app-opens'
  | 'saved-recipes'
  | 'shares'
  | 'invites'
  | 'ratings';

export interface UnlockMethod {
  type: UnlockMethodType;
  required: number;
  challengeId?: string; // For challenge-specific unlocks
  description: string;
}

export interface RecipeUnlock {
  recipeId: string;
  recipeName: string;
  thumbnailUrl: string;
  methods: UnlockMethod[]; // Multiple paths to unlock (OR logic)
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDays: number; // Rough estimate of how long it takes
}

/**
 * The 11 Earnable Cocktails
 * FREE tier: 9 core + these 11 = 20 total essential recipes
 */
export const EARNABLE_RECIPES: RecipeUnlock[] = [
  // EASY UNLOCKS (3-7 days) - Build early engagement
  {
    recipeId: 'tom-collins',
    recipeName: 'Tom Collins',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'easy',
    estimatedDays: 3,
    methods: [
      {
        type: 'app-opens',
        required: 7,
        description: 'Open the app 7 days (any days)',
      },
    ],
  },
  {
    recipeId: 'dark-stormy',
    recipeName: "Dark 'n' Stormy",
    thumbnailUrl:
      'https://images.unsplash.com/photo-1581795669633-91ef2c6cebaf?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'easy',
    estimatedDays: 2,
    methods: [
      {
        type: 'challenges',
        required: 2,
        description: 'Complete 2 daily challenges',
      },
      {
        type: 'ratings',
        required: 5,
        description: 'Rate 5 different cocktails',
      },
    ],
  },
  {
    recipeId: 'paloma',
    recipeName: 'Paloma',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1582745689430-86cd52ad5bf1?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'easy',
    estimatedDays: 5,
    methods: [
      {
        type: 'lessons',
        required: 5,
        description: 'Complete 5 lessons',
      },
      {
        type: 'shares',
        required: 3,
        description: 'Share 3 cocktails with friends',
      },
    ],
  },

  // MEDIUM UNLOCKS (7-14 days) - Sustained engagement
  {
    recipeId: 'gimlet',
    recipeName: 'Gimlet',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'medium',
    estimatedDays: 7,
    methods: [
      {
        type: 'saved-recipes',
        required: 5,
        description: 'Save 5 recipes to favorites',
      },
    ],
  },
  {
    recipeId: 'aperol-spritz',
    recipeName: 'Aperol Spritz',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'medium',
    estimatedDays: 7,
    methods: [
      {
        type: 'invites',
        required: 1,
        description: 'Invite 1 friend to the app',
      },
    ],
  },
  {
    recipeId: 'cosmopolitan',
    recipeName: 'Cosmopolitan',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'medium',
    estimatedDays: 7,
    methods: [
      {
        type: 'lessons',
        required: 8,
        description: 'Complete 8 lessons',
      },
      {
        type: 'xp',
        required: 300,
        description: 'Earn 300 total XP',
      },
    ],
  },
  {
    recipeId: 'french-75',
    recipeName: 'French 75',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'medium',
    estimatedDays: 10,
    methods: [
      {
        type: 'lessons',
        required: 10,
        description: 'Complete 10 lessons',
      },
      {
        type: 'xp',
        required: 500,
        description: 'Earn 500 total XP',
      },
    ],
  },

  // HARD UNLOCKS (14-30 days) - Long-term commitment
  {
    recipeId: 'espresso-martini',
    recipeName: 'Espresso Martini',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1609951651556-5334e2706168?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'hard',
    estimatedDays: 15,
    methods: [
      {
        type: 'xp',
        required: 750,
        description: 'Earn 750 total XP',
      },
    ],
  },
  {
    recipeId: 'sidecar',
    recipeName: 'Sidecar',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1574671928146-5c89a22b2e85?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'hard',
    estimatedDays: 14,
    methods: [
      {
        type: 'challenges',
        required: 5,
        description: 'Complete 5 total challenges',
      },
    ],
  },
  {
    recipeId: 'hemingway-daiquiri',
    recipeName: 'Hemingway Daiquiri',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1581795669633-91ef2c6cebaf?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'hard',
    estimatedDays: 14,
    methods: [
      {
        type: 'streak',
        required: 14,
        description: 'Maintain a 14-day login streak',
      },
    ],
  },
  {
    recipeId: 'mai-tai',
    recipeName: 'Mai Tai',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1581795669633-91ef2c6cebaf?q=80&w=1200&auto=format&fit=crop',
    difficulty: 'hard',
    estimatedDays: 30,
    methods: [
      {
        type: 'streak',
        required: 30,
        description: 'Maintain a 30-day login streak',
      },
    ],
  },
];

/**
 * Get unlock requirements for a specific recipe
 */
export function getRecipeUnlock(recipeId: string): RecipeUnlock | undefined {
  return EARNABLE_RECIPES.find((r) => r.recipeId === recipeId);
}

/**
 * Get all earnable recipe IDs
 */
export function getEarnableRecipeIds(): string[] {
  return EARNABLE_RECIPES.map((r) => r.recipeId);
}

/**
 * Check if a recipe is earnable (vs tier-locked)
 */
export function isRecipeEarnable(recipeId: string): boolean {
  return EARNABLE_RECIPES.some((r) => r.recipeId === recipeId);
}

/**
 * Get recipes by difficulty
 */
export function getRecipesByDifficulty(difficulty: 'easy' | 'medium' | 'hard'): RecipeUnlock[] {
  return EARNABLE_RECIPES.filter((r) => r.difficulty === difficulty);
}
