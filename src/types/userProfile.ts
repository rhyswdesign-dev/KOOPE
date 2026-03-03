/**
 * Enhanced User Profile Types for Personalized Experience
 * Supports personalized cocktail recommendations and learning paths
 */

export interface EnhancedUserProfile {
  // Core Identity
  id: string;
  email?: string;
  username?: string;
  createdAt: Date;
  lastActiveAt: Date;

  // Survey Data - Experience & Skill
  experienceLevel: 'never' | 'occasionally' | 'regularly';
  techniqueConfidence: 'not-at-all' | 'somewhat' | 'very-confident';
  skillLevel: 'beginner' | 'intermediate' | 'advanced'; // Calculated from quiz

  // Survey Data - Behavior & Frequency
  makingFrequency: 'rarely' | 'monthly' | 'weekly' | 'daily';
  outingFrequency: 'rarely' | 'monthly' | 'weekly' | 'weekends';
  outingPriorities: OutingPriority[]; // What matters when going out

  // Survey Data - Preferences
  spiritPreferences: Spirit[]; // Ordered by preference
  favoriteSpirit?: Spirit; // Primary spirit for recommendations
  alcoholPreference: 'alcoholic' | 'low-abv' | 'zero-proof';
  avoidsAlcohol: boolean;
  flavorProfiles: FlavorProfile[]; // Ordered by preference
  learningGoals: LearningGoal[];
  availableTools: BarTool[];

  // Personalization Settings
  preferredSessionMinutes: 3 | 5 | 8;
  preferredABVRange?: { min: number; max: number }; // Calculated from alcoholPreference

  // Learning Progress
  track: 'alcoholic' | 'low-abv' | 'zero-proof';
  level: number;
  xp: number;
  streak: number;
  longestStreak: number;
  lives: number;
  badges: string[];
  startModuleId?: string;

  // User-Generated Content
  savedRecipes: string[]; // Recipe IDs
  createdRecipes: string[]; // Recipe IDs
  favoriteRecipes: string[]; // Recipe IDs for quick access
  dislikedRecipes: string[]; // Recipe IDs to avoid in recommendations

  // Bar Inventory (for photo recognition feature)
  barInventory?: BarInventoryItem[];

  // Recommendation Engine Data
  tasteProfile?: TasteProfile;
  interactionHistory?: InteractionHistory;

  // Consent & Privacy
  consent: {
    analytics: boolean;
    personalization: boolean;
    date: number;
  };
}

// Supporting Types

export type Spirit =
  | 'tequila'
  | 'whiskey'
  | 'rum'
  | 'gin'
  | 'vodka'
  | 'brandy'
  | 'liqueurs'
  | 'gin-alternative'
  | 'rum-alternative'
  | 'none';

export type FlavorProfile =
  | 'citrus'      // Citrus & Fresh
  | 'herbal'      // Herbal & Green
  | 'bitter'      // Bitter & Complex
  | 'sweet'       // Sweet & Fruity
  | 'smoky'       // Smoky & Bold
  | 'floral'      // Floral & Light
  | 'spiced';     // Spiced & Warm

export type OutingPriority =
  | 'music'       // Music/DJ or live performances
  | 'drinks'      // Quality drinks/cocktails
  | 'decor'       // Room décor & design
  | 'atmosphere'  // Atmosphere/crowd vibe
  | 'food'        // Food options
  | 'price';      // Price/promotions

export type LearningGoal =
  | 'host'         // Host better
  | 'classics'     // Learn classics
  | 'originals'    // Create originals
  | 'professional'; // Train for professional bar work

export type BarTool =
  | 'jigger'
  | 'shaker'
  | 'barspoon'
  | 'strainer'
  | 'muddler'
  | 'none';

export interface BarInventoryItem {
  id: string;
  name: string;
  type: Spirit;
  brand?: string;
  photoUrl?: string;
  addedAt: Date;
  quantity?: 'full' | 'half' | 'low';
}

// Taste Profile - Built over time from user interactions
export interface TasteProfile {
  // Weighted preferences (0-1 scale)
  flavorWeights: {
    [key in FlavorProfile]: number;
  };
  spiritWeights: {
    [key in Spirit]: number;
  };

  // Preferred ranges
  preferredABV: { min: number; max: number };
  preferredComplexity: number; // 0-1 scale (simple to complex)

  // Behavioral patterns
  timeOfDayPreferences?: {
    morning?: string[]; // Recipe IDs
    afternoon?: string[];
    evening?: string[];
  };
}

// Interaction History - For improving recommendations
export interface InteractionHistory {
  viewedRecipes: RecipeInteraction[];
  savedRecipes: RecipeInteraction[];
  completedRecipes: RecipeInteraction[];
  searchQueries: string[];
  lastUpdated: Date;
}

