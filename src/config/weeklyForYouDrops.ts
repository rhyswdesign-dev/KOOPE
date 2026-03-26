// ─── Weekly For You Drops ─────────────────────────────────────────────────────
//
// Config-driven weekly drop rotation. New drops = add an entry here, no screen changes needed.
//
// Tier logic:
//   slot: 'cocktail' — available to PLUS and PRO
//   slot: 'mocktail' — available to PRO only
//
// Source field is designed for future bartender/bar partnership drops:
//   'catalog'   — from the main cocktails.ts recipe catalog
//   'exclusive' — standalone recipe not in the main catalog
//   'bartender' — future: sourced from a named bartender
//   'bar'       — future: sourced from a bar partnership
//
// To add a new week:
//   1. Copy the two entries from the most recent week
//   2. Update id (fyd-YYYY-wNN-slot), dates, recipeId, title, reason, profileTags
//   3. Keep availableFrom Sunday 00:00:00Z, availableUntil Saturday 23:59:59Z

export type WeeklyDropSlot = 'cocktail' | 'mocktail';
export type WeeklyDropTier = 'PLUS' | 'PRO';
export type WeeklyDropSource = 'catalog' | 'exclusive' | 'bartender' | 'bar';

export interface WeeklyForYouDrop {
  id: string;
  slot: WeeklyDropSlot;
  /** PLUS = cocktail slot (PLUS + PRO). PRO = mocktail slot (PRO only). */
  tier: WeeklyDropTier;
  /** Recipe ID: matches cocktails.ts id field for catalog drops, or weeklyForYouDropRecipes.ts for exclusive. */
  recipeId: string;
  title: string;
  eyebrow: string;
  reason: string;
  profileTags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  baseSpirit?: string;
  source: WeeklyDropSource;
  availableFrom: string;
  availableUntil: string;
}

