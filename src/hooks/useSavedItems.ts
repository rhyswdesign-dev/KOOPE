import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from '../contexts/SubscriptionContext';
import { log } from '../lib/logger';

export interface SavedItem {
  id: string;
  name: string;
  subtitle?: string;
  image?: string;
  type: 'bar' | 'spirit' | 'cocktail' | 'event' | 'community' | 'vault' | 'game' | 'drink';
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
}

const STORAGE_KEY = 'savedItems';

const FREE_RECIPE_LIMIT = 5;

export function useSavedItems() {
  const { isSubscriber } = useSubscription();
  const [savedItems, setSavedItems] = useState<SavedItemsState>({
    savedBars: [],
    savedSpirits: [],
    savedCocktails: [],
    savedEvents: [],
    followedCommunities: [],
    savedVaultItems: [],
    savedGames: [],
    savedDrinks: [],
  });

  // Load saved items from AsyncStorage on mount
  useEffect(() => {
    loadSavedItems();
  }, []);

  const loadSavedItems = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedItems = JSON.parse(stored);
        log.debug('useSavedItems', 'Loaded saved items', { itemsCount: Object.keys(parsedItems).length });

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
        };
        
        setSavedItems(mergedItems);
      }
    } catch (error) {
      log.warn('useSavedItems', 'Error loading saved items', { error });
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
      setSavedItems({
        savedBars: [],
        savedSpirits: [],
        savedCocktails: [],
        savedEvents: [],
        followedCommunities: [],
        savedVaultItems: [],
        savedGames: [],
        savedDrinks: [],
      });
      log.info('useSavedItems', 'Storage cleared');
    } catch (error) {
      log.warn('useSavedItems', 'Error clearing storage', { error });
    }
  };

  const toggleSavedBar = (item: SavedItem | { id: string; name: string; subtitle?: string; image?: string }) => {
    const barItem: SavedItem = { ...item, type: 'bar' };
    log.debug('useSavedItems', 'Toggling bar', { barId: barItem.id, name: barItem.name });
    setSavedItems(prev => {
      const exists = prev.savedBars.find(b => b.id === barItem.id);
      const newItems = {
        ...prev,
        savedBars: exists
          ? prev.savedBars.filter(b => b.id !== barItem.id)
          : [...prev.savedBars, barItem]
      };
      log.debug('useSavedItems', 'Updated saved bars', { count: newItems.savedBars.length });
      saveToStorage(newItems);
      return newItems;
    });
  };

  const toggleSavedSpirit = (item: SavedItem | { id: string; name: string; subtitle?: string; image?: string }) => {
    const spiritItem: SavedItem = { ...item, type: 'spirit' };
    setSavedItems(prev => {
      const exists = prev.savedSpirits.find(s => s.id === spiritItem.id);
      const newItems = {
        ...prev,
        savedSpirits: exists
          ? prev.savedSpirits.filter(s => s.id !== spiritItem.id)
          : [...prev.savedSpirits, spiritItem]
      };
      saveToStorage(newItems);
      return newItems;
    });
  };

  const toggleSavedCocktail = (item: SavedItem | { id: string; name: string; subtitle?: string; image?: string }): 'success' | 'limit_reached' | 'removed' => {
    const cocktailItem: SavedItem = { ...item, type: 'cocktail' };
    const exists = savedItems.savedCocktails.find(c => c.id === cocktailItem.id);

    // If removing, allow it
    if (exists) {
      setSavedItems(prev => {
        const newItems = {
          ...prev,
          savedCocktails: prev.savedCocktails.filter(c => c.id !== cocktailItem.id)
        };
        saveToStorage(newItems);
        return newItems;
      });
      return 'removed';
    }

    // If adding, check free user limit
    if (!isSubscriber && savedItems.savedCocktails.length >= FREE_RECIPE_LIMIT) {
      log.info('useSavedItems', 'Free user recipe limit reached - cannot save more', {
        limit: FREE_RECIPE_LIMIT,
        currentCount: savedItems.savedCocktails.length
      });
      return 'limit_reached';
    }

    // Save the cocktail
    setSavedItems(prev => {
      const newItems = {
        ...prev,
        savedCocktails: [...prev.savedCocktails, cocktailItem]
      };
      saveToStorage(newItems);
      return newItems;
    });
    return 'success';
  };

  const toggleSavedEvent = (item: SavedItem | { id: string; name: string; subtitle?: string; image?: string }) => {
    const eventItem: SavedItem = { ...item, type: 'event' };
    setSavedItems(prev => {
      const exists = prev.savedEvents.find(e => e.id === eventItem.id);
      const newItems = {
        ...prev,
        savedEvents: exists
          ? prev.savedEvents.filter(e => e.id !== eventItem.id)
          : [...prev.savedEvents, eventItem]
      };
      saveToStorage(newItems);
      return newItems;
    });
  };

  const toggleFollowedCommunity = (item: SavedItem | { id: string; name: string; subtitle?: string; image?: string }) => {
    const communityItem: SavedItem = { ...item, type: 'community' };
    setSavedItems(prev => {
      const exists = prev.followedCommunities.find(c => c.id === communityItem.id);
      const newItems = {
        ...prev,
        followedCommunities: exists
          ? prev.followedCommunities.filter(c => c.id !== communityItem.id)
          : [...prev.followedCommunities, communityItem]
      };
      saveToStorage(newItems);
      return newItems;
    });
  };

  const toggleSavedVaultItem = (item: SavedItem | { id: string; name: string; subtitle?: string; image?: string }) => {
    const vaultItem: SavedItem = { ...item, type: 'vault' };
    setSavedItems(prev => {
      const savedVaultItems = prev.savedVaultItems || [];
      const exists = savedVaultItems.find(v => v.id === vaultItem.id);
      const newItems = {
        ...prev,
        savedVaultItems: exists
          ? savedVaultItems.filter(v => v.id !== vaultItem.id)
          : [...savedVaultItems, vaultItem]
      };
      saveToStorage(newItems);
      return newItems;
    });
  };

  const toggleSavedGame = (item: SavedItem | { id: string; name: string; subtitle?: string; image?: string }) => {
    const gameItem: SavedItem = { ...item, type: 'game' };
    setSavedItems(prev => {
      const savedGames = prev.savedGames || [];
      const exists = savedGames.find(g => g.id === gameItem.id);
      const newItems = {
        ...prev,
        savedGames: exists
          ? savedGames.filter(g => g.id !== gameItem.id)
          : [...savedGames, gameItem]
      };
      saveToStorage(newItems);
      return newItems;
    });
  };

  const toggleSavedDrink = (item: SavedItem | { id: string; name: string; subtitle?: string; image?: string }) => {
    const drinkItem: SavedItem = { ...item, type: 'drink' };
    setSavedItems(prev => {
      const savedDrinks = prev.savedDrinks || [];
      const exists = savedDrinks.find(d => d.id === drinkItem.id);
      const newItems = {
        ...prev,
        savedDrinks: exists
          ? savedDrinks.filter(d => d.id !== drinkItem.id)
          : [...savedDrinks, drinkItem]
      };
      saveToStorage(newItems);
      return newItems;
    });
  };

  // Helper functions to check if items are saved
  const isBarSaved = (barId: string) => {
    if (!savedItems.savedBars || !Array.isArray(savedItems.savedBars)) return false;
    const isSaved = savedItems.savedBars.some(b => b.id === barId);
    log.debug('useSavedItems', 'Checking if bar is saved', {
      barId,
      isSaved,
      savedBarIds: savedItems.savedBars.map(b => b.id)
    });
    return isSaved;
  };
  const isSpiritSaved = (spiritId: string) => savedItems.savedSpirits?.some(s => s.id === spiritId) || false;
  const isCocktailSaved = (cocktailId: string) => savedItems.savedCocktails?.some(c => c.id === cocktailId) || false;
  const isEventSaved = (eventId: string) => savedItems.savedEvents?.some(e => e.id === eventId) || false;
  const isCommunityFollowed = (communityId: string) => savedItems.followedCommunities?.some(c => c.id === communityId) || false;
  const isVaultItemSaved = (vaultId: string) => savedItems.savedVaultItems?.some(v => v.id === vaultId) || false;
  const isGameSaved = (gameId: string) => savedItems.savedGames?.some(g => g.id === gameId) || false;
  const isDrinkSaved = (drinkId: string) => savedItems.savedDrinks?.some(d => d.id === drinkId) || false;

  return {
    savedItems,
    toggleSavedBar,
    toggleSavedSpirit,
    toggleSavedCocktail,
    toggleSavedEvent,
    toggleFollowedCommunity,
    toggleSavedVaultItem,
    toggleSavedGame,
    toggleSavedDrink,
    isBarSaved,
    isSpiritSaved,
    isCocktailSaved,
    isEventSaved,
    isCommunityFollowed,
    isVaultItemSaved,
    isGameSaved,
    isDrinkSaved,
    clearStorage, // For debugging
  };
}