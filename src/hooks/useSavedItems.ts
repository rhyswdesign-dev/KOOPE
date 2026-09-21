import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserTier } from '../store/useUserTier';
import { log } from '../lib/logger';
import { useAuth } from '../contexts/AuthContext';
import { challengeProgressService } from '../services/challengeProgressService';

export interface SavedItem {
  id: string;
  name: string;
  subtitle?: string;
  image?: any;
  type:
    | 'bar'
    | 'spirit'
    | 'cocktail'
    | 'event'
    | 'community'
    | 'vault'
    | 'game'
    | 'drink'
    | 'recipe_card';
}

export interface SavedItemsState {
  savedBars: SavedItem[];
  savedSpirits: SavedItem[];
  savedCocktails: SavedItem[];
  savedEvents: SavedItem[];
  followedCommunities: SavedItem[];
  savedVaultItems: SavedItem[];
  savedGames: SavedItem[];
  savedDrinks: SavedItem[];
  savedRecipeCards: SavedItem[];
}

const STORAGE_KEY = 'savedItems';
const initialSavedItemsState: SavedItemsState = {
  savedBars: [],
  savedSpirits: [],
  savedCocktails: [],
  savedEvents: [],
  followedCommunities: [],
  savedVaultItems: [],
  savedGames: [],
  savedDrinks: [],
  savedRecipeCards: [],
};
let globalSavedItemsState: SavedItemsState = initialSavedItemsState;
let hasHydratedSavedItems = false;
const savedItemsSubscribers = new Set<(next: SavedItemsState) => void>();

const publishSavedItems = (next: SavedItemsState) => {
  globalSavedItemsState = next;
  savedItemsSubscribers.forEach((fn) => fn(next));
};

export const FREE_RECIPE_LIMIT = 5;

