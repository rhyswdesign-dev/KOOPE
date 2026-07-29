import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTonightsPick } from '../tonightsPickService';

const getUserInventoryMock = vi.fn();
vi.mock('../inventoryService', () => ({
  InventoryService: {
    getUserInventory: (...args: any[]) => getUserInventoryMock(...args),
  },
}));

vi.mock('../../types/database', () => ({
  // Mirrors the real toBottle: base fields from `item`, then `extra`
  // spread on top (so callers can override, e.g. `name`) — matches
  // src/types/database.ts's actual spread order.
  toBottle: (item: any, extra?: any) => ({
    id: item.id,
    category: item.category,
    name: item.item_name,
    ...extra,
  }),
}));

const loadUserProfileMock = vi.fn();
vi.mock('../userProfileService', () => ({
  loadUserProfile: (...args: any[]) => loadUserProfileMock(...args),
}));

vi.mock('../tasteGraphService', () => ({
  hydrateTasteGraph: vi.fn(() => ({})),
}));

const getPredictiveRecommendationsMock = vi.fn();
vi.mock('../predictiveEngine', () => ({
  getPredictiveRecommendations: (...args: any[]) => getPredictiveRecommendationsMock(...args),
  detectTimeOfDay: () => 'evening',
  detectSeason: () => 'summer',
}));

vi.mock('../enhancedProfileFallback', () => ({
  buildEnhancedProfileFallback: vi.fn(() => ({ tasteProfile: null })),
}));

const getAllRecipesMock = vi.fn();
vi.mock('../../repos/supabase', () => ({
  RecipesRepository: {
    getAllRecipes: (...args: any[]) => getAllRecipesMock(...args),
  },
}));

