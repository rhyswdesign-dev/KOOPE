/**
 * Money/North-Star-path coverage (Phase 0.9 + 0.8): makeLogService is the
 * one write path every "I made this" tap across the app funnels through
 * (recipe detail, Tonight's Pick, Hosting, What Can I Make). Weekly Makers,
 * the repeat-make taste signal, and the Phase 0.6 weekly streak all read
 * from what this file writes — a silent failure here is invisible
 * everywhere downstream, not just in one screen.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  logMadeIt,
  getTimesMade,
  hasMadeSomethingThisWeek,
  getMadeHistory,
} from '../makeLogService';

const insertMock = vi.fn();
const selectHeadCountMock = vi.fn();

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: insertMock,
      select: vi.fn(() => selectHeadCountMock()),
    })),
  },
}));

vi.mock('../../lib/logger', () => ({
  log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const trackEventMock = vi.fn();
vi.mock('../../lib/analytics', () => ({
  trackEvent: (...args: any[]) => trackEventMock(...args),
}));

const recordThumbsUpMock = vi.fn();
vi.mock('../../store/useTasteModel', () => ({
  useTasteModel: {
    getState: () => ({ recordThumbsUp: recordThumbsUpMock }),
  },
}));

// cocktails.ts has module-scope `require('*.png')` calls for real assets —
// fine under Metro, a syntax error under Vitest's Node-based runner (no
// asset loader for binary files). Stub with a fixture matching the shape
// getMadeHistory's local-catalog fallback reads (id/name/image).
vi.mock('../../data/cocktails', () => ({
  ALL_COCKTAILS: [
    { id: 'negroni', name: 'Negroni', image: 'https://example.com/negroni.jpg' },
    { id: 'local-only-recipe', name: 'Local Only Recipe', image: 'https://example.com/local.jpg' },
  ],
}));

// Chainable query-builder stub: every filter method returns `this`, and the
// object is directly awaitable (mirrors Supabase's thenable PostgrestFilterBuilder).
function chainableResult(result: Record<string, unknown>) {
  const builder: any = {
    eq: () => builder,
    gte: () => builder,
    order: () => builder,
    limit: () => builder,
    then: (resolve: (value: typeof result) => void) => resolve(result),
  };
  return builder;
}

const getRecipeByIdMock = vi.fn();
vi.mock('../../repos/supabase', () => ({
  RecipesRepository: {
    getRecipeById: (...args: any[]) => getRecipeByIdMock(...args),
  },
}));

describe('makeLogService.logMadeIt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertMock.mockResolvedValue({ error: null });
    selectHeadCountMock.mockReturnValue(chainableResult({ count: 1, error: null }));
  });

  it('writes to made_events with the given source and returns success + timesMade', async () => {
    const result = await logMadeIt({
      userId: 'user-1',
      recipeId: 'recipe-1',
      source: 'recipe_detail',
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        recipe_id: 'recipe-1',
        source: 'recipe_detail',
        substitutions_used: null,
        rating: null,
      }),
    );
    expect(result.success).toBe(true);
    expect(result.timesMade).toBe(1);
  });

  it('fires the made_it analytics event distinct from RECIPE_MADE', async () => {
    await logMadeIt({
      userId: 'user-1',
      recipeId: 'recipe-1',
      recipeName: 'Negroni',
      source: 'hosting',
    });

    expect(trackEventMock).toHaveBeenCalledWith(
      'made_it',
      expect.objectContaining({ recipe_id: 'recipe-1', recipe_name: 'Negroni', source: 'hosting' }),
    );
  });

  it('reinforces the taste model when flavor profiles are provided (repeat-make signal)', async () => {
    await logMadeIt({
      userId: 'user-1',
      recipeId: 'recipe-1',
      source: 'whatcanimake',
      flavorProfiles: ['bitter', 'herbal'],
    });

    expect(recordThumbsUpMock).toHaveBeenCalledWith({ flavorProfile: ['bitter', 'herbal'] });
  });

  it('does not touch the taste model when no flavor profiles are given', async () => {
    await logMadeIt({ userId: 'user-1', recipeId: 'recipe-1', source: 'tonights_pick' });

    expect(recordThumbsUpMock).not.toHaveBeenCalled();
  });

  it('degrades gracefully (never throws) when the made_events insert fails — e.g. migration 030 not applied yet', async () => {
    insertMock.mockResolvedValueOnce({
      error: { message: 'relation "made_events" does not exist' },
    });

    await expect(
      logMadeIt({ userId: 'user-1', recipeId: 'recipe-1', source: 'recipe_detail' }),
    ).resolves.toMatchObject({ success: true });
  });

  it('degrades gracefully when the insert call itself throws (network failure)', async () => {
    insertMock.mockRejectedValueOnce(new Error('network down'));

    await expect(
      logMadeIt({ userId: 'user-1', recipeId: 'recipe-1', source: 'recipe_detail' }),
    ).resolves.toMatchObject({ success: true });
  });

  it('passes substitutions_used through and marks has_substitutions in analytics', async () => {
    await logMadeIt({
      userId: 'user-1',
      recipeId: 'recipe-1',
      source: 'recipe_detail',
      substitutionsUsed: { gin: 'vodka' },
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ substitutions_used: { gin: 'vodka' } }),
    );
    expect(trackEventMock).toHaveBeenCalledWith(
      'made_it',
      expect.objectContaining({ has_substitutions: true }),
    );
  });
});

describe('makeLogService.getTimesMade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the count from made_events for this user + recipe', async () => {
    selectHeadCountMock.mockReturnValue(chainableResult({ count: 3, error: null }));
    await expect(getTimesMade('user-1', 'recipe-1')).resolves.toBe(3);
  });

  it('returns 0 (not a throw) when the query errors — e.g. table missing pre-030', async () => {
    selectHeadCountMock.mockReturnValue(
      chainableResult({ count: null, error: { message: 'boom' } }),
    );
    await expect(getTimesMade('user-1', 'recipe-1')).resolves.toBe(0);
  });
});

describe('makeLogService.getMadeHistory — Drinks tab Made-It History (1.4d)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns resolved entries in made_at-desc order with recipe name/image filled in', async () => {
    selectHeadCountMock.mockReturnValue(
      chainableResult({
        data: [
          {
            id: 'ev-2',
            recipe_id: 'negroni',
            made_at: '2026-07-20T00:00:00Z',
            source: 'recipe_detail',
            rating: 5,
          },
          {
            id: 'ev-1',
            recipe_id: 'daiquiri',
            made_at: '2026-07-19T00:00:00Z',
            source: 'tonights_pick',
            rating: null,
          },
        ],
        error: null,
      }),
    );
    getRecipeByIdMock.mockImplementation(async (id: string) =>
      id === 'negroni'
        ? { name: 'Negroni', image: 'negroni.png' }
        : { title: 'Daiquiri', imageUrl: 'daiquiri.png' },
    );

    const result = await getMadeHistory('user-1', 20);

    expect(result).toEqual([
      {
        id: 'ev-2',
        recipeId: 'negroni',
        recipeName: 'Negroni',
        recipeImage: 'negroni.png',
        madeAt: '2026-07-20T00:00:00Z',
        source: 'recipe_detail',
        rating: 5,
      },
      {
        id: 'ev-1',
        recipeId: 'daiquiri',
        recipeName: 'Daiquiri',
        recipeImage: 'daiquiri.png',
        madeAt: '2026-07-19T00:00:00Z',
        source: 'tonights_pick',
        rating: null,
      },
    ]);
  });

  it('dedupes repo lookups: calls getRecipeById once per distinct recipe_id, not once per row', async () => {
    selectHeadCountMock.mockReturnValue(
      chainableResult({
        data: [
          {
            id: 'ev-3',
            recipe_id: 'negroni',
            made_at: '2026-07-20T00:00:00Z',
            source: 'recipe_detail',
            rating: null,
          },
          {
            id: 'ev-2',
            recipe_id: 'negroni',
            made_at: '2026-07-19T00:00:00Z',
            source: 'recipe_detail',
            rating: null,
          },
          {
            id: 'ev-1',
            recipe_id: 'negroni',
            made_at: '2026-07-18T00:00:00Z',
            source: 'recipe_detail',
            rating: null,
          },
        ],
        error: null,
      }),
    );
    getRecipeByIdMock.mockResolvedValue({ name: 'Negroni', image: 'negroni.png' });

    const result = await getMadeHistory('user-1', 20);

    expect(getRecipeByIdMock).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.recipeName === 'Negroni')).toBe(true);
  });

  it('falls back to a generic label and keeps the row when a recipe lookup fails or returns null', async () => {
    selectHeadCountMock.mockReturnValue(
      chainableResult({
        data: [
          {
            id: 'ev-2',
            recipe_id: 'deleted-recipe',
            made_at: '2026-07-20T00:00:00Z',
            source: 'hosting',
            rating: null,
          },
          {
            id: 'ev-1',
            recipe_id: 'rejects',
            made_at: '2026-07-19T00:00:00Z',
            source: 'hosting',
            rating: null,
          },
        ],
        error: null,
      }),
    );
    getRecipeByIdMock.mockImplementation(async (id: string) => {
      if (id === 'rejects') throw new Error('network down');
      return null;
    });

    const result = await getMadeHistory('user-1', 20);

    expect(result).toHaveLength(2);
    expect(result.every((r) => r.recipeName === 'Recipe')).toBe(true);
  });

  it('resolves to an empty array (never throws) when the made_events query errors', async () => {
    selectHeadCountMock.mockReturnValue(
      chainableResult({ data: null, error: { message: 'boom' } }),
    );

    await expect(getMadeHistory('user-1', 20)).resolves.toEqual([]);
    expect(getRecipeByIdMock).not.toHaveBeenCalled();
  });
});

describe('makeLogService.hasMadeSomethingThisWeek — the Phase 0.6 weekly streak source of truth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when count > 0', async () => {
    selectHeadCountMock.mockReturnValue(chainableResult({ count: 2, error: null }));
    await expect(hasMadeSomethingThisWeek('user-1')).resolves.toBe(true);
  });

  it('returns false when count is 0', async () => {
    selectHeadCountMock.mockReturnValue(chainableResult({ count: 0, error: null }));
    await expect(hasMadeSomethingThisWeek('user-1')).resolves.toBe(false);
  });

  it('returns false (not a throw) on error', async () => {
    selectHeadCountMock.mockReturnValue(
      chainableResult({ count: null, error: { message: 'boom' } }),
    );
    await expect(hasMadeSomethingThisWeek('user-1')).resolves.toBe(false);
  });
});