export function useSavedItems() {
  const tier = useUserTier((state) => state.tier);
  const { user } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedItemsState>(globalSavedItemsState);
  // Lets a screen distinguish "genuinely no saved items" from "AsyncStorage
  // hasn't answered yet" — without it, any screen gating a section on e.g.
  // `savedCocktails.length === 0` shows the empty state first, then the real
  // one once hydration finishes, which reads as the screen jumping.
  const [isHydrated, setIsHydrated] = useState(hasHydratedSavedItems);

  // Load saved items from AsyncStorage on mount
  useEffect(() => {
    const subscriber = (next: SavedItemsState) => setSavedItems(next);
    savedItemsSubscribers.add(subscriber);
    loadSavedItems().finally(() => setIsHydrated(true));
    return () => {
      savedItemsSubscribers.delete(subscriber);
    };
  }, []);

  const loadSavedItems = async () => {
    if (hasHydratedSavedItems) return;
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedItems = JSON.parse(stored);
        log.debug('useSavedItems', 'Loaded saved items', {
          itemsCount: Object.keys(parsedItems).length,
        });

        // Ensure all required properties exist with default empty arrays
        const mergedItems: SavedItemsState = {
          savedBars: parsedItems.savedBars || [],
          savedSpirits: parsedItems.savedSpirits || [],
          savedCocktails: parsedItems.savedCocktails || [],
          savedEvents: parsedItems.savedEvents || [],
          followedCommunities: parsedItems.followedCommunities || [],
          savedVaultItems: parsedItems.savedVaultItems || [],
          savedGames: parsedItems.savedGames || [],
          savedDrinks: parsedItems.savedDrinks || [],
          savedRecipeCards: parsedItems.savedRecipeCards || [],
        };
        publishSavedItems(mergedItems);
      }
      hasHydratedSavedItems = true;
    } catch (error) {
      log.warn('useSavedItems', 'Error loading saved items', { error });
      hasHydratedSavedItems = true;
    }
  };

  const saveToStorage = async (newItems: SavedItemsState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      log.debug('useSavedItems', 'Saved to storage', { itemsCount: Object.keys(newItems).length });
    } catch (error) {
      log.warn('useSavedItems', 'Error saving items', { error });
    }
  };

  const clearStorage = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      publishSavedItems(initialSavedItemsState);
      log.info('useSavedItems', 'Storage cleared');
    } catch (error) {
      log.warn('useSavedItems', 'Error clearing storage', { error });
    }
  };

  const toggleSavedBar = (
    item: SavedItem | { id: string; name: string; subtitle?: string; image?: string },
  ) => {
    const barItem: SavedItem = { ...item, type: 'bar' };
    log.debug('useSavedItems', 'Toggling bar', { barId: barItem.id, name: barItem.name });
    {
      const exists = globalSavedItemsState.savedBars.find((b) => b.id === barItem.id);
      const newItems = {
        ...globalSavedItemsState,
        savedBars: exists
          ? globalSavedItemsState.savedBars.filter((b) => b.id !== barItem.id)
          : [...globalSavedItemsState.savedBars, barItem],
      };
      log.debug('useSavedItems', 'Updated saved bars', { count: newItems.savedBars.length });
      publishSavedItems(newItems);
      saveToStorage(newItems);
    }
  };

  const toggleSavedSpirit = (
    item: SavedItem | { id: string; name: string; subtitle?: string; image?: string },
  ) => {
    const spiritItem: SavedItem = { ...item, type: 'spirit' };
    {
      const exists = globalSavedItemsState.savedSpirits.find((s) => s.id === spiritItem.id);
      const newItems = {
        ...globalSavedItemsState,
        savedSpirits: exists
          ? globalSavedItemsState.savedSpirits.filter((s) => s.id !== spiritItem.id)
          : [...globalSavedItemsState.savedSpirits, spiritItem],
      };
      publishSavedItems(newItems);
      saveToStorage(newItems);
    }
  };

  const toggleSavedCocktail = (
    item: SavedItem | { id: string; name: string; subtitle?: string; image?: string },
  ): 'success' | 'limit_reached' | 'removed' => {
    const cocktailItem: SavedItem = { ...item, type: 'cocktail' };
    const exists = globalSavedItemsState.savedCocktails.find((c) => c.id === cocktailItem.id);

    // If removing, allow it
    if (exists) {
      const newItems = {
        ...globalSavedItemsState,
        savedCocktails: globalSavedItemsState.savedCocktails.filter(
          (c) => c.id !== cocktailItem.id,
        ),
      };
      publishSavedItems(newItems);
      saveToStorage(newItems);
      return 'removed';
    }

    // If adding, check free user limit
    if (tier === 'FREE' && globalSavedItemsState.savedCocktails.length >= FREE_RECIPE_LIMIT) {
      log.info('useSavedItems', 'Free user recipe limit reached - cannot save more', {
        limit: FREE_RECIPE_LIMIT,
        currentCount: globalSavedItemsState.savedCocktails.length,
      });
      return 'limit_reached';
    }

    // Save the cocktail
    const newItems = {
      ...globalSavedItemsState,
      savedCocktails: [...globalSavedItemsState.savedCocktails, cocktailItem],
    };
    publishSavedItems(newItems);
    saveToStorage(newItems);
    if (user?.id) {
      challengeProgressService.trackSaveRecipe(user.id, cocktailItem.id);
    }
    return 'success';
  };

  const toggleSavedEvent = (
    item: SavedItem | { id: string; name: string; subtitle?: string; image?: string },
  ) => {
    const eventItem: SavedItem = { ...item, type: 'event' };
    const exists = globalSavedItemsState.savedEvents.find((e) => e.id === eventItem.id);
    const newItems = {
      ...globalSavedItemsState,
      savedEvents: exists
        ? globalSavedItemsState.savedEvents.filter((e) => e.id !== eventItem.id)
        : [...globalSavedItemsState.savedEvents, eventItem],
    };
    publishSavedItems(newItems);
    saveToStorage(newItems);
  };

  const toggleFollowedCommunity = (
    item: SavedItem | { id: string; name: string; subtitle?: string; image?: string },
  ) => {
    const communityItem: SavedItem = { ...item, type: 'community' };
    const exists = globalSavedItemsState.followedCommunities.find((c) => c.id === communityItem.id);
    const newItems = {
      ...globalSavedItemsState,
      followedCommunities: exists
        ? globalSavedItemsState.followedCommunities.filter((c) => c.id !== communityItem.id)
        : [...globalSavedItemsState.followedCommunities, communityItem],
    };
    publishSavedItems(newItems);
    saveToStorage(newItems);
  };

  const toggleSavedVaultItem = (
    item: SavedItem | { id: string; name: string; subtitle?: string; image?: string },
  ) => {
    const vaultItem: SavedItem = { ...item, type: 'vault' };
    const savedVaultItems = globalSavedItemsState.savedVaultItems || [];
    const exists = savedVaultItems.find((v) => v.id === vaultItem.id);
    const newItems = {
      ...globalSavedItemsState,
      savedVaultItems: exists
        ? savedVaultItems.filter((v) => v.id !== vaultItem.id)
        : [...savedVaultItems, vaultItem],
    };
    publishSavedItems(newItems);
    saveToStorage(newItems);
  };

  const toggleSavedGame = (
    item: SavedItem | { id: string; name: string; subtitle?: string; image?: string },
  ) => {
    const gameItem: SavedItem = { ...item, type: 'game' };
    const savedGames = globalSavedItemsState.savedGames || [];
    const exists = savedGames.find((g) => g.id === gameItem.id);
    const newItems = {
      ...globalSavedItemsState,
      savedGames: exists
        ? savedGames.filter((g) => g.id !== gameItem.id)
        : [...savedGames, gameItem],
    };
    publishSavedItems(newItems);
    saveToStorage(newItems);
  };

  const toggleSavedDrink = (
    item: SavedItem | { id: string; name: string; subtitle?: string; image?: string },
  ) => {
    const drinkItem: SavedItem = { ...item, type: 'drink' };
    const savedDrinks = globalSavedItemsState.savedDrinks || [];
    const exists = savedDrinks.find((d) => d.id === drinkItem.id);
    const newItems = {
      ...globalSavedItemsState,
      savedDrinks: exists
        ? savedDrinks.filter((d) => d.id !== drinkItem.id)
        : [...savedDrinks, drinkItem],
    };
    publishSavedItems(newItems);
    saveToStorage(newItems);
  };

  const toggleSavedRecipeCard = (
    item: SavedItem | { id: string; name: string; subtitle?: string; image?: string },
  ) => {
    const recipeCardItem: SavedItem = { ...item, type: 'recipe_card' };
    const savedRecipeCards = globalSavedItemsState.savedRecipeCards || [];
    const exists = savedRecipeCards.find((card) => card.id === recipeCardItem.id);
    const newItems = {
      ...globalSavedItemsState,
      savedRecipeCards: exists
        ? savedRecipeCards.filter((card) => card.id !== recipeCardItem.id)
        : [...savedRecipeCards, recipeCardItem],
    };
    publishSavedItems(newItems);
    saveToStorage(newItems);
  };

  // Helper functions to check if items are saved
  const isBarSaved = (barId: string) => {
    if (!savedItems.savedBars || !Array.isArray(savedItems.savedBars)) return false;
    const isSaved = savedItems.savedBars.some((b) => b.id === barId);
    log.debug('useSavedItems', 'Checking if bar is saved', {
      barId,
      isSaved,
      savedBarIds: savedItems.savedBars.map((b) => b.id),
    });
    return isSaved;
  };
  const isSpiritSaved = (spiritId: string) =>
    savedItems.savedSpirits?.some((s) => s.id === spiritId) || false;
  const isCocktailSaved = (cocktailId: string) =>
    savedItems.savedCocktails?.some((c) => c.id === cocktailId) || false;
  const isEventSaved = (eventId: string) =>
    savedItems.savedEvents?.some((e) => e.id === eventId) || false;
  const isCommunityFollowed = (communityId: string) =>
    savedItems.followedCommunities?.some((c) => c.id === communityId) || false;
  const isVaultItemSaved = (vaultId: string) =>
    savedItems.savedVaultItems?.some((v) => v.id === vaultId) || false;
  const isGameSaved = (gameId: string) =>
    savedItems.savedGames?.some((g) => g.id === gameId) || false;
  const isDrinkSaved = (drinkId: string) =>
    savedItems.savedDrinks?.some((d) => d.id === drinkId) || false;
  const isRecipeCardSaved = (cardId: string) =>
    savedItems.savedRecipeCards?.some((card) => card.id === cardId) || false;

  return {
    savedItems,
    isHydrated,
    toggleSavedBar,
    toggleSavedSpirit,
    toggleSavedCocktail,
    toggleSavedEvent,
    toggleSavedVaultItem,
    toggleSavedGame,
    toggleSavedDrink,
    toggleSavedRecipeCard,
    isBarSaved,
    isSpiritSaved,
    isCocktailSaved,
    isEventSaved,
    isVaultItemSaved,
    isGameSaved,
    isDrinkSaved,
    isRecipeCardSaved,
    savedCocktailCount: savedItems.savedCocktails?.length || 0,
    canSaveMoreCocktails:
      tier !== 'FREE' || (savedItems.savedCocktails?.length || 0) < FREE_RECIPE_LIMIT,
    clearStorage, // For debugging
  };
}
