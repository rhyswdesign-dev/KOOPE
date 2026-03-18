import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';
import type { UserPersonalizationProfile } from './personalizedExperience';

export const ONBOARDING_QUESTIONNAIRE_KEY = '@KOOPE:onboarding_questionnaire_v1';

export type OnboardingGoal =
  | 'learn_bartending'
  | 'make_better_drinks'
  | 'host_parties'
  | 'track_inventory'
  | 'explore_spirits';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';
export type Frequency = 'rare' | 'casual' | 'regular' | 'daily';
export type AlcoholFree = 'yes' | 'no' | 'both';
export type BudgetRange = 'budget' | 'mid' | 'premium' | 'luxury' | 'varies';
export type BottleCountRange = 'none' | '1_5' | '6_15' | '16_30' | '30_plus';
export type ComplexityPreference = 'simple' | 'moderate' | 'advanced' | 'variety';
export type DiscoverySource =
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'friend'
  | 'app_store'
  | 'google'
  | 'event'
  | 'other';

export type SpiritKey =
  | 'vodka'
  | 'gin'
  | 'rum'
  | 'tequila'
  | 'mezcal'
  | 'bourbon'
  | 'scotch'
  | 'rye'
  | 'brandy'
  | 'explore';

export type FlavorKey =
  | 'citrus'
  | 'sweet'
  | 'bitter'
  | 'smoky'
  | 'spicy'
  | 'smooth'
  | 'spirit_forward'
  | 'creamy';

export interface OnboardingQuestionnaireAnswers {
  goal: OnboardingGoal;
  skillLevel: SkillLevel;
  flavors: FlavorKey[];
  spirits: SpiritKey[];
  dislikes: string[];
  frequency: Frequency;
  alcoholFree: AlcoholFree;
  occasions?: string[];
  budgetRange?: BudgetRange;
  currentBottleCount?: BottleCountRange;
  complexityPreference?: ComplexityPreference;
  thirtyDayGoal?: string;
  heardAboutUs?: DiscoverySource;
  appRating?: number;
}

export interface LearningProfile {
  goal: OnboardingGoal;
  skillLevel: SkillLevel;
  spiritPreferences: Record<SpiritKey, number>;
  flavorProfile: Record<FlavorKey, number>;
  dislikes: string[];
  frequency: Frequency;
  includeNonAlcoholic: boolean;
  occasions?: string[];
  budgetRange?: BudgetRange;
  currentBottleCount?: BottleCountRange;
  complexityPreference?: ComplexityPreference;
  thirtyDayGoal?: string;
  heardAboutUs?: DiscoverySource;
  appRating?: number;
}

const SPIRIT_KEYS: SpiritKey[] = [
  'vodka',
  'gin',
  'rum',
  'tequila',
  'mezcal',
  'bourbon',
  'scotch',
  'rye',
  'brandy',
  'explore',
];

const FLAVOR_KEYS: FlavorKey[] = [
  'citrus',
  'sweet',
  'bitter',
  'smoky',
  'spicy',
  'smooth',
  'spirit_forward',
  'creamy',
];

export function buildInitialLearningProfile(answers: OnboardingQuestionnaireAnswers): LearningProfile {
  const selectedSpirits =
    answers.spirits.length > 0 ? answers.spirits : (['explore'] as SpiritKey[]);
  const selectedFlavors =
    answers.flavors.length > 0 ? answers.flavors : (['smooth', 'citrus'] as FlavorKey[]);

  const spiritWeight = 1 / selectedSpirits.length;
  const flavorWeight = 1 / selectedFlavors.length;

  const spiritPreferences = SPIRIT_KEYS.reduce((acc, key) => {
    acc[key] = selectedSpirits.includes(key) ? spiritWeight : 0;
    return acc;
  }, {} as Record<SpiritKey, number>);

  const flavorProfile = FLAVOR_KEYS.reduce((acc, key) => {
    acc[key] = selectedFlavors.includes(key) ? flavorWeight : 0;
    return acc;
  }, {} as Record<FlavorKey, number>);

  return {
    goal: answers.goal,
    skillLevel: answers.skillLevel,
    spiritPreferences,
    flavorProfile,
    dislikes: answers.dislikes,
    frequency: answers.frequency,
    includeNonAlcoholic: answers.alcoholFree !== 'no',
    occasions: answers.occasions,
    budgetRange: answers.budgetRange,
    currentBottleCount: answers.currentBottleCount,
    complexityPreference: answers.complexityPreference,
    thirtyDayGoal: answers.thirtyDayGoal,
    heardAboutUs: answers.heardAboutUs,
    appRating: answers.appRating,
  };
}

