/**
 * Pure spirit-classification helpers for BottleDetailScreen — spirit
 * category fallback data (tasting notes/flavor profile when the DB has
 * none), spirit-name normalization, and the "Respect This Bottle" recipe
 * scoring heuristic. No React, no hooks; extracted verbatim from
 * BottleDetailScreen.tsx (Phase 5, god-file breakup).
 */
import { BottleServeService } from '../services/bottleServeService';

const SPIRIT_ALIAS_MAP: Record<string, string> = {
  whisky: 'whiskey',
  bourbon: 'whiskey',
  scotch: 'whiskey',
  rye: 'whiskey',
  cognac: 'brandy',
};

// ─── Spirit-category fallbacks ────────────────────────────────────────────────
// Used when a specific bottle lacks flavor profile or tasting notes data.
// Ensures every scan returns useful, contextually accurate information.

interface SpiritCategoryDefaults {
  flavorProfile: string[];
  tastingNotes: string;
  origin: string;
}

const SPIRIT_CATEGORY_DEFAULTS: Record<string, SpiritCategoryDefaults> = {
  gin: {
    flavorProfile: ['Juniper', 'Citrus', 'Botanical'],
    tastingNotes:
      'A London Dry-style gin with classic juniper at the fore, bright citrus notes, and a layered botanical finish. Crisp and dry.',
    origin: 'United Kingdom',
  },
  vodka: {
    flavorProfile: ['Clean', 'Smooth', 'Neutral'],
    tastingNotes:
      'A clean, neutral spirit with a smooth palate and a crisp finish. Subtle grain sweetness makes it exceptionally versatile.',
    origin: 'Europe',
  },
  whiskey: {
    flavorProfile: ['Caramel', 'Vanilla', 'Oak'],
    tastingNotes:
      'Rich caramel and vanilla upfront, underpinned by toasted oak and a hint of dried fruit. Warm, rounded finish.',
    origin: 'United States',
  },
  rum: {
    flavorProfile: ['Vanilla', 'Tropical Fruit', 'Caramel'],
    tastingNotes:
      'Sweet vanilla and tropical fruit on the nose, with warm caramel and a touch of molasses on the palate. Smooth finish.',
    origin: 'Caribbean',
  },
  tequila: {
    flavorProfile: ['Agave', 'Citrus', 'Pepper'],
    tastingNotes:
      '100% agave character — fresh vegetal notes, bright citrus, and white pepper. Clean, smooth, and true to the plant.',
    origin: 'Mexico',
  },
  mezcal: {
    flavorProfile: ['Smoke', 'Agave', 'Earthy'],
    tastingNotes:
      'Artisanal smoke from slow-roasted agave hearts, with earthy mineral notes and a long, complex finish.',
    origin: 'Mexico',
  },
  brandy: {
    flavorProfile: ['Dried Fruit', 'Oak', 'Vanilla'],
    tastingNotes:
      'Warm dried fruit and toasted oak with vanilla undertones. Smooth and balanced with a gentle warming finish.',
    origin: 'France',
  },
  liqueur: {
    flavorProfile: ['Sweet', 'Fruit', 'Herbal'],
    tastingNotes:
      'A sweet, approachable liqueur with fruit and herbal character. Versatile as a modifier in cocktails or over ice.',
    origin: 'Europe',
  },
  other: {
    flavorProfile: ['Complex', 'Aromatic', 'Distinct'],
    tastingNotes:
      'A distinctive spirit with its own character. Explore neat first to understand its personality before building cocktails.',
    origin: 'International',
  },
};

export function getSpiritCategoryDefaults(bottle: any): SpiritCategoryDefaults {
  const type = normalizeSpiritToken((bottle as any).type || (bottle as any).category);
  return SPIRIT_CATEGORY_DEFAULTS[type] ?? SPIRIT_CATEGORY_DEFAULTS.other;
}

export function normalizeSpiritToken(value: string | undefined | null): string {
  const token = (value || '').toLowerCase().trim();
  if (!token) return '';
  return SPIRIT_ALIAS_MAP[token] || token;
}

export function getRespectThisBottleScore(
  recipe: any,
  spiritName: string,
  bottle: any,
  serveRecommendation: ReturnType<typeof BottleServeService.getRecommendation>,
): number {
  const tags = Array.isArray(recipe.tags)
    ? recipe.tags.map((tag: string) => String(tag).toLowerCase())
    : [];
  const category = String(recipe.category || '').toLowerCase();
  const name = String(recipe.name || '').toLowerCase();
  const description = String(recipe.description || '').toLowerCase();
  const difficulty = String(recipe.difficulty || '').toLowerCase();
  const ingredientsCount = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.length
    : typeof recipe.ingredients === 'string'
      ? recipe.ingredients.split(/[,|]/).filter(Boolean).length
      : 0;

  let score = 0;

  if (tags.includes('classic')) score += 10;
  if (tags.includes('stirred')) score += 12;
  if (tags.includes('spirit-forward')) score += 18;
  if (tags.includes('smoky') && serveRecommendation.spiritFamily === 'scotch') score += 10;
  if (tags.includes('agave') && serveRecommendation.spiritFamily === 'tequila') score += 10;
  if (['old fashioned', 'manhattan', 'sazerac'].some((needle) => name.includes(needle)))
    score += 18;
  if (
    ['boozy', 'spirit-forward', 'minimal dilution'].some((needle) => description.includes(needle))
  )
    score += 10;
  if (category.includes('old fashioned') || category.includes('martini')) score += 8;
  if (difficulty === 'easy') score += 4;
  if (ingredientsCount > 0 && ingredientsCount <= 4) score += 10;
  if (ingredientsCount >= 7) score -= 15;
  if (tags.includes('tiki')) score -= 25;
  if (tags.includes('tropical')) score -= 20;
  if (tags.includes('creamy')) score -= 18;
  if (tags.includes('frozen')) score -= 25;
  if (tags.includes('brunch')) score -= 10;
  if (tags.includes('dessert')) score -= 12;
  if (tags.includes('equal-parts')) score -= 8;
  if (tags.includes('sour')) score -= 6;
  if (tags.includes('highball')) score -= 4;

  if (spiritName === 'whiskey' && tags.includes('whiskey')) score += 6;
  if (spiritName === 'tequila' && tags.includes('tequila')) score += 6;
  if (spiritName === 'mezcal' && tags.includes('mezcal')) score += 8;
  if (spiritName === 'brandy' && (tags.includes('cognac') || tags.includes('brandy'))) score += 8;
  if (
    String(bottle.name || '')
      .toLowerCase()
      .includes('scotch') &&
    tags.includes('scotch')
  )
    score += 10;

  return score;
}

export function normalizeInventoryName(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}
