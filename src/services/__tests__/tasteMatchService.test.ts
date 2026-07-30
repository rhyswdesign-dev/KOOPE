/**
 * Regression coverage for a severe, silent bug: the local bundled cocktail
 * catalog (data/cocktails.ts, ~94 entries) uses a different shape than
 * Supabase-sourced recipes — `base` instead of `baseSpirit`, no
 * `complexity`/`abv` fields at all (only a `difficulty` label). Reading the
 * missing fields directly poisoned the whole score to NaN
 * (Math.abs(undefined - x) = NaN, and NaN propagates through every + after
 * it) — which made `.sort((a,b) => b.score - a.score)` a no-op. Every local
 * cocktail scored NaN, so recommendations came back in their original array
 * order, not ranked by taste at all. Caught via a live screenshot: a
 * PLUS profile stated as leaning Tequila + Whiskey had a gin Martini as its
 * #1 "For You" pick, because the Martini happened to sit near the front of
 * the static array and nothing was actually sorting it there.
 */
import { describe, it, expect } from 'vitest';
import { calculateTasteMatchPercent } from '../tasteMatchService';
import type { TasteProfile } from '../../types/userProfile';

const tequilaWhiskeyProfile: TasteProfile = {
  flavorWeights: {
    citrus: 0.5,
    herbal: 0.2,
    bitter: 0.2,
    sweet: 0.2,
    smoky: 0.2,
    floral: 0.1,
    spiced: 0.2,
  },
  spiritWeights: {
    tequila: 0.9,
    whiskey: 0.9,
    gin: 0.05,
    rum: 0.1,
    vodka: 0.1,
    brandy: 0.1,
    liqueurs: 0.1,
    'gin-alternative': 0,
    'rum-alternative': 0,
    none: 0,
  },
  preferredComplexity: 0.5,
  preferredABV: { min: 15, max: 100 },
};

// Shape exactly matching data/cocktails.ts entries: `base` not `baseSpirit`,
// no `complexity`/`abv`, only `difficulty`.
const localShapeMartini = {
  id: 'stirred-house-martini',
  name: 'Stirred House Martini',
  base: 'gin',
  difficulty: 'Medium',
  ingredients: [{ name: 'London Dry gin' }, { name: 'Dry vermouth' }, { name: 'Orange bitters' }],
} as any;

// Shape matching a Supabase-sourced recipe: correct field names throughout.
const supabaseShapeRecipe = {
  id: 'test-tequila-drink',
  baseSpirit: 'tequila',
  complexity: 0.5,
  abv: 20,
  ingredients: [{ name: 'Tequila' }, { name: 'Lime' }],
} as any;

describe('calculateTasteMatchPercent — field-shape regression', () => {
  it('never returns NaN for the local-catalog shape (base/difficulty, no complexity/abv)', () => {
    const score = calculateTasteMatchPercent(tequilaWhiskeyProfile, localShapeMartini);
    expect(Number.isNaN(score)).toBe(false);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('still scores correctly for the Supabase shape (baseSpirit/complexity/abv present)', () => {
    const score = calculateTasteMatchPercent(tequilaWhiskeyProfile, supabaseShapeRecipe);
    expect(Number.isNaN(score)).toBe(false);
  });

  it('penalizes a gin drink against a tequila/whiskey profile via the base fallback', () => {
    const ginScore = calculateTasteMatchPercent(tequilaWhiskeyProfile, localShapeMartini);

    const localShapeTequilaDrink = {
      ...localShapeMartini,
      id: 'local-tequila-drink',
      base: 'tequila',
      ingredients: [{ name: 'Tequila' }, { name: 'Lime' }, { name: 'Triple sec' }],
    };
    const tequilaScore = calculateTasteMatchPercent(tequilaWhiskeyProfile, localShapeTequilaDrink);

    // This is the exact regression: before the fix, both scored NaN and
    // neither number meant anything. Now the spirit mismatch must show up.
    expect(tequilaScore).toBeGreaterThan(ginScore);
  });

  it('derives complexity from the difficulty label when complexity is absent', () => {
    const easyDrink = { ...localShapeMartini, id: 'easy', difficulty: 'Easy' };
    const hardDrink = { ...localShapeMartini, id: 'hard', difficulty: 'Hard' };

    const simpleProfile: TasteProfile = { ...tequilaWhiskeyProfile, preferredComplexity: 0.2 };

    const easyScore = calculateTasteMatchPercent(simpleProfile, easyDrink);
    const hardScore = calculateTasteMatchPercent(simpleProfile, hardDrink);

    expect(easyScore).toBeGreaterThan(hardScore);
  });

  it('treats a missing abv as 0 rather than NaN, without crashing', () => {
    const score = calculateTasteMatchPercent(
      { ...tequilaWhiskeyProfile, preferredABV: { min: 15, max: 40 } },
      localShapeMartini,
    );
    expect(Number.isNaN(score)).toBe(false);
  });
});
