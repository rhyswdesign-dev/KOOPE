import { curriculumData } from '../../utils/curriculumAdapter';
import type { UnlockTier, CurriculumUnlock } from '../../config/unlockContent';
import { CURRICULUM_UNLOCKS } from '../../config/unlockContent';
import { getUnlockDeck } from '../../content/unlockDecks';

export interface HacksTipsLibraryItem {
  id: string;
  assetSlug: string;
  assetName: string;
  description: string;
  tier: UnlockTier;
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  moduleTitle: string;
  rewardPhase: CurriculumUnlock['rewardPhase'];
  status: CurriculumUnlock['status'];
  hasDeckContent: boolean;
}

const TIER_RANK: Record<UnlockTier, number> = {
  FREE: 0,
  PLUS: 1,
  PRO: 2,
};

function canAccessTier(itemTier: UnlockTier, userTier: UnlockTier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[itemTier];
}

function buildLibraryItem(unlock: CurriculumUnlock): HacksTipsLibraryItem | null {
  if (unlock.format !== 'mini_deck' || !unlock.assetSlug) {
    return null;
  }

  const module = curriculumData.modules.find((entry) => entry.id === unlock.moduleId);
  const lesson = curriculumData.lessons.find((entry) => entry.id === unlock.lessonId);

  return {
    id: unlock.id,
    assetSlug: unlock.assetSlug,
    assetName: unlock.assetName,
    description: unlock.description,
    tier: unlock.tier,
    lessonId: unlock.lessonId,
    lessonTitle: lesson?.title || 'Lesson reward',
    moduleId: unlock.moduleId,
    moduleTitle: module?.title || 'Bartending Curriculum',
    rewardPhase: unlock.rewardPhase,
    status: unlock.status,
    hasDeckContent: Boolean(getUnlockDeck(unlock.assetSlug)),
  };
}

export function getAllMiniDeckLibraryItems(): HacksTipsLibraryItem[] {
  return CURRICULUM_UNLOCKS
    .map(buildLibraryItem)
    .filter((item): item is HacksTipsLibraryItem => Boolean(item));
}

export function getUnlockedMiniDeckLibraryItems(completedLessons: string[], tier: UnlockTier): HacksTipsLibraryItem[] {
  return getAllMiniDeckLibraryItems().filter(
    (item) => item.status === 'ready' && item.hasDeckContent && canAccessTier(item.tier, tier) && completedLessons.includes(item.lessonId)
  );
}

export function getEarnableMiniDeckLibraryItems(completedLessons: string[], tier: UnlockTier): HacksTipsLibraryItem[] {
  return getAllMiniDeckLibraryItems().filter(
    (item) => item.status === 'ready' && item.hasDeckContent && canAccessTier(item.tier, tier) && !completedLessons.includes(item.lessonId)
  );
}

export function getLockedMiniDeckLibraryItems(tier: UnlockTier): HacksTipsLibraryItem[] {
  return getAllMiniDeckLibraryItems().filter(
    (item) => item.status === 'ready' && item.hasDeckContent && !canAccessTier(item.tier, tier)
  );
}

export function getPlannedMiniDeckLibraryItems(tier: UnlockTier): HacksTipsLibraryItem[] {
  return getAllMiniDeckLibraryItems().filter(
    (item) => item.status === 'planned' && canAccessTier(item.tier, tier)
  );
}