vi.mock('../../lib/logger', () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe('tonightsPickService.getTonightsPick', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllRecipesMock.mockResolvedValue([]);
  });

  it('returns empty state without calling inventory when userId is missing', async () => {
    const result = await getTonightsPick({
      userId: undefined,
      profile: {},
      savedItems: {},
      allCocktails: [],
    });

    expect(result).toEqual({ hasInventory: false, recommendations: [] });
    expect(getUserInventoryMock).not.toHaveBeenCalled();
  });

  it('returns empty state and skips predictiveEngine when inventory is empty', async () => {
    getUserInventoryMock.mockResolvedValue([]);

    const result = await getTonightsPick({
      userId: 'user-1',
      profile: {},
      savedItems: {},
      allCocktails: [],
    });

    expect(result).toEqual({ hasInventory: false, recommendations: [] });
    expect(getUserInventoryMock).toHaveBeenCalledWith('user-1');
    expect(getPredictiveRecommendationsMock).not.toHaveBeenCalled();
  });

  it('filters to inventoryMatch signals, dedupes, and caps at limit', async () => {
    getUserInventoryMock.mockResolvedValue([{ id: 'bottle-1', category: 'gin' }]);
    loadUserProfileMock.mockResolvedValue(null);
    getPredictiveRecommendationsMock.mockReturnValue([
      { id: 'a', signals: [{ source: 'inventoryMatch' }] },
      { id: 'b', signals: [{ source: 'recentScans' }] },
      { id: 'a', signals: [{ source: 'inventoryMatch' }] }, // duplicate id
      { id: 'c', signals: [{ source: 'inventoryMatch' }] },
      { id: 'd', signals: [{ source: 'inventoryMatch' }] },
    ]);

    const result = await getTonightsPick({
      userId: 'user-1',
      profile: {},
      savedItems: {},
      allCocktails: [],
      limit: 2,
    });

    expect(result.hasInventory).toBe(true);
    expect(result.recommendations.map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('requests scores for the entire candidate pool, not a small top-N, so inventory matches are never cut before filtering', async () => {
    getUserInventoryMock.mockResolvedValue([{ id: 'bottle-1', category: 'gin' }]);
    loadUserProfileMock.mockResolvedValue(null);
    getPredictiveRecommendationsMock.mockReturnValue([]);
    const allCocktails = Array.from({ length: 250 }, (_, i) => ({ id: `cocktail-${i}` }));

    await getTonightsPick({
      userId: 'user-1',
      profile: {},
      savedItems: {},
      allCocktails: allCocktails as any,
    });

    // Regression guard: a small fixed limit (e.g. 18) here caps
    // getPredictiveRecommendations to the top N by *overall* score before
    // inventoryMatch is ever checked. Since inventoryMatch is a small
    // fraction of the total score, a makeable cocktail can rank outside a
    // small top-N and get silently dropped — which is exactly what made
    // the "Tonight's Pick" rail intermittently disappear. The limit passed
    // through must cover the whole pool.
    const limitArg = getPredictiveRecommendationsMock.mock.calls[0][4];
    expect(limitArg).toBeGreaterThanOrEqual(allCocktails.length);
  });

  it('prefers full-ingredient recipe data over the lite pool passed in (regression: real cocktails have ingredients: [] in the lite Browse pool, so they could never earn an inventoryMatch signal — only mocktails could)', async () => {
    getUserInventoryMock.mockResolvedValue([{ id: 'bottle-1', category: 'gin' }]);
    loadUserProfileMock.mockResolvedValue(null);
    getAllRecipesMock.mockResolvedValueOnce([
      {
        id: 'negroni',
        title: 'Negroni',
        ingredients: [{ name: 'Gin' }, { name: 'Campari' }, { name: 'Vermouth' }],
      },
    ]);
    getPredictiveRecommendationsMock.mockReturnValue([]);

    await getTonightsPick({
      userId: 'user-1',
      profile: {},
      savedItems: {},
      allCocktails: [
        { id: 'negroni', title: 'Negroni', ingredients: [] }, // lite version, as RecipesScreen's ALL_COCKTAILS provides it
        { id: 'virgin-mojito', title: 'Virgin Mojito', ingredients: [{ name: 'Mint' }] }, // local mocktail, already full
      ] as any,
    });

    const scoringPool = getPredictiveRecommendationsMock.mock.calls[0][0];
    const negroni = scoringPool.find((r: any) => r.id === 'negroni');
    const mojito = scoringPool.find((r: any) => r.id === 'virgin-mojito');
    expect(negroni.ingredients).toEqual([
      { name: 'Gin' },
      { name: 'Campari' },
      { name: 'Vermouth' },
    ]);
    expect(mojito.ingredients).toEqual([{ name: 'Mint' }]); // unaffected, no full-data match
  });

  it('falls back to the lite pool if fetching full-ingredient data fails, without throwing', async () => {
    getUserInventoryMock.mockResolvedValue([{ id: 'bottle-1', category: 'gin' }]);
    loadUserProfileMock.mockResolvedValue(null);
    getAllRecipesMock.mockRejectedValue(new Error('network down'));
    getPredictiveRecommendationsMock.mockReturnValue([]);

    const liteCocktails = [{ id: 'negroni', title: 'Negroni', ingredients: [] }];
    const result = await getTonightsPick({
      userId: 'user-1',
      profile: {},
      savedItems: {},
      allCocktails: liteCocktails as any,
    });

    expect(result.hasInventory).toBe(true);
    const scoringPool = getPredictiveRecommendationsMock.mock.calls[0][0];
    expect(scoringPool).toEqual(liteCocktails);
  });

  it("defaults name for inventory rows with a missing item_name, so predictiveEngine never gets a bottle with an undefined name (regression: real inventory rows have shown up with a null item_name, which crashed predictiveEngine's unconditional `b.name.toLowerCase()` and silently degraded the whole rail to the empty state)", async () => {
    getUserInventoryMock.mockResolvedValue([
      { id: 'bottle-1', item_name: undefined },
      { id: 'bottle-2', item_name: "Tito's Vodka" },
    ]);
    loadUserProfileMock.mockResolvedValue(null);
    getPredictiveRecommendationsMock.mockReturnValue([]);

    await getTonightsPick({
      userId: 'user-1',
      profile: {},
      savedItems: {},
      allCocktails: [],
    });

    const context = getPredictiveRecommendationsMock.mock.calls[0][3];
    expect(context.inventory.every((b: any) => typeof b.name === 'string')).toBe(true);
    expect(context.inventory[0].name).toBe('Unnamed bottle');
    expect(context.inventory[1].name).toBe("Tito's Vodka");
  });

  it('resolves to empty state instead of throwing when inventory fetch fails', async () => {
    getUserInventoryMock.mockRejectedValue(new Error('network down'));

    const result = await getTonightsPick({
      userId: 'user-1',
      profile: {},
      savedItems: {},
      allCocktails: [],
    });

    expect(result).toEqual({ hasInventory: false, recommendations: [] });
  });
});
