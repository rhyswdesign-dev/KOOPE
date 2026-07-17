/**
 * Money/North-Star-path coverage (Phase 0.9 + 0.8): makeLogService is the
 * one write path every "I made this" tap across the app funnels through
 * (recipe detail, Tonight's Pick, Hosting, What Can I Make). Weekly Makers,
 * the repeat-make taste signal, and the Phase 0.6 weekly streak all read
 * from what this file writes — a silent failure here is invisible
 * everywhere downstream, not just in one screen.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logMadeIt, getTimesMade, hasMadeSomethingThisWeek } from '../makeLogService';

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

// Chainable query-builder stub: every filter method returns `this`, and the
// object is directly awaitable (mirrors Supabase's thenable PostgrestFilterBuilder).
function chainableResult(result: { count: number | null; error: unknown }) {
  const builder: any = {
    eq: () => builder,
    gte: () => builder,
    then: (resolve: (value: typeof result) => void) => resolve(result),
  };
  return builder;
}

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
