/**
 * ShoppingListStore Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShoppingListStore } from '../shoppingListStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

vi.mock('../../store/useXPSystem', () => ({
  useXPSystem: {
    getState: () => ({
      earnXP: vi.fn(),
    }),
  },
}));

// Mock AsyncStorage
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
}));

describe('ShoppingListStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveShoppingList', () => {
    it('should save shopping list with valid userId', async () => {
      const mockGroceryList = {
        name: 'Test Recipe',
        items: [
          {
            id: 'item1',
            name: 'Gin',
            quantity: '2 oz',
            category: 'Spirits' as const,
            purchased: false,
          },
        ],
      };

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify([]));
      (AsyncStorage.setItem as any).mockResolvedValue(undefined);

      const result = await ShoppingListStore.saveShoppingList(
        mockGroceryList,
        'Test Recipe',
        'test-user-123'
      );

      expect(result).toHaveProperty('userId', 'test-user-123');
      expect(result).toHaveProperty('recipeName', 'Test Recipe');
      expect(result.items).toHaveLength(1);
    });

    it('should generate unique IDs for items', async () => {
      const mockGroceryList = {
        name: 'Test Recipe',
        items: [
          {
            id: 'item1',
            name: 'Gin',
            quantity: '2 oz',
            category: 'Spirits' as const,
            purchased: false,
          },
          {
            id: 'item2',
            name: 'Tonic',
            quantity: '4 oz',
            category: 'Mixers' as const,
            purchased: false,
          },
        ],
      };

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify([]));
      (AsyncStorage.setItem as any).mockResolvedValue(undefined);

      const result = await ShoppingListStore.saveShoppingList(
        mockGroceryList,
        'Test Recipe',
        'test-user-123'
      );

      const item1Id = result.items[0].id;
      const item2Id = result.items[1].id;

      expect(item1Id).not.toBe(item2Id);
      expect(item1Id).toContain('item_');
      expect(item2Id).toContain('item_');
    });
  });

  describe('getAllShoppingLists', () => {
    it('should return empty array when no lists exist', async () => {
      (AsyncStorage.getItem as any).mockResolvedValue(null);

      const result = await ShoppingListStore.getAllShoppingLists();

      expect(result).toEqual([]);
    });

    it('should return parsed shopping lists', async () => {
      const mockLists = [
        {
          id: 'list1',
          recipeName: 'Martini',
          userId: 'user1',
          items: [],
          isCompleted: false,
        },
      ];

      (AsyncStorage.getItem as any).mockResolvedValue(JSON.stringify(mockLists));

      const result = await ShoppingListStore.getAllShoppingLists();

      expect(result).toHaveLength(1);
      expect(result[0].recipeName).toBe('Martini');
    });
  });
});
