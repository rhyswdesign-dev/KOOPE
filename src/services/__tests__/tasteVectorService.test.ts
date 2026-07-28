/**
 * tasteVectorService turns three event streams into the one profile every
 * recommendation surface reads. Its weighting, recency and confidence-blending
 * maths is the part most likely to be subtly wrong, and a subtle error here is
 * invisible: recommendations just quietly get worse, with no failure anywhere.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { computeTasteVector, recomputeAndPersistTasteVector } from '../tasteVectorService';

const rowsByTable: Record<string, any[]> = { made_events: [], scan_events: [] };
let signalRows: { recipeId: string; signal: string; createdAt: string }[] = [];

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: rowsByTable[table] ?? [], error: null }),
          }),
        }),
      }),
    }),
  },
}));

vi.mock('../../lib/logger', () => ({
  log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

vi.mock('../recipeSignalService', () => ({
  getRecentRecipeSignals: () => Promise.resolve(signalRows),
}));

const updateFieldsMock = vi.fn(() => Promise.resolve());
vi.mock('../userProfileService', () => ({
  loadUserProfile: () => Promise.resolve(null),
  updateUserProfileFields: (...args: any[]) => updateFieldsMock(...args),
}));

vi.mock('../../data/cocktails', () => ({
  ALL_COCKTAILS: [
    { id: 'smoky-drink', name: 'Smoky Drink', flavorProfiles: ['smoky'], baseSpirit: 'whiskey' },
    { id: 'citrus-drink', name: 'Citrus Drink', flavorProfiles: ['citrus'], baseSpirit: 'gin' },
  ],
}));

vi.mock('../../data/spiritsDatabase', () => ({
  SPIRITS_DATABASE: [
    { id: 'islay-malt', name: 'Islay Malt', type: 'whiskey', flavorProfile: ['Peat', 'Smoke'] },
  ],
}));

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

beforeEach(() => {
  rowsByTable.made_events = [];
  rowsByTable.scan_events = [];
  signalRows = [];
  updateFieldsMock.mockClear();
});

describe('computeTasteVector', () => {
  it('returns null when the user has no behaviour yet', async () => {
    // Must not overwrite a survey-seeded prior with an empty vector.
    expect(await computeTasteVector('user-1')).toBeNull();
  });

  it('learns the flavour of what the user actually makes', async () => {
    rowsByTable.made_events = [
      { recipe_id: 'smoky-drink', made_at: daysAgo(1), rating: null },
      { recipe_id: 'smoky-drink', made_at: daysAgo(2), rating: null },
    ];

    const graph = (await computeTasteVector('user-1'))!;
    expect(graph.rawProfile.flavorWeights.smoky).toBeGreaterThan(
      graph.rawProfile.flavorWeights.citrus,
    );
  });

  it('weighs a make far above a view', async () => {
    rowsByTable.made_events = [{ recipe_id: 'smoky-drink', made_at: daysAgo(1), rating: null }];
    signalRows = [{ recipeId: 'citrus-drink', signal: 'view', createdAt: daysAgo(1) }];

    const graph = (await computeTasteVector('user-1'))!;
    expect(graph.rawProfile.flavorWeights.smoky).toBeGreaterThan(
      graph.rawProfile.flavorWeights.citrus,
    );
  });

  it('treats a thumbs-down as real negative evidence', async () => {
    signalRows = [
      { recipeId: 'smoky-drink', signal: 'thumbs_down', createdAt: daysAgo(1) },
      { recipeId: 'citrus-drink', signal: 'thumbs_up', createdAt: daysAgo(1) },
    ];

    const graph = (await computeTasteVector('user-1'))!;
    expect(graph.rawProfile.flavorWeights.citrus).toBeGreaterThan(
      graph.rawProfile.flavorWeights.smoky,
    );
    // Negative must clamp at the floor, never go below zero — a negative weight
    // would corrupt the cosine similarity in tasteMatchService.
    expect(graph.rawProfile.flavorWeights.smoky).toBeGreaterThanOrEqual(0);
  });

  it('lets a low rating invert the sign of a make', async () => {
    // Making something and rating it 1 star is evidence against, not for.
    rowsByTable.made_events = [
      { recipe_id: 'smoky-drink', made_at: daysAgo(1), rating: 1 },
      { recipe_id: 'citrus-drink', made_at: daysAgo(1), rating: 5 },
    ];

    const graph = (await computeTasteVector('user-1'))!;
    expect(graph.rawProfile.flavorWeights.citrus).toBeGreaterThan(
      graph.rawProfile.flavorWeights.smoky,
    );
  });

  it('weighs recent behaviour above old behaviour', async () => {
    rowsByTable.made_events = [
      { recipe_id: 'smoky-drink', made_at: daysAgo(400), rating: null },
      { recipe_id: 'citrus-drink', made_at: daysAgo(1), rating: null },
    ];

    const graph = (await computeTasteVector('user-1'))!;
    expect(graph.rawProfile.flavorWeights.citrus).toBeGreaterThan(
      graph.rawProfile.flavorWeights.smoky,
    );
  });

  it('folds bottle scans in through the canonical taxonomy', async () => {
    // Islay Malt's raw words are ['Peat','Smoke'] — 18-tag peaty/smoky, which
    // must map down to the canonical 'smoky' axis.
    rowsByTable.scan_events = [
      { bottle_id: 'islay-malt', outcome: 'owned', created_at: daysAgo(1) },
    ];

    const graph = (await computeTasteVector('user-1'))!;
    expect(graph.rawProfile.flavorWeights.smoky).toBeGreaterThan(0);
    expect(graph.rawProfile.spiritWeights.whiskey).toBeGreaterThan(0);
  });

  it('populates the timestamps and counts that make decay and confidence work', async () => {
    // This is the payload the whole persistence fix exists to produce.
    rowsByTable.made_events = [{ recipe_id: 'smoky-drink', made_at: daysAgo(3), rating: 5 }];

    const graph = (await computeTasteVector('user-1'))!;
    expect(graph.interactionCounts.total).toBeGreaterThan(0);
    expect(graph.interactionCounts.flavors.smoky).toBeGreaterThan(0);
    expect(graph.timestamps.flavors.smoky).toBeTruthy();
  });

  it('ignores events whose recipe is not in the catalog', async () => {
    rowsByTable.made_events = [{ recipe_id: 'does-not-exist', made_at: daysAgo(1), rating: null }];
    expect(await computeTasteVector('user-1')).toBeNull();
  });

  it('lets the stated prior dominate while evidence is thin', async () => {
    // One view is not enough to overturn what the user told us in onboarding.
    signalRows = [{ recipeId: 'smoky-drink', signal: 'view', createdAt: daysAgo(1) }];

    const prior: any = {
      flavorWeights: { citrus: 1, herbal: 0, bitter: 0, sweet: 0, smoky: 0, floral: 0, spiced: 0 },
      spiritWeights: {
        gin: 1,
        tequila: 0,
        whiskey: 0,
        rum: 0,
        vodka: 0,
        brandy: 0,
        liqueurs: 0,
        'gin-alternative': 0,
        'rum-alternative': 0,
        none: 0,
      },
      preferredABV: { min: 0, max: 40 },
      preferredComplexity: 0.5,
    };

    const graph = (await computeTasteVector('user-1', prior))!;
    expect(graph.rawProfile.flavorWeights.citrus).toBeGreaterThan(0.8);
  });

  it('lets behaviour overtake the prior once evidence accumulates', async () => {
    // 25 smoky makes should beat "I like citrus" said once at signup.
    rowsByTable.made_events = Array.from({ length: 25 }, (_, i) => ({
      recipe_id: 'smoky-drink',
      made_at: daysAgo(i + 1),
      rating: 5,
    }));

    const prior: any = {
      flavorWeights: { citrus: 1, herbal: 0, bitter: 0, sweet: 0, smoky: 0, floral: 0, spiced: 0 },
      spiritWeights: {
        gin: 1,
        tequila: 0,
        whiskey: 0,
        rum: 0,
        vodka: 0,
        brandy: 0,
        liqueurs: 0,
        'gin-alternative': 0,
        'rum-alternative': 0,
        none: 0,
      },
      preferredABV: { min: 0, max: 40 },
      preferredComplexity: 0.5,
    };

    const graph = (await computeTasteVector('user-1', prior))!;
    expect(graph.rawProfile.flavorWeights.smoky).toBeGreaterThan(
      graph.rawProfile.flavorWeights.citrus,
    );
  });

  it('carries the prior ABV and complexity through untouched', async () => {
    rowsByTable.made_events = [{ recipe_id: 'smoky-drink', made_at: daysAgo(1), rating: null }];
    const prior: any = {
      flavorWeights: {},
      spiritWeights: {},
      preferredABV: { min: 0, max: 0.5 },
      preferredComplexity: 0.9,
    };

    const graph = (await computeTasteVector('user-1', prior))!;
    // A zero-proof user must not be silently converted to full-strength.
    expect(graph.rawProfile.preferredABV).toEqual({ min: 0, max: 0.5 });
    expect(graph.rawProfile.preferredComplexity).toBe(0.9);
  });
});

describe('recomputeAndPersistTasteVector', () => {
  it('persists a profile carrying the graph metadata', async () => {
    rowsByTable.made_events = [{ recipe_id: 'smoky-drink', made_at: daysAgo(1), rating: 5 }];

    await recomputeAndPersistTasteVector('user-1');

    expect(updateFieldsMock).toHaveBeenCalledTimes(1);
    const written = (updateFieldsMock.mock.calls[0] as any[])[1].tasteProfile;
    expect(written.flavorWeights).toBeTruthy();
    expect(written.graphTimestamps).toBeTruthy();
    expect(written.graphInteractionCounts.total).toBeGreaterThan(0);
  });

  it('writes nothing when there is no behaviour to learn from', async () => {
    await recomputeAndPersistTasteVector('user-1');
    expect(updateFieldsMock).not.toHaveBeenCalled();
  });

  it('does not throw when the write fails', async () => {
    rowsByTable.made_events = [{ recipe_id: 'smoky-drink', made_at: daysAgo(1), rating: 5 }];
    updateFieldsMock.mockRejectedValueOnce(new Error('network'));

    await expect(recomputeAndPersistTasteVector('user-1')).resolves.toBeUndefined();
  });
});
