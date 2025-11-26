/**
 * USE OFFLINE HOOK
 * React hook for offline functionality
 * Provides network status and offline action queueing
 */

import { useState, useEffect } from 'react';
import { offlineService, NetworkStatus } from '../services/offlineService';

export interface UseOfflineResult {
  isOnline: boolean;
  isOffline: boolean;
  networkStatus: NetworkStatus;
  queueSize: number;
  addToQueue: (action: { type: string; data: any }) => Promise<void>;
  syncQueue: () => Promise<void>;
}

/**
 * Hook to access offline functionality
 *
 * @example
 * ```tsx
 * const { isOnline, isOffline, queueSize, addToQueue } = useOffline();
 *
 * const handleFavorite = async (recipeId: string) => {
 *   if (isOffline) {
 *     await addToQueue({ type: 'favorite', data: { recipeId } });
 *     showToast('Added to offline queue');
 *   } else {
 *     await favoriteRecipe(recipeId);
 *   }
 * };
 * ```
 */
export function useOffline(): UseOfflineResult {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(
    offlineService.getNetworkStatus()
  );
  const [queueSize, setQueueSize] = useState(offlineService.getQueueSize());

  useEffect(() => {
    // Subscribe to network status changes
    const unsubscribe = offlineService.addNetworkListener((status) => {
      setNetworkStatus(status);
      setQueueSize(offlineService.getQueueSize());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const addToQueue = async (action: { type: string; data: any }) => {
    await offlineService.addToQueue(action);
    setQueueSize(offlineService.getQueueSize());
  };

  const syncQueue = async () => {
    await offlineService.syncOfflineQueue();
    setQueueSize(offlineService.getQueueSize());
  };

  return {
    isOnline: offlineService.isOnline(),
    isOffline: offlineService.isOffline(),
    networkStatus,
    queueSize,
    addToQueue,
    syncQueue,
  };
}
