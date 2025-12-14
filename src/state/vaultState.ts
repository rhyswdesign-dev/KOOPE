/**
 * VAULT & XP ECOSYSTEM - STATE MANAGEMENT
 *
 * This file contains:
 * - Helper functions for filtering and checking Vault items
 * - Logic for unlocking items with XP or Keys
 * - React hook for managing user Vault state
 *
 * TODO: In production, replace local state with backend API calls
 */

import { useState, useCallback, useMemo } from 'react';
import {
  VaultItem,
  VaultCategory,
  UserVaultState,
  UserTier,
} from '../config/vaultTypes';
import { vaultItems } from '../config/vaultData';
import { log } from '../lib/logger';

// ============================================================================
// HELPER: Filter items by category
// ============================================================================

export function getVaultItemsByCategory(
  items: VaultItem[],
  category: VaultCategory
): VaultItem[] {
  return items.filter((item) => item.category === category);
}

// ============================================================================
// HELPER: Get available items for user (respecting tier + time)
// ============================================================================

export function getAvailableVaultItemsForUser(
  items: VaultItem[],
  userState: UserVaultState,
  now: Date = new Date()
): VaultItem[] {
  return items.filter((item) => {
    // Check tier requirements
    if (item.requiresTier) {
      const tierOrder: UserTier[] = ['FREE', 'PLUS', 'PRO'];
      const userTierIndex = tierOrder.indexOf(userState.tier);
      const requiredTierIndex = tierOrder.indexOf(item.requiresTier);
      if (userTierIndex < requiredTierIndex) {
        return false; // User doesn't have required tier
      }
    }

    // Check time availability
    if (item.isLimitedTime) {
      if (item.availableFrom) {
        const fromDate = new Date(item.availableFrom);
        if (now < fromDate) return false; // Not yet available
      }
      if (item.availableUntil) {
        const untilDate = new Date(item.availableUntil);
        if (now > untilDate) return false; // Expired
      }
    }

    return true;
  });
}

// ============================================================================
// HELPER: Check if item is owned
// ============================================================================

export function isItemOwned(
  userState: UserVaultState,
  itemId: string
): boolean {
  return userState.ownedItemIds.includes(itemId);
}

// ============================================================================
// HELPER: Check if user can unlock with XP
// ============================================================================

export function canUnlockWithXP(
  userState: UserVaultState,
  item: VaultItem
): boolean {
  // Already owned?
  if (isItemOwned(userState, item.id)) return false;

  // Does unlock method support XP?
  const supportsXP =
    item.unlockMethod === 'XP_ONLY' ||
    item.unlockMethod === 'XP_OR_MONEY' ||
    item.unlockMethod === 'KEY_OR_XP';

  if (!supportsXP) return false;

  // Does item have XP cost defined?
  if (!item.xpCost) return false;

  // Does user have enough XP?
  if (userState.xp < item.xpCost) return false;

  return true;
}

// ============================================================================
// HELPER: Check if user can unlock with Key
// ============================================================================

export function canUnlockWithKey(
  userState: UserVaultState,
  item: VaultItem
): boolean {
  // Already owned?
  if (isItemOwned(userState, item.id)) return false;

  // Does unlock method support Keys?
  const supportsKey =
    item.unlockMethod === 'KEY_ONLY' ||
    item.unlockMethod === 'KEY_OR_XP' ||
    item.unlockMethod === 'KEY_OR_MONEY';

  if (!supportsKey) return false;

  // Does user have at least 1 key?
  if (userState.vaultKeys < 1) return false;

  return true;
}

// ============================================================================
// PURE FUNCTION: Unlock item with XP
// ============================================================================

export function unlockItemWithXP(
  userState: UserVaultState,
  item: VaultItem
): UserVaultState {
  if (!canUnlockWithXP(userState, item)) {
    throw new Error('Cannot unlock item with XP');
  }

  return {
    ...userState,
    xp: userState.xp - (item.xpCost || 0),
    ownedItemIds: [...userState.ownedItemIds, item.id],
  };
}

// ============================================================================
// PURE FUNCTION: Unlock item with Key
// ============================================================================

export function unlockItemWithKey(
  userState: UserVaultState,
  item: VaultItem
): UserVaultState {
  if (!canUnlockWithKey(userState, item)) {
    throw new Error('Cannot unlock item with Key');
  }

  return {
    ...userState,
    vaultKeys: userState.vaultKeys - 1,
    ownedItemIds: [...userState.ownedItemIds, item.id],
  };
}

// ============================================================================
// REACT HOOK: Manage Vault State
// ============================================================================

export function useVaultState() {
  // TODO: In production, fetch initial state from backend/async storage
  const [userState, setUserState] = useState<UserVaultState>({
    userId: 'mock_user_123',
    tier: 'PLUS', // Mock tier - can be FREE, PLUS, or PRO
    xp: 1800,     // Starting XP for testing
    vaultKeys: 2, // Starting keys for testing
    ownedItemIds: [], // Start with no owned items
  });

  // Get all vault items
  const allItems = useMemo(() => vaultItems, []);

  // Get items available to this user
  const availableItems = useMemo(
    () => getAvailableVaultItemsForUser(allItems, userState),
    [allItems, userState]
  );

  // Unlock with XP
  const unlockWithXP = useCallback(
    (itemId: string) => {
      const item = allItems.find((i) => i.id === itemId);
      if (!item) {
        throw new Error(`Item not found: ${itemId}`);
      }

      try {
        const newState = unlockItemWithXP(userState, item);
        setUserState(newState);
        return { success: true, newState };
      } catch (error) {
        log.error('vaultState', 'Failed to unlock with XP', error as Error, { itemId });
        return { success: false, error: error as Error };
      }
    },
    [userState, allItems]
  );

  // Unlock with Key
  const unlockWithKey = useCallback(
    (itemId: string) => {
      const item = allItems.find((i) => i.id === itemId);
      if (!item) {
        throw new Error(`Item not found: ${itemId}`);
      }

      try {
        const newState = unlockItemWithKey(userState, item);
        setUserState(newState);
        return { success: true, newState };
      } catch (error) {
        log.error('vaultState', 'Failed to unlock with Key', error as Error, { itemId });
        return { success: false, error: error as Error };
      }
    },
    [userState, allItems]
  );

  // Get items by category
  const getItemsByCategory = useCallback(
    (category: VaultCategory) => {
      const categoryItems = getVaultItemsByCategory(availableItems, category);
      return categoryItems;
    },
    [availableItems]
  );

  // Check if item is owned
  const checkIsOwned = useCallback(
    (itemId: string) => isItemOwned(userState, itemId),
    [userState]
  );

  // Check unlock capabilities
  const checkCanUnlockWithXP = useCallback(
    (item: VaultItem) => canUnlockWithXP(userState, item),
    [userState]
  );

  const checkCanUnlockWithKey = useCallback(
    (item: VaultItem) => canUnlockWithKey(userState, item),
    [userState]
  );

  return {
    userState,
    allItems,
    availableItems,
    unlockWithXP,
    unlockWithKey,
    getItemsByCategory,
    isOwned: checkIsOwned,
    canUnlockWithXP: checkCanUnlockWithXP,
    canUnlockWithKey: checkCanUnlockWithKey,
  };
}
