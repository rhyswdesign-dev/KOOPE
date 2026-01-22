/**
 * OFFLINE SERVICE
 * Manages offline state detection, data persistence, and sync queue
 * Ensures app works seamlessly even without internet connectivity
 */

import React from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types/recipe';
import { log } from '../lib/logger';

// Storage keys
const STORAGE_KEYS = {
  OFFLINE_QUEUE: '@offline_queue',
  LAST_SYNC: '@last_sync',
  OFFLINE_RECIPES: '@offline_recipes',
  OFFLINE_FAVORITES: '@offline_favorites',
  OFFLINE_HOME_BAR: '@offline_home_bar',
} as const;

export interface OfflineAction {
  id: string;
  type: 'favorite' | 'unfavorite' | 'add_to_bar' | 'remove_from_bar' | 'create_recipe' | 'update_recipe';
  data: any;
  timestamp: number;
  retryCount: number;
}

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

class OfflineService {
  private static instance: OfflineService;
  private networkStatus: NetworkStatus = {
    isConnected: false,
    isInternetReachable: null,
    type: null,
  };
  private listeners: Array<(status: NetworkStatus) => void> = [];
  private offlineQueue: OfflineAction[] = [];
  private isSyncing = false;
  private unsubscribe: (() => void) | null = null;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  /**
   * Initialize network monitoring and load offline queue
   */
  private async initialize(): Promise<void> {
    // Load offline queue from storage
    await this.loadOfflineQueue();

    // Subscribe to network state changes
    this.unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const newStatus: NetworkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      };

      const wasOffline = !this.networkStatus.isConnected;
      const isNowOnline = newStatus.isConnected;

      this.networkStatus = newStatus;

      // Notify all listeners
      this.listeners.forEach(listener => listener(newStatus));