export const WEEKLY_FOR_YOU_DROPS: WeeklyForYouDrop[] = [

  // ── Week 13 · March 22–28 ──────────────────────────────────────────────────
  {
    id: 'fyd-2026-w13-cocktail',
    slot: 'cocktail',
    tier: 'PLUS',
    recipeId: 'drop-midnight-orchard-sour',
    title: 'Precision Sour Drop',
    eyebrow: 'Weekly Cocktail Drop',
    reason: 'Pushes citrus, texture, and approachable whiskey-adjacent richness.',
    profileTags: ['sweet', 'citrus', 'hosting', 'beginner-friendly'],
    difficulty: 'medium',
    baseSpirit: 'whiskey',
    source: 'exclusive',
    availableFrom: '2026-03-22T00:00:00.000Z',
    availableUntil: '2026-03-28T23:59:59.000Z',
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
    difficulty: 'easy',
    baseSpirit: 'zero-proof',
    source: 'exclusive',
    availableFrom: '2026-03-22T00:00:00.000Z',
    availableUntil: '2026-03-28T23:59:59.000Z',
  },

  // ── Week 14 · March 29 – April 4 ──────────────────────────────────────────
  {
    id: 'fyd-2026-w14-cocktail',
    slot: 'cocktail',
    tier: 'PLUS',
    recipeId: 'negroni',
    title: 'The Italian Standard',
    eyebrow: 'Weekly Cocktail Drop',
    reason: 'Equal parts, perfect balance. The drink that teaches every bartender about bittersweet structure.',
    profileTags: ['bitter', 'spirit-forward', 'classic', 'hosting', 'gin'],
    difficulty: 'easy',
    baseSpirit: 'gin',
    source: 'catalog',
    availableFrom: '2026-03-29T00:00:00.000Z',
    availableUntil: '2026-04-04T23:59:59.000Z',
  },
  {
    id: 'fyd-2026-w14-mocktail',
    slot: 'mocktail',
    tier: 'PRO',
    recipeId: 'aperol-spritz',
    title: 'The Aperitivo Hour',
    eyebrow: 'Weekly Drop',
    reason: 'Low-ABV, crowd-pleasing, and effortless to batch. The aperitivo moment in a glass.',
    profileTags: ['low-abv', 'refreshing', 'citrus', 'casual', 'hosting'],
    difficulty: 'easy',
    baseSpirit: 'aperol',
    source: 'catalog',
    availableFrom: '2026-03-29T00:00:00.000Z',
    availableUntil: '2026-04-04T23:59:59.000Z',
  },

  // ── Week 15 · April 5–11 ──────────────────────────────────────────────────
  {
    id: 'fyd-2026-w15-cocktail',
    slot: 'cocktail',
    tier: 'PLUS',
    recipeId: 'daiquiri',
    title: 'Three Ingredients. No Excuses.',
    eyebrow: 'Weekly Cocktail Drop',
    reason: 'The daiquiri exposes technique. Nail the ratio and you understand balance in every citrus drink.',
    profileTags: ['citrus', 'rum', 'classic', 'beginner-friendly', 'sour'],
    difficulty: 'easy',
    baseSpirit: 'rum',
    source: 'catalog',
    availableFrom: '2026-04-05T00:00:00.000Z',
    availableUntil: '2026-04-11T23:59:59.000Z',
  },
  {
    id: 'fyd-2026-w15-mocktail',
    slot: 'mocktail',
    tier: 'PRO',
    recipeId: 'hugo',
    title: 'Garden in a Glass',
    eyebrow: 'Weekly Drop',
    reason: 'Elderflower, mint, and bubbles — the lightest drink in the catalog and one of the most requested.',
    profileTags: ['floral', 'refreshing', 'light', 'casual', 'low-abv'],
    difficulty: 'easy',
    baseSpirit: 'prosecco',
    source: 'catalog',
    availableFrom: '2026-04-05T00:00:00.000Z',
    availableUntil: '2026-04-11T23:59:59.000Z',
  },

  // ── Week 16 · April 12–18 ─────────────────────────────────────────────────
  {
    id: 'fyd-2026-w16-cocktail',
    slot: 'cocktail',
    tier: 'PLUS',
    recipeId: 'penicillin',
    title: 'The Modern Classic',
    eyebrow: 'Weekly Cocktail Drop',
    reason: 'Smoky, sweet, sour — three flavors in tension. One drink that explains why modern cocktails work.',
    profileTags: ['smoky', 'citrus', 'whiskey', 'modern', 'adventurous'],
    difficulty: 'medium',
    baseSpirit: 'scotch',
    source: 'catalog',
    availableFrom: '2026-04-12T00:00:00.000Z',
    availableUntil: '2026-04-18T23:59:59.000Z',
  },
  {
    id: 'fyd-2026-w16-mocktail',
    slot: 'mocktail',
    tier: 'PRO',
    recipeId: 'paloma',
    title: 'Mexico\'s Everyday Drink',
    eyebrow: 'Weekly Drop',
    reason: 'Grapefruit done right. The Paloma is what tequila drinkers actually order when no one is watching.',
    profileTags: ['citrus', 'tequila', 'refreshing', 'casual', 'beginner-friendly'],
    difficulty: 'easy',
    baseSpirit: 'tequila',
    source: 'catalog',
    availableFrom: '2026-04-12T00:00:00.000Z',
    availableUntil: '2026-04-18T23:59:59.000Z',
  },

  // ── Week 17 · April 19–25 ─────────────────────────────────────────────────
  {
    id: 'fyd-2026-w17-cocktail',
    slot: 'cocktail',
    tier: 'PLUS',
    recipeId: 'manhattan',
    title: 'The Stirred Standard',
    eyebrow: 'Weekly Cocktail Drop',
    reason: 'Every serious home bartender should own their Manhattan. This is where you make it yours.',
    profileTags: ['spirit-forward', 'whiskey', 'classic', 'stirred', 'hosting'],
    difficulty: 'easy',
    baseSpirit: 'whiskey',
    source: 'catalog',
    availableFrom: '2026-04-19T00:00:00.000Z',
    availableUntil: '2026-04-25T23:59:59.000Z',
  },
  {
    id: 'fyd-2026-w17-mocktail',
    slot: 'mocktail',
    tier: 'PRO',
    recipeId: 'gin-tonic',
    title: 'The Ratio That Changed Casual Drinking',
    eyebrow: 'Weekly Drop',
    reason: 'The G&T teaches restraint. Spirit-forward, herbal, and ice-cold — the template for every highball.',
    profileTags: ['herbal', 'bitter', 'gin', 'refreshing', 'casual'],
    difficulty: 'easy',
    baseSpirit: 'gin',
    source: 'catalog',
    availableFrom: '2026-04-19T00:00:00.000Z',
    availableUntil: '2026-04-25T23:59:59.000Z',
  },

  // ── Week 18 · April 26 – May 2 ────────────────────────────────────────────
  {
    id: 'fyd-2026-w18-cocktail',
    slot: 'cocktail',
    tier: 'PLUS',
    recipeId: 'last-word',
    title: 'The Forgotten Classic',
    eyebrow: 'Weekly Cocktail Drop',
    reason: 'Equal parts, four bold flavors that somehow balance. The Last Word rewards anyone willing to try something unexpected.',
    profileTags: ['herbal', 'citrus', 'gin', 'adventurous', 'classic'],
    difficulty: 'medium',
    baseSpirit: 'gin',
    source: 'catalog',
    availableFrom: '2026-04-26T00:00:00.000Z',
    availableUntil: '2026-05-02T23:59:59.000Z',
  },
  {
    id: 'fyd-2026-w18-mocktail',
    slot: 'mocktail',
    tier: 'PRO',
    recipeId: 'aperitivo-spritz-variant',
    title: 'The Aperitivo With a Twist',
    eyebrow: 'Weekly Drop',
    reason: 'A low-ABV aperitivo riff that works for guests who want something in their hand without committing to a full drink.',
    profileTags: ['bitter', 'refreshing', 'low-abv', 'casual', 'hosting'],
    difficulty: 'easy',
    baseSpirit: 'aperol',
    source: 'catalog',
    availableFrom: '2026-04-26T00:00:00.000Z',
    availableUntil: '2026-05-02T23:59:59.000Z',
  },

  // ── Week 19 · May 3–9 ─────────────────────────────────────────────────────
  {
    id: 'fyd-2026-w19-cocktail',
    slot: 'cocktail',
    tier: 'PLUS',
    recipeId: 'mai-tai',
    title: 'The Original Tiki Temple',
    eyebrow: 'Weekly Cocktail Drop',
    reason: 'Master rum layering and float technique. The Mai Tai is tiki at its most purposeful.',
    profileTags: ['rum', 'tiki', 'fruity', 'adventurous', 'hosting'],
    difficulty: 'medium',
    baseSpirit: 'rum',
    source: 'catalog',
    availableFrom: '2026-05-03T00:00:00.000Z',
    availableUntil: '2026-05-09T23:59:59.000Z',
  },
  {
    id: 'fyd-2026-w19-mocktail',
    slot: 'mocktail',
    tier: 'PRO',
    recipeId: 'moscow-mule',
    title: 'The Crowd-Pleaser',
    eyebrow: 'Weekly Drop',
    reason: 'Vodka, ginger beer, lime. The most ordered casual drink for a reason — clean, cold, and crowd-friendly.',
    profileTags: ['citrus', 'ginger', 'vodka', 'refreshing', 'casual', 'beginner-friendly'],
    difficulty: 'easy',
    baseSpirit: 'vodka',
    source: 'catalog',
    availableFrom: '2026-05-03T00:00:00.000Z',
    availableUntil: '2026-05-09T23:59:59.000Z',
  },

  // ── Week 20 · May 10–16 ───────────────────────────────────────────────────
  {
    id: 'fyd-2026-w20-cocktail',
    slot: 'cocktail',
    tier: 'PLUS',
    recipeId: 'whiskey-sour',
    title: 'The Fundamentals of Balance',
    eyebrow: 'Weekly Cocktail Drop',
    reason: 'Spirit, citrus, sweetener. The Whiskey Sour is the clearest possible demonstration of how balance works.',
    profileTags: ['citrus', 'whiskey', 'sour', 'classic', 'beginner-friendly'],
    difficulty: 'easy',
    baseSpirit: 'whiskey',
    source: 'catalog',
    availableFrom: '2026-05-10T00:00:00.000Z',
    availableUntil: '2026-05-16T23:59:59.000Z',
  },
  {
    id: 'fyd-2026-w20-mocktail',
    slot: 'mocktail',
    tier: 'PRO',
    recipeId: 'jungle-bird',
    title: 'The Bitter Tiki',
    eyebrow: 'Weekly Drop',
    reason: 'Campari in a tiki drink sounds wrong — that\'s exactly why it works. The Jungle Bird rewards adventurous palates.',
    profileTags: ['tiki', 'bitter', 'rum', 'adventurous', 'exotic'],
    difficulty: 'medium',
    baseSpirit: 'rum',
    source: 'catalog',
    availableFrom: '2026-05-10T00:00:00.000Z',
    availableUntil: '2026-05-16T23:59:59.000Z',
  },
];

