import { describe, it, expect, beforeEach, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRecipeCompletions, logRecipeCompletion, updateCompletionRating } from '../recipeCompletionService';

vi.mock('../../lib/logger', () => ({
  log: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

describe('recipeCompletionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs completion with details and stores it', async () => {
    (AsyncStorage.getItem as any).mockResolvedValueOnce(JSON.stringify([]));
    (AsyncStorage.setItem as any).mockResolvedValueOnce(undefined);

    const result = await logRecipeCompletion({
      userId: 'user_1',
      recipeId: 'recipe_1',
      recipeName: 'Negroni',
      ingredientBrands: [{ ingredient: 'Gin', brandUsed: 'Tanqueray' }],
      substitutions: 'Used blanco vermouth',
    });

    expect(result.id).toContain('completion_');
    expect(result.recipeName).toBe('Negroni');
    expect(result.ingredientBrands[0].brandUsed).toBe('Tanqueray');
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('updates rating for existing completion', async () => {
    const stored = [
      {
        id: 'completion_1',
        userId: 'user_1',
        recipeName: 'Negroni',
        madeAt: new Date().toISOString(),
        ingredientBrands: [],
      },
    ];

    (AsyncStorage.getItem as any).mockResolvedValueOnce(JSON.stringify(stored));
    (AsyncStorage.setItem as any).mockResolvedValueOnce(undefined);

    const updated = await updateCompletionRating('completion_1', 5, 'Great');
    expect(updated?.rating).toBe(5);
    expect(updated?.notes).toBe('Great');
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('filters completions by user id', async () => {
    const stored = [
      { id: 'a', userId: 'u1', recipeName: 'A', madeAt: new Date().toISOString(), ingredientBrands: [] },
      { id: 'b', userId: 'u2', recipeName: 'B', madeAt: new Date().toISOString(), ingredientBrands: [] },
    ];

    (AsyncStorage.getItem as any).mockResolvedValueOnce(JSON.stringify(stored));

    const result = await getRecipeCompletions('u1');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a');
  });
});
