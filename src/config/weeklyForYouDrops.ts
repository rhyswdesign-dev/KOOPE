export type WeeklyDropSlot = 'cocktail' | 'mocktail';
export type WeeklyDropTier = 'PLUS' | 'PRO';

export interface WeeklyForYouDrop {
  id: string;
  slot: WeeklyDropSlot;
  tier: WeeklyDropTier;
  recipeId: string;
  title: string;
  eyebrow: string;
  reason: string;
  profileTags: string[];
  availableFrom: string;
  availableUntil: string;
}

export const WEEKLY_FOR_YOU_DROPS: WeeklyForYouDrop[] = [
  {
    id: 'fyd-2026-w13-cocktail',
    slot: 'cocktail',
    tier: 'PRO',
    recipeId: 'drop-midnight-orchard-sour',
    title: 'Precision Sour Drop',
    eyebrow: 'Weekly Cocktail Drop',
    reason: 'Pushes citrus, texture, and approachable whiskey-adjacent richness.',
    profileTags: ['sweet', 'citrus', 'hosting', 'beginner-friendly'],
    availableFrom: '2026-03-22T00:00:00.000Z',
    availableUntil: '2026-03-25T23:59:59.000Z',
  },
  {
    id: 'fyd-2026-w13-mocktail',
    slot: 'mocktail',
    tier: 'PRO',
    recipeId: 'drop-greenhouse-tonic',
    title: 'Zero-Proof Lift Drop',
    eyebrow: 'Weekly Mocktail Drop',
    reason: 'Designed for users trending toward green, bright, and lower-ABV signals.',
    profileTags: ['zero-proof', 'citrus', 'herbal', 'refreshing'],
    availableFrom: '2026-03-26T00:00:00.000Z',
    availableUntil: '2026-03-29T23:59:59.000Z',
  },
];

export function getActiveWeeklyForYouDrops(
  date: Date = new Date(),
  tier: WeeklyDropTier = 'PRO'
): WeeklyForYouDrop[] {
  const now = date.getTime();
  return WEEKLY_FOR_YOU_DROPS.filter((drop) => {
    if (drop.tier !== tier) return false;
    const start = new Date(drop.availableFrom).getTime();
    const end = new Date(drop.availableUntil).getTime();
    return now >= start && now <= end;
  });
}

export function getWeeklyDropsForProfile(tags: string[], date: Date = new Date(), tier: WeeklyDropTier = 'PRO') {
  const now = date.getTime();
  const weekAhead = now + 7 * 24 * 60 * 60 * 1000;
  const activeDrops = WEEKLY_FOR_YOU_DROPS.filter((drop) => {
    if (drop.tier !== tier) return false;
    const start = new Date(drop.availableFrom).getTime();
    const end = new Date(drop.availableUntil).getTime();
    return end >= now && start <= weekAhead;
  });
  const normalizedTags = tags.map((tag) => tag.toLowerCase());

  return activeDrops.sort((a, b) => {
    const aMatches = a.profileTags.filter((tag) => normalizedTags.includes(tag.toLowerCase())).length;
    const bMatches = b.profileTags.filter((tag) => normalizedTags.includes(tag.toLowerCase())).length;
    return bMatches - aMatches;
  });
}
