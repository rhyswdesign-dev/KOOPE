/**
 * OFFLINE SERVICE
 * Manages offline state detection, data persistence, and sync queue
 * Ensures app works seamlessly even without internet connectivity
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Recipe } from '../types/recipe';

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
        console.log('📡 Connection restored, syncing offline queue...');
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

    console.log(`📥 Added action to offline queue: ${action.type}`);
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
      console.log('⚠️ Cannot sync: device is offline');
      return;
    }

    this.isSyncing = true;
    console.log(`🔄 Syncing ${this.offlineQueue.length} offline actions...`);

    const failedActions: OfflineAction[] = [];

    for (const action of this.offlineQueue) {
      try {
        await this.executeAction(action);
        console.log(`✅ Synced action: ${action.type}`);
      } catch (error) {
        console.error(`❌ Failed to sync action: ${action.type}`, error);

        // Retry up to 3 times
        if (action.retryCount < 3) {
          failedActions.push({
            ...action,
            retryCount: action.retryCount + 1,
          });
        } else {
          console.error(`🚫 Action failed after 3 retries, discarding: ${action.type}`);
        }
      }
    }

    // Update queue with failed actions
    this.offlineQueue = failedActions;
    await this.saveOfflineQueue();

    // Update last sync timestamp
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());

    this.isSyncing = false;
    console.log(`✅ Sync complete. ${failedActions.length} actions remaining in queue`);
  }

  /**
   * Execute a queued action
   */
  private async executeAction(action: OfflineAction): Promise<void> {
    // This will be implemented based on your specific API calls
    // For now, just a placeholder that simulates the action
    switch (action.type) {
      case 'favorite':
        console.log(`Executing favorite: ${action.data.recipeId}`);
        // TODO: Call actual API to favorite recipe
        break;
      case 'unfavorite':
        console.log(`Executing unfavorite: ${action.data.recipeId}`);
        // TODO: Call actual API to unfavorite recipe
        break;
      case 'add_to_bar':
        console.log(`Executing add to bar: ${action.data.ingredientId}`);
        // TODO: Call actual API to add to home bar
        break;
      case 'remove_from_bar':
        console.log(`Executing remove from bar: ${action.data.ingredientId}`);
        // TODO: Call actual API to remove from home bar
        break;
      case 'create_recipe':
        console.log(`Executing create recipe: ${action.data.recipe.title}`);
        // TODO: Call actual API to create recipe
        break;
      case 'update_recipe':
        console.log(`Executing update recipe: ${action.data.recipeId}`);
        // TODO: Call actual API to update recipe
        break;
      default:
        console.warn(`Unknown action type: ${(action as any).type}`);
    }
  }

  /**
   * Load offline queue from storage
   */
  private async loadOfflineQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      if (queueData) {
        this.offlineQueue = JSON.parse(queueData);
        console.log(`📦 Loaded ${this.offlineQueue.length} offline actions from storage`);
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
    }
  }

  /**
   * Save offline queue to storage
   */
  private async saveOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
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
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  /**
   * Cache recipes for offline access
   */
  public async cacheRecipes(recipes: Recipe[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_RECIPES, JSON.stringify(recipes));
      console.log(`💾 Cached ${recipes.length} recipes for offline access`);
    } catch (error) {
      console.error('Error caching recipes:', error);
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
        console.log(`📦 Loaded ${recipes.length} cached recipes`);
        return recipes;
      }
    } catch (error) {
      console.error('Error loading cached recipes:', error);
    }
    return [];
  }

  /**
   * Cache user favorites for offline access
   */
  public async cacheFavorites(favorites: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_FAVORITES, JSON.stringify(favorites));
    } catch (error) {
      console.error('Error caching favorites:', error);
    }
  }

  /**
   * Get cached favorites
   */
  public async getCachedFavorites(): Promise<string[]> {
    try {
      const favoritesData = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_FAVORITES);
      if (favoritesData) {
        return JSON.parse(favoritesData);
      }
    } catch (error) {
      console.error('Error loading cached favorites:', error);
    }
    return [];
  }

  /**
   * Cache home bar for offline access
   */
  public async cacheHomeBar(homeBar: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_HOME_BAR, JSON.stringify(homeBar));
    } catch (error) {
      console.error('Error caching home bar:', error);
    }
  }

  /**
   * Get cached home bar
   */
  public async getCachedHomeBar(): Promise<any[]> {
    try {
      const homeBarData = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_HOME_BAR);
      if (homeBarData) {
        return JSON.parse(homeBarData);
      }
    } catch (error) {
      console.error('Error loading cached home bar:', error);
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
