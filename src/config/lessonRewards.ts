import { CURRICULUM_UNLOCKS } from './unlockContent';

export interface LessonRecipeReward {
  lessonId: string;
  recipeIds: string[];
  title: string;
  description: string;
}

export const LESSON_RECIPE_REWARDS: LessonRecipeReward[] = CURRICULUM_UNLOCKS
  .filter((unlock) => unlock.status === 'ready' && Array.isArray(unlock.recipeIds) && unlock.recipeIds.length > 0)
  .map((unlock) => ({
    lessonId: unlock.lessonId,
    recipeIds: unlock.recipeIds!,
    title: unlock.assetName,
    description: unlock.description,
  }));

export function getLessonRecipeReward(lessonId?: string | null): LessonRecipeReward | undefined {
  if (!lessonId) return undefined;
  return LESSON_RECIPE_REWARDS.find((reward) => reward.lessonId === lessonId);
}