export function toPersonalizationPatch(
  answers: OnboardingQuestionnaireAnswers
): Partial<UserPersonalizationProfile> {
  const favoriteSpirits = answers.spirits
    .filter((s) => s !== 'explore')
    .slice(0, 3)
    .map((spirit) => {
      if (spirit === 'bourbon' || spirit === 'scotch' || spirit === 'rye') return 'whiskey';
      return spirit;
    });

  const flavorPreferences = answers.flavors.map((flavor) =>
    flavor === 'spirit_forward' ? 'spirit' : flavor
  );

  const skillLevel =
    answers.skillLevel === 'beginner'
      ? 'beginner'
      : answers.skillLevel === 'advanced'
        ? 'advanced'
        : 'intermediate';

  const preferredABV: UserPersonalizationProfile['preferredABV'] =
    answers.alcoholFree === 'no'
      ? 'alcoholic'
      : answers.alcoholFree === 'yes'
        ? 'zero-proof'
        : 'low-abv';

  const preferredDifficulty =
    answers.complexityPreference === 'advanced'
      ? ['Medium', 'Hard']
      : answers.complexityPreference === 'simple'
        ? ['Easy']
        : ['Easy', 'Medium'];

  return {
    favoriteSpirits: favoriteSpirits.length > 0 ? favoriteSpirits : ['gin', 'rum'],
    flavorPreferences: flavorPreferences.length > 0 ? flavorPreferences : ['citrus', 'smooth'],
    skillLevel,
    preferredABV,
    preferredDifficulty,
    learningGoals: [answers.goal, answers.thirtyDayGoal || 'master_classics'].filter(Boolean),
  };
}

export function getTrialHeadline(goal: OnboardingGoal): string {
  switch (goal) {
    case 'learn_bartending':
      return 'Start Your 7-Day Bartending Bootcamp';
    case 'make_better_drinks':
      return 'Unlock Your Perfect Home Bar';
    case 'host_parties':
      return 'Host Like a Pro — Free for 7 Days';
    case 'track_inventory':
      return 'Get Your Bar Organized — Free Trial';
    case 'explore_spirits':
      return 'Explore New Spirits — Free for 7 Days';
    default:
      return 'Start Your Free 7-Day Trial';
  }
}

export function getTrialBenefits(goal: OnboardingGoal): string[] {
  const base = [
    'Vault access',
    'Unlimited bottle inventory',
    'Smart inventory management',
    'Advanced cocktail filters',
    'Optimize My Bar insights',
  ];

  if (goal === 'learn_bartending') return [...base, 'Mastery lessons preview', 'Technique practice track'];
  if (goal === 'host_parties') return [...base, 'Hosting mode for groups', 'Party scaling tools'];
  if (goal === 'track_inventory') return [...base, 'Bar health score', 'Expiry-aware tracking'];
  if (goal === 'explore_spirits') return [...base, 'Broader spirit discovery feed', 'Flavor-driven recommendations'];
  return base;
}

export function estimateRecipeMatchCount(answers: OnboardingQuestionnaireAnswers): number {
  const spiritFactor = Math.max(1, answers.spirits.length);
  const flavorFactor = Math.max(1, answers.flavors.length);
  const complexityBoost = answers.complexityPreference === 'advanced' ? 8 : answers.complexityPreference === 'simple' ? 4 : 6;
  return Math.min(120, 12 + spiritFactor * 6 + flavorFactor * 4 + complexityBoost);
}

export async function persistOnboardingQuestionnaire(
  answers: OnboardingQuestionnaireAnswers,
  learningProfile: LearningProfile
): Promise<void> {
  await AsyncStorage.setItem(
    ONBOARDING_QUESTIONNAIRE_KEY,
    JSON.stringify({
      answers,
      learningProfile,
      version: 1,
      updatedAt: Date.now(),
    })
  );

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        preferences: {
          onboardingQuestionnaire: answers,
          learningProfile,
          onboardingQuestionnaireVersion: 1,
          onboardingQuestionnaireUpdatedAt: Date.now(),
        },
        updated_at: new Date().toISOString(),
      });

    if (error) {
      log.warn('OnboardingQuestionnaireService', 'Supabase questionnaire sync skipped', { code: error.code });
    }
  } catch (error) {
    log.warn('OnboardingQuestionnaireService', 'Failed to sync questionnaire to Supabase', { error });
  }
}
