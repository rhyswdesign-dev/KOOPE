import { describe, it, expect } from 'vitest';
import { computeGiftVerdict, filterRecipesForGift } from '../giftVerdictService';

describe('computeGiftVerdict', () => {
  const midRange = { min: 40, max: 55 };

  it('gives the strongest framing when both spirit and flavor match', () => {
    const verdict = computeGiftVerdict({
      spiritToken: 'gin',
      flavorWords: ['Juniper', 'Citrus', 'Botanical'],
      priceRange: midRange,
      preference: { spiritHint: 'gin', flavorHint: 'citrus' },
    });
    expect(verdict.headline).toBe('A great pick — right in their lane.');
  });

  it('gives a positive-but-softer framing when only one hint matches', () => {
    const verdict = computeGiftVerdict({
      spiritToken: 'gin',
      flavorWords: ['Juniper', 'Citrus', 'Botanical'],
      priceRange: midRange,
      preference: { spiritHint: 'gin', flavorHint: 'smoky' },
    });
    expect(verdict.headline).toBe('Good instincts — this lines up with what they like.');
  });

  it('is still positive, not a hedge, when neither hint matches', () => {
    const verdict = computeGiftVerdict({
      spiritToken: 'whiskey',
      flavorWords: ['Caramel', 'Vanilla', 'Oak'],
      priceRange: midRange,
      preference: { spiritHint: 'gin', flavorHint: 'citrus' },
    });
    expect(verdict.headline).toBe("A safe bet, even if it's not their usual.");
    expect(verdict.body).toContain('good gift');
  });

  it('gives generic-positive framing when the questionnaire was skipped', () => {
    const verdict = computeGiftVerdict({
      spiritToken: 'whiskey',
      flavorWords: ['Caramel', 'Vanilla', 'Oak'],
      priceRange: midRange,
      preference: {},
    });
    expect(verdict.headline).toBe('A solid gift bottle.');
  });

  it('frames a low-priced bottle as a low-key gift', () => {
    const verdict = computeGiftVerdict({
      spiritToken: 'vodka',
      flavorWords: ['Clean', 'Smooth'],
      priceRange: { min: 15, max: 25 },
      preference: {},
    });
    expect(verdict.body).toContain('low-key gift');
  });

  it('frames a high-priced bottle as a splurge', () => {
    const verdict = computeGiftVerdict({
      spiritToken: 'whiskey',
      flavorWords: ['Caramel', 'Vanilla', 'Oak'],
      priceRange: { min: 90, max: 120 },
      preference: {},
    });
    expect(verdict.body).toContain('splurge');
  });

  it('falls back to dependable framing with no price range', () => {
    const verdict = computeGiftVerdict({
      spiritToken: 'whiskey',
      flavorWords: [],
      priceRange: null,
      preference: {},
    });
    expect(verdict.body).toBe('A dependable choice for most tastes.');
  });
});

describe('filterRecipesForGift', () => {
  const recipes = [
    { id: 'a', flavorProfiles: ['citrus', 'herbal'] as const },
    { id: 'b', flavorProfiles: ['sweet'] as const },
    { id: 'c', flavorProfiles: ['smoky', 'bitter'] as const },
  ];

  it('filters to recipes matching the flavor hint', () => {
    const result = filterRecipesForGift(recipes, { flavorHint: 'citrus' });
    expect(result.map((r) => r.id)).toEqual(['a']);
  });

  it('returns the full list unfiltered when there is no flavor hint', () => {
    const result = filterRecipesForGift(recipes, {});
    expect(result).toHaveLength(3);
  });

  it('falls back to the full list when nothing matches', () => {
    const result = filterRecipesForGift(recipes, { flavorHint: 'floral' });
    expect(result).toHaveLength(3);
  });
});