// ─── Accessors ────────────────────────────────────────────────────────────────

const TIER_LEVEL: Record<WeeklyDropTier, number> = { PLUS: 1, PRO: 2 };

function userMeetsTier(userTier: WeeklyDropTier, dropTier: WeeklyDropTier): boolean {
  return TIER_LEVEL[userTier] >= TIER_LEVEL[dropTier];
}

/** Returns drops that are currently active for the given user tier. */
export function getActiveWeeklyForYouDrops(
  date: Date = new Date(),
  userTier: WeeklyDropTier = 'PRO'
): WeeklyForYouDrop[] {
  const now = date.getTime();
  return WEEKLY_FOR_YOU_DROPS.filter((drop) => {
    if (!userMeetsTier(userTier, drop.tier)) return false;
    const start = new Date(drop.availableFrom).getTime();
    const end = new Date(drop.availableUntil).getTime();
    return now >= start && now <= end;
  });
}

/**
 * Returns drops currently active or starting within the next 7 days,
 * sorted by how well they match the user's profile tags.
 */
export function getWeeklyDropsForProfile(
  tags: string[],
  date: Date = new Date(),
  userTier: WeeklyDropTier = 'PRO'
): WeeklyForYouDrop[] {
  const now = date.getTime();
  const weekAhead = now + 7 * 24 * 60 * 60 * 1000;
  const normalizedTags = tags.map((t) => t.toLowerCase());

  const candidates = WEEKLY_FOR_YOU_DROPS.filter((drop) => {
    if (!userMeetsTier(userTier, drop.tier)) return false;
    const start = new Date(drop.availableFrom).getTime();
    const end = new Date(drop.availableUntil).getTime();
    return end >= now && start <= weekAhead;
  });

  return candidates.sort((a, b) => {
    const aScore = a.profileTags.filter((t) => normalizedTags.includes(t.toLowerCase())).length;
    const bScore = b.profileTags.filter((t) => normalizedTags.includes(t.toLowerCase())).length;
    return bScore - aScore;
  });
}
