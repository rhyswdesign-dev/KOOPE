/**
 * useRecipeImports Hook
 * Tracks recipe imports with monthly limits for FREE tier users
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from '../contexts/SubscriptionContext';
import { log } from '../lib/logger';

const STORAGE_KEY = '@recipe_imports';
const FREE_IMPORT_LIMIT = 3;

interface ImportRecord {
  url: string;
  recipeId: string;
  date: string;
  platform: string;
}

interface ImportTracking {
  imports: ImportRecord[];
  lastResetMonth: string; // Format: "YYYY-MM"
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function useRecipeImports() {
  const { isKoopePlus, isKoopePro } = useSubscription();
  const [tracking, setTracking] = useState<ImportTracking>({
    imports: [],
    lastResetMonth: getCurrentMonth(),
  });
  const [isLoading, setIsLoading] = useState(true);

  const isPremium = isKoopePlus || isKoopePro;

  // Load tracking data from storage
  useEffect(() => {
    loadTracking();
  }, []);

  const loadTracking = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: ImportTracking = JSON.parse(stored);
        const currentMonth = getCurrentMonth();

        // Reset if it's a new month
        if (parsed.lastResetMonth !== currentMonth) {
          const newTracking: ImportTracking = {
            imports: [],
            lastResetMonth: currentMonth,
          };
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTracking));
          setTracking(newTracking);
          log.info('useRecipeImports', 'Monthly import count reset', { month: currentMonth });
        } else {
          setTracking(parsed);
        }
      }
    } catch (error) {
      log.error('useRecipeImports', 'Failed to load import tracking', error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTracking = async (newTracking: ImportTracking) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTracking));
      setTracking(newTracking);
    } catch (error) {
      log.error('useRecipeImports', 'Failed to save import tracking', error as Error);
    }
  };

  /**
   * Get the number of imports this month
   */
  const getMonthlyImportCount = useCallback((): number => {
    const currentMonth = getCurrentMonth();
    if (tracking.lastResetMonth !== currentMonth) {
      return 0;
    }
    return tracking.imports.length;
  }, [tracking]);

  /**
   * Check if user can import another recipe
   */
  const canImport = useCallback((): boolean => {
    // Premium users have unlimited imports
    if (isPremium) {
      return true;
    }

    return getMonthlyImportCount() < FREE_IMPORT_LIMIT;
  }, [isPremium, getMonthlyImportCount]);

  /**
   * Get remaining imports for FREE tier
   */
  const getRemainingImports = useCallback((): number => {
    if (isPremium) {
      return Infinity;
    }
    return Math.max(0, FREE_IMPORT_LIMIT - getMonthlyImportCount());
  }, [isPremium, getMonthlyImportCount]);

  /**
   * Record a successful import
   */
  const recordImport = useCallback(async (
    url: string,
    recipeId: string,
    platform: string
  ): Promise<void> => {
    const currentMonth = getCurrentMonth();
    const newImport: ImportRecord = {
      url,
      recipeId,
      date: new Date().toISOString(),
      platform,
    };

    let newTracking: ImportTracking;

    // Reset if new month
    if (tracking.lastResetMonth !== currentMonth) {
      newTracking = {
        imports: [newImport],
        lastResetMonth: currentMonth,
      };
    } else {
      newTracking = {
        ...tracking,
        imports: [...tracking.imports, newImport],
      };
    }

    await saveTracking(newTracking);
    log.info('useRecipeImports', 'Import recorded', {
      url,
      recipeId,
      monthlyCount: newTracking.imports.length,
    });
  }, [tracking]);

  /**
   * Get import history
   */
  const getImportHistory = useCallback((): ImportRecord[] => {
    return tracking.imports;
  }, [tracking]);

  /**
   * Check if a URL has already been imported
   */
  const hasImportedUrl = useCallback((url: string): boolean => {
    return tracking.imports.some(record => record.url === url);
  }, [tracking]);

  return {
    canImport,
    recordImport,
    getRemainingImports,
    getMonthlyImportCount,
    getImportHistory,
    hasImportedUrl,
    isLoading,
    isPremium,
    FREE_IMPORT_LIMIT,
  };
}