export interface RecipeInteraction {
  recipeId: string;
  timestamp: Date;
  rating?: number; // 1-5 stars
  feedback?: 'loved' | 'liked' | 'disliked' | 'skipped';
  completionId?: string;
  completionDetails?: RecipeCompletionDetails;
}

export interface RecipeCompletionDetails {
  ingredientBrands?: Array<{
    ingredient: string;
    amount?: string;
    brandUsed: string;
  }>;
  substitutions?: string;
  techniqueVariations?: string;
  personalModifications?: string;
  notes?: string;
}

// Helper function to calculate ABV range from alcohol preference
export function getABVRangeForPreference(
  preference: 'alcoholic' | 'low-abv' | 'zero-proof'
): { min: number; max: number } {
  switch (preference) {
    case 'zero-proof':
      return { min: 0, max: 0.5 };
    case 'low-abv':
      return { min: 0.5, max: 15 };
    case 'alcoholic':
      return { min: 15, max: 100 };
  }
}

// Helper function to create default user profile
export function createDefaultUserProfile(userId: string, email?: string): EnhancedUserProfile {
  return {
    id: userId,
    email,
    createdAt: new Date(),
    lastActiveAt: new Date(),

    // Default survey values
    experienceLevel: 'never',
    techniqueConfidence: 'not-at-all',
    skillLevel: 'beginner',
    makingFrequency: 'rarely',
    outingFrequency: 'rarely',
    outingPriorities: [],
    spiritPreferences: [],
    alcoholPreference: 'alcoholic',
    avoidsAlcohol: false,
    flavorProfiles: [],
    learningGoals: [],
    availableTools: [],
    preferredSessionMinutes: 5,

    // Learning progress
    track: 'alcoholic',
    level: 1,
    xp: 0,
    streak: 0,
    longestStreak: 0,
    lives: 5,
    badges: [],

    // Collections
    savedRecipes: [],
    createdRecipes: [],
    favoriteRecipes: [],
    dislikedRecipes: [],

    // Consent
    consent: {
      analytics: false,
      personalization: false,
      date: Date.now(),
    },
  };
}

// Convert survey answers to user profile
export function surveyAnswersToProfile(
  userId: string,
  answers: { [questionId: string]: string | string[] },
  email?: string
): Partial<EnhancedUserProfile> {
  const profile = createDefaultUserProfile(userId, email);

  // Q1: Experience
  if (answers.q1) {
    profile.experienceLevel = answers.q1 as any;
  }

  // Q2: Technique Confidence
  if (answers.q2) {
    profile.techniqueConfidence = answers.q2 as any;
  }

  // Q5: Making Frequency
  if (answers.q5) {
    profile.makingFrequency = answers.q5 as any;
  }

  // Q6: Outing Frequency
  if (answers.q6) {
    profile.outingFrequency = answers.q6 as any;
  }

  // Q7: Outing Priorities
  if (answers.q7 && Array.isArray(answers.q7)) {
    profile.outingPriorities = answers.q7 as OutingPriority[];
  }

  // Q8: Spirit Preferences
  if (answers.q8 && Array.isArray(answers.q8)) {
    profile.spiritPreferences = answers.q8 as Spirit[];
    profile.favoriteSpirit = (answers.q8[0] as Spirit) || undefined;
  }

  // Q9: Alcohol Preference
  if (answers.q9) {
    profile.alcoholPreference = answers.q9 as any;
    profile.preferredABVRange = getABVRangeForPreference(answers.q9 as any);
  }

  // Q10: Avoids Alcohol
  if (answers.q10) {
    profile.avoidsAlcohol = answers.q10 === 'yes';
    if (profile.avoidsAlcohol) {
      profile.alcoholPreference = 'zero-proof';
      profile.track = 'zero-proof';
    }
  }

  // Q11: Flavor Profiles
  if (answers.q11 && Array.isArray(answers.q11)) {
    profile.flavorProfiles = answers.q11 as FlavorProfile[];
  }

  // Q12: Learning Goals
  if (answers.q12 && Array.isArray(answers.q12)) {
    profile.learningGoals = answers.q12 as LearningGoal[];
  }

  // Q13: Available Tools
  if (answers.q13 && Array.isArray(answers.q13)) {
    profile.availableTools = answers.q13 as BarTool[];
  }

  // Q15: Session Minutes
  if (answers.q15) {
    const timeMap: { [key: string]: 3 | 5 | 8 } = {
      '3m': 3,
      '5m': 5,
      '8m': 8,
    };
    profile.preferredSessionMinutes = timeMap[answers.q15 as string] || 5;
  }

  return profile;
}
