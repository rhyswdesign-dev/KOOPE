import AsyncStorage from '@react-native-async-storage/async-storage';
import { GroceryList, GroceryItem } from './groceryListService';
import { log } from '../lib/logger';

interface SavedShoppingList extends GroceryList {
  recipeName: string;
  isCompleted: boolean;
}

export class ShoppingListStore {
  private static STORAGE_KEY = 'saved_shopping_lists';

  /**
   * Create a hash from a string for consistent IDs
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Save a grocery list to persistent storage
   */
  static async saveShoppingList(
    groceryList: Omit<GroceryList, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
    recipeName: string,
    userId: string
  ): Promise<SavedShoppingList> {
    try {
      // Generate unique IDs for each item in each recipe
      const itemsWithUniqueIds = groceryList.items.map((item, index) => {
        // Create a completely unique ID for each item in each recipe
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substr(2, 9);
        const recipeHash = this.hashString(recipeName);
        const uniqueId = `item_${timestamp}_${recipeHash}_${index}_${randomSuffix}`;

        return {
          ...item,
          id: uniqueId,
          originalIndex: index
        };
      });

      const savedList: SavedShoppingList = {
        ...groceryList,
        items: itemsWithUniqueIds,
        id: `shopping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        recipeName,
        userId,
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const existingLists = await this.getAllShoppingLists();
      const updatedLists = [...existingLists, savedList];

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedLists));

      return savedList;
    } catch (error) {
      log.error('ShoppingListStore', 'Error saving shopping list', error);
      throw new Error('Failed to save shopping list');
    }
  }

  /**
   * Get all saved shopping lists
   */
  static async getAllShoppingLists(): Promise<SavedShoppingList[]> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (!stored) return [];

      const parsed = JSON.parse(stored);

      // Convert date strings back to Date objects
      return parsed.map((list: any) => ({
        ...list,
        createdAt: new Date(list.createdAt),
        updatedAt: new Date(list.updatedAt),
      }));
    } catch (error) {
      log.error('ShoppingListStore', 'Error loading shopping lists', error);
      return [];
    }
  }

  /**
   * Update the completion status of items in a shopping list
   */
  static async updateShoppingListItems(
    listId: string,
    checkedItems: Set<string>
  ): Promise<void> {
    try {
      const lists = await this.getAllShoppingLists();
      const listIndex = lists.findIndex(list => list.id === listId);

      if (listIndex === -1) {
        throw new Error('Shopping list not found');
      }

      // Update item completion status
      lists[listIndex].items = lists[listIndex].items.map(item => ({
        ...item,
        isCompleted: checkedItems.has(item.id),
      }));

      // Mark list as completed if all items are checked
      const allItemsChecked = lists[listIndex].items.every(item =>
        checkedItems.has(item.id)
      );
      lists[listIndex].isCompleted = allItemsChecked;
      lists[listIndex].updatedAt = new Date();

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(lists));
    } catch (error) {
      log.error('ShoppingListStore', 'Error updating shopping list', error);
      throw new Error('Failed to update shopping list');
    }
  }

  /**
   * Delete a shopping list
   */
  static async deleteShoppingList(listId: string): Promise<void> {
    try {
      const lists = await this.getAllShoppingLists();
      const filteredLists = lists.filter(list => list.id !== listId);

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredLists));
    } catch (error) {
      log.error('ShoppingListStore', 'Error deleting shopping list', error);
      throw new Error('Failed to delete shopping list');
    }
  }

  /**
   * Delete a specific item from shopping lists (single item deletion)
   */
  static async deleteShoppingItem(itemId: string): Promise<void> {
    try {
      log.fn('ShoppingListStore', 'deleteShoppingItem', { itemId });
      const lists = await this.getAllShoppingLists();
      log.debug('ShoppingListStore', `Found ${lists.length} shopping lists`);

      let itemFound = false;
      let deletedItemName = null;
      let deletedFromList = null;

      const updatedLists = lists.map(list => {
        log.debug('ShoppingListStore', `Checking list "${list.recipeName}" with ${list.items.length} items`);

        const originalItemCount = list.items.length;
        const filteredItems = list.items.filter(item => {
          const shouldKeep = item.id !== itemId;
          if (!shouldKeep) {
            log.info('ShoppingListStore', `Found and removing item: ${item.name} from "${list.recipeName}"`, { itemId, itemName: item.name });
            deletedItemName = item.name;
            deletedFromList = list.recipeName;
            itemFound = true;
          }
          return shouldKeep;
        });

        if (filteredItems.length !== originalItemCount) {
          log.debug('ShoppingListStore', `Updated list "${list.recipeName}" from ${originalItemCount} to ${filteredItems.length} items`);
          return {
            ...list,
            items: filteredItems,
            updatedAt: new Date()
          };
        }
        return list;
      }).filter(list => list.items.length > 0); // Remove empty lists to clean up UI

      if (!itemFound) {
        log.warn('ShoppingListStore', 'Item not found', { itemId });
        throw new Error('Item not found');
      }

      log.info('ShoppingListStore', `Successfully deleted "${deletedItemName}" from "${deletedFromList}"`);
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedLists));
    } catch (error) {
      log.error('ShoppingListStore', 'Error deleting shopping item', error);
      throw new Error('Failed to delete shopping item');
    }
  }

  /**
   * Update brand name for a specific item across all shopping lists
   */
  static async updateItemBrand(itemId: string, newBrand: string): Promise<void> {
    try {
      const lists = await this.getAllShoppingLists();

      const updatedLists = lists.map(list => ({
        ...list,
        items: list.items.map(item =>
          item.id === itemId
            ? { ...item, brand: newBrand, updatedAt: new Date() }
            : item
        ),
        updatedAt: new Date()
      }));

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedLists));
    } catch (error) {
      log.error('ShoppingListStore', 'Error updating item brand', error);
      throw new Error('Failed to update item brand');
    }
  }

  /**
   * Get shopping lists with vermouths properly categorized
   */
  static async getShoppingListsWithSpiritsCategory(): Promise<SavedShoppingList[]> {
    try {
      const lists = await this.getAllShoppingLists();

      // Update vermouth categorization
      return lists.map(list => ({
        ...list,
        items: list.items.map(item => {
          // Move vermouths to spirits & liquors category
          if (item.name.toLowerCase().includes('vermouth') &&
              item.category !== 'spirits_liquors') {
            return {
              ...item,
              category: 'spirits_liquors' as GroceryItem['category'],
              estimatedPrice: item.estimatedPrice || this.getVermouthPrice(item.name),
            };
          }
          return item;
        }),
      }));
    } catch (error) {
      log.error('ShoppingListStore', 'Error processing shopping lists', error);
      return [];
    }
  }

  /**
   * Get estimated price for vermouths
   */
  private static getVermouthPrice(name: string): number {
    const vermouthPrices: { [key: string]: number } = {
      'dry vermouth': 15,
      'sweet vermouth': 18,
      'dolin dry': 16,
      'dolin rouge': 18,
      'carpano antica': 35,
      'noilly prat': 15,
      'martini & rossi': 12,
      'cinzano': 14,
    };

    const lowercaseName = name.toLowerCase();

    // Find matching vermouth price
    for (const [key, price] of Object.entries(vermouthPrices)) {
      if (lowercaseName.includes(key)) {
        return price;
      }
    }

    // Default vermouth price
    return 16;
  }

  /**
   * Get consolidated shopping items with duplicates count and recipe grouping
   */
  static async getConsolidatedShoppingItems(): Promise<{
    itemsByRecipe: Record<string, Array<GroceryItem & { quantity: number; recipeNames: string[] }>>;
    allItems: Array<GroceryItem & { quantity: number; recipeNames: string[] }>;
  }> {
    try {
      const lists = await this.getAllShoppingLists();
      const itemsByRecipe: Record<string, Array<GroceryItem & { quantity: number; recipeNames: string[] }>> = {};
      const consolidatedItems = new Map<string, GroceryItem & { quantity: number; recipeNames: string[] }>();

      lists.forEach(list => {
        // Group by recipe
        const recipeItems: Array<GroceryItem & { quantity: number; recipeNames: string[] }> = [];

        list.items.forEach(item => {
          const itemWithMeta = {
            ...item,
            quantity: 1,
            recipeNames: [list.recipeName]
          };

          recipeItems.push(itemWithMeta);

          // For consolidated view, use name for grouping but keep individual IDs
          const nameKey = item.name.toLowerCase();
          if (consolidatedItems.has(nameKey)) {
            const existing = consolidatedItems.get(nameKey)!;
            existing.quantity += 1;
            if (!existing.recipeNames.includes(list.recipeName)) {
              existing.recipeNames.push(list.recipeName);
            }
          } else {
            consolidatedItems.set(nameKey, { ...itemWithMeta });
          }
        });

        itemsByRecipe[list.recipeName] = recipeItems;
      });

      return {
        itemsByRecipe,
        allItems: Array.from(consolidatedItems.values())
      };
    } catch (error) {
      log.error('ShoppingListStore', 'Error getting consolidated shopping items', error);
      return { itemsByRecipe: {}, allItems: [] };
    }
  }

  /**
   * Add item to shopping list (for recommendations)
   */
  static async addItemToShoppingList(
    item: Omit<GroceryItem, 'id' | 'checked' | 'isCompleted'>,
    source: string = 'Recommendation'
  ): Promise<void> {
    try {
      const uniqueId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const groceryList = {
        name: `${source} - Shopping List`,
        recipeIds: [],
        items: [{
          ...item,
          id: uniqueId,
          checked: false,
          isCompleted: false,
        }]
      };

      await this.saveShoppingList(groceryList, source);
    } catch (error) {
      log.error('ShoppingListStore', 'Error adding item to shopping list', error);
      throw new Error('Failed to add item to shopping list');
    }
  }

  /**
   * Update checked status for synchronized items across all lists
   */
  static async updateSynchronizedItemChecked(itemId: string, isChecked: boolean): Promise<void> {
    try {
      const lists = await this.getAllShoppingLists();
      let itemFound = false;

      const updatedLists = lists.map(list => {
        const hasChanges = list.items.some(item => item.id === itemId);

        if (hasChanges) {
          const updatedItems = list.items.map(item => {
            if (item.id === itemId) {
              itemFound = true;
              return { ...item, checked: isChecked, isCompleted: isChecked };
            }
            return item;
          });

          return {
            ...list,
            items: updatedItems,
            updatedAt: new Date()
          };
        }
        return list;
      });

      if (itemFound) {
        await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedLists));
      }
    } catch (error) {
      log.error('ShoppingListStore', 'Error updating synchronized item', error);
      throw new Error('Failed to update item');
    }
  }

  /**
   * Clear all shopping lists (for testing)
   */
  static async clearAllShoppingLists(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      log.error('ShoppingListStore', 'Error clearing shopping lists', error);
    }
  }

  /**
   * Migrate existing shopping lists to include subcategory
   */
  static async migrateShoppingLists(): Promise<void> {
    try {
      const lists = await this.getAllShoppingLists();
      const migratedLists = lists.map(list => ({
        ...list,
        items: list.items.map(item => ({
          ...item,
          subcategory: item.subcategory || this.getSubcategoryFromName(item.name),
        }))
      }));

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(migratedLists));
    } catch (error) {
      log.error('ShoppingListStore', 'Error migrating shopping lists', error);
    }
  }

  /**
   * Get subcategory from item name
   */
  private static getSubcategoryFromName(name: string): string | undefined {
    const lowerCase = name.toLowerCase();

    // Spirits - return specific type
    if (lowerCase.match(/vodka/)) return 'vodka';
    if (lowerCase.match(/gin/)) return 'gin';
    if (lowerCase.match(/rum/)) return 'rum';
    if (lowerCase.match(/(whiskey|bourbon|rye|scotch)/)) return 'whiskey';
    if (lowerCase.match(/tequila/)) return 'tequila';
    if (lowerCase.match(/(brandy|cognac)/)) return 'brandy';
    if (lowerCase.match(/mezcal/)) return 'mezcal';
    if (lowerCase.match(/absinthe/)) return 'absinthe';
    if (lowerCase.match(/vermouth/)) {
      if (lowerCase.match(/dry/)) return 'dry vermouth';
      if (lowerCase.match(/sweet/)) return 'sweet vermouth';
      return 'vermouth';
    }

    // Liqueurs
    if (lowerCase.match(/cointreau|triple sec|grand marnier/)) return 'orange liqueur';
    if (lowerCase.match(/kahlua|coffee liqueur/)) return 'coffee liqueur';
    if (lowerCase.match(/amaretto/)) return 'amaretto';
    if (lowerCase.match(/chambord/)) return 'raspberry liqueur';

    return undefined;
  }
}