      // If connection restored, sync offline queue
      if (wasOffline && isNowOnline) {
        log.info('OfflineService', 'Connection restored, syncing offline queue', {
          queueSize: this.offlineQueue.length
        });
        this.syncOfflineQueue();
      }
    });

    // Get initial network state
    const state = await NetInfo.fetch();
    this.networkStatus = {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
    };
  }

  /**
   * Get current network status
   */
  public getNetworkStatus(): NetworkStatus {
    return this.networkStatus;
  }

  /**
   * Check if device is online
   */
  public isOnline(): boolean {
    return this.networkStatus.isConnected && this.networkStatus.isInternetReachable !== false;
  }

  /**
   * Check if device is offline
   */
  public isOffline(): boolean {
    return !this.isOnline();
  }

  /**
   * Subscribe to network status changes
   */
  public addNetworkListener(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Add action to offline queue
   */
  public async addToQueue(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queueAction: OfflineAction = {
      ...action,
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.offlineQueue.push(queueAction);
    await this.saveOfflineQueue();

    log.info('OfflineService', 'Added action to offline queue', {
      type: action.type,
      queueSize: this.offlineQueue.length
    });
  }

  /**
   * Get offline queue
   */
  public getQueue(): OfflineAction[] {
    return [...this.offlineQueue];
  }

  /**
   * Get queue size
   */
  public getQueueSize(): number {
    return this.offlineQueue.length;
  }

  /**
   * Clear offline queue
   */
  public async clearQueue(): Promise<void> {
    this.offlineQueue = [];
    await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
  }

  /**
   * Sync offline queue when connection is restored
   */
  public async syncOfflineQueue(): Promise<void> {
    if (this.isSyncing || this.offlineQueue.length === 0) {
      return;
    }

    if (!this.isOnline()) {
      log.warn('OfflineService', 'Cannot sync: device is offline');
      return;
    }

    this.isSyncing = true;
    log.info('OfflineService', 'Starting sync', { actionCount: this.offlineQueue.length });

    const failedActions: OfflineAction[] = [];

    for (const action of this.offlineQueue) {
      try {
        await this.executeAction(action);
        log.info('OfflineService', 'Synced action successfully', {
          type: action.type,
          actionId: action.id
        });
      } catch (error) {
        log.error('OfflineService', 'Failed to sync action', error, {
          type: action.type,
          actionId: action.id,
          retryCount: action.retryCount
        });

        // Retry up to 3 times
        if (action.retryCount < 3) {
          failedActions.push({
            ...action,
            retryCount: action.retryCount + 1,
          });
        } else {
          log.warn('OfflineService', 'Action failed after 3 retries, discarding', {
            type: action.type,
            actionId: action.id
          });
        }
      }
    }

    // Update queue with failed actions
    this.offlineQueue = failedActions;
    await this.saveOfflineQueue();

    // Update last sync timestamp
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());

    this.isSyncing = false;
    log.info('OfflineService', 'Sync complete', {
      failedCount: failedActions.length,
      successCount: this.offlineQueue.length - failedActions.length
    });
  }

  /**
   * Execute a queued action
   */
  private async executeAction(action: OfflineAction): Promise<void> {
    log.fn('OfflineService', 'executeAction', { type: action.type, actionId: action.id });

    switch (action.type) {
      case 'favorite':
        await this.executeFavoriteAction(action.data.recipeId, true);
        break;
      case 'unfavorite':
        await this.executeFavoriteAction(action.data.recipeId, false);
        break;
      case 'add_to_bar':
        await this.executeHomeBarAction(action.data.ingredientId, 'add');
        break;
      case 'remove_from_bar':
        await this.executeHomeBarAction(action.data.ingredientId, 'remove');
        break;
      case 'create_recipe':
        await this.executeCreateRecipe(action.data.recipe);
        break;
      case 'update_recipe':
        await this.executeUpdateRecipe(action.data.recipeId, action.data.updates);
        break;
      default:
        log.warn('OfflineService', 'Unknown action type', { type: (action as any).type });
        throw new Error(`Unknown action type: ${(action as any).type}`);
    }
  }

  /**
   * Execute favorite/unfavorite API call
   * TODO: Replace with actual backend API endpoint
   */
  private async executeFavoriteAction(recipeId: string, isFavorite: boolean): Promise<void> {
    log.api('POST', `/api/users/favorites/${recipeId}`, { isFavorite });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // TODO: Implement actual API call
    // Example:
    // const response = await fetch(`${API_BASE_URL}/users/favorites/${recipeId}`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${authToken}`
    //   },
    //   body: JSON.stringify({ isFavorite })
    // });
    //
    // if (!response.ok) {
    //   throw new Error(`Failed to ${isFavorite ? 'favorite' : 'unfavorite'} recipe`);
    // }
  }

  /**
   * Execute home bar add/remove API call
   * TODO: Replace with actual backend API endpoint
   */
  private async executeHomeBarAction(ingredientId: string, action: 'add' | 'remove'): Promise<void> {
    log.api('POST', `/api/users/home-bar/${ingredientId}`, { action });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // TODO: Implement actual API call
    // const response = await fetch(`${API_BASE_URL}/users/home-bar/${ingredientId}`, {
    //   method: action === 'add' ? 'POST' : 'DELETE',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${authToken}`
    //   }
    // });
    //
    // if (!response.ok) {
    //   throw new Error(`Failed to ${action} ingredient ${action === 'add' ? 'to' : 'from'} home bar`);
    // }
  }

  /**
   * Execute create recipe API call
   * TODO: Replace with actual backend API endpoint
   */
  private async executeCreateRecipe(recipe: any): Promise<void> {
    log.api('POST', '/api/recipes', { title: recipe.title });

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // TODO: Implement actual API call
    // const response = await fetch(`${API_BASE_URL}/recipes`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${authToken}`
    //   },
    //   body: JSON.stringify(recipe)
    // });
    //
    // if (!response.ok) {
    //   throw new Error('Failed to create recipe');
    // }
  }

  /**
   * Execute update recipe API call
   * TODO: Replace with actual backend API endpoint
   */
  private async executeUpdateRecipe(recipeId: string, updates: any): Promise<void> {
    log.api('PATCH', `/api/recipes/${recipeId}`, updates);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // TODO: Implement actual API call
    // const response = await fetch(`${API_BASE_URL}/recipes/${recipeId}`, {
    //   method: 'PATCH',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${authToken}`
    //   },
    //   body: JSON.stringify(updates)
    // });
    //
    // if (!response.ok) {
    //   throw new Error('Failed to update recipe');
    // }
  }

  /**
   * Load offline queue from storage
   */
  private async loadOfflineQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (queueData) {
        this.offlineQueue = JSON.parse(queueData);
        log.info('OfflineService', 'Loaded offline queue from storage', {
          actionCount: this.offlineQueue.length
        });
      }
    } catch (error) {
      log.error('OfflineService', 'Error loading offline queue', error);
    }
  }

  /**
   * Save offline queue to storage
   */
  private async saveOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.offlineQueue));
    } catch (error) {
      log.error('OfflineService', 'Error saving offline queue', error);
    }
  }

  /**
   * Get last sync timestamp
   */
  public async getLastSyncTime(): Promise<number | null> {
    try {
      const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return lastSync ? parseInt(lastSync, 10) : null;
    } catch (error) {
      log.error('OfflineService', 'Error getting last sync time', error);
      return null;
    }
  }

  /**
   * Cache recipes for offline access
   */
  public async cacheRecipes(recipes: Recipe[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_RECIPES, JSON.stringify(recipes));
      log.info('OfflineService', 'Cached recipes for offline access', {
        recipeCount: recipes.length
      });
    } catch (error) {
      log.error('OfflineService', 'Error caching recipes', error);
    }
  }

  /**
   * Get cached recipes
   */
  public async getCachedRecipes(): Promise<Recipe[]> {
    try {
      const recipesData = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_RECIPES);
      if (recipesData) {
        const recipes = JSON.parse(recipesData);
        log.info('OfflineService', 'Loaded cached recipes', { recipeCount: recipes.length });
        return recipes;
      }
    } catch (error) {
      log.error('OfflineService', 'Error loading cached recipes', error);
    }
    return [];
  }

  /**
   * Cache user favorites for offline access
   */
  public async cacheFavorites(favorites: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_FAVORITES, JSON.stringify(favorites));
      log.debug('OfflineService', 'Cached favorites', { count: favorites.length });
    } catch (error) {
      log.error('OfflineService', 'Error caching favorites', error);
    }
  }

  /**
   * Get cached favorites
   */
  public async getCachedFavorites(): Promise<string[]> {
    try {
      const favoritesData = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_FAVORITES);
      if (favoritesData) {
        const favorites = JSON.parse(favoritesData);
        log.debug('OfflineService', 'Loaded cached favorites', { count: favorites.length });
        return favorites;
      }
    } catch (error) {
      log.error('OfflineService', 'Error loading cached favorites', error);
    }
    return [];
  }

  /**
   * Cache home bar for offline access
   */
  public async cacheHomeBar(homeBar: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_HOME_BAR, JSON.stringify(homeBar));
      log.debug('OfflineService', 'Cached home bar', { itemCount: homeBar.length });
    } catch (error) {
      log.error('OfflineService', 'Error caching home bar', error);
    }
  }

  /**
   * Get cached home bar
   */
  public async getCachedHomeBar(): Promise<any[]> {
    try {
      const homeBarData = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_HOME_BAR);
      if (homeBarData) {
        const homeBar = JSON.parse(homeBarData);
        log.debug('OfflineService', 'Loaded cached home bar', { itemCount: homeBar.length });
        return homeBar;
      }
    } catch (error) {
      log.error('OfflineService', 'Error loading cached home bar', error);
    }
    return [];
  }

  /**
   * Cleanup - remove network listener
   */
  public cleanup(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.listeners = [];
  }
}

// Export singleton instance
export const offlineService = OfflineService.getInstance();

/**
 * React hook for offline status
 */
export function useOffline() {
  const [isOffline, setIsOffline] = React.useState(!offlineService.isOnline());
  const [queueSize, setQueueSize] = React.useState(offlineService.getQueueSize());
  const [networkStatus, setNetworkStatus] = React.useState(offlineService.getNetworkStatus());

  React.useEffect(() => {
    // Subscribe to network status changes
    const unsubscribe = offlineService.addNetworkListener((status) => {
      setIsOffline(!status.isConnected || status.isInternetReachable === false);
      setNetworkStatus(status);
      setQueueSize(offlineService.getQueueSize());
    });

    // Set initial state
    setIsOffline(!offlineService.isOnline());
    setNetworkStatus(offlineService.getNetworkStatus());
    setQueueSize(offlineService.getQueueSize());

    return unsubscribe;
  }, []);

  return {
    isOffline,
    isOnline: !isOffline,
    queueSize,
    networkStatus,
    syncQueue: () => offlineService.syncOfflineQueue(),
  };
}
