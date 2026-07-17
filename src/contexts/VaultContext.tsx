/**
 * VAULT CONTEXT
 * Manages XP economy state across the app
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  ReactNode,
} from 'react';
import { VaultItem, UserVaultProfile, MonetizationItem, VaultUnlockRequest } from '../types/vault';
import vaultService from '../services/vaultService';
import { log } from '../lib/logger';
import {
  monetizationItems,
  mockUserVaultProfile,
  getActiveVaultItems,
  getFeaturedVaultItems,
  canUserUnlockItem,
} from '../data/vaultData';
import { useAuth } from './AuthContext';

interface VaultState {
  // User economy
  userProfile: UserVaultProfile;

  // Vault items
  vaultItems: VaultItem[];
  featuredItems: VaultItem[];

  // Monetization (Boosters)
  monetizationItems: MonetizationItem[];

  // UI state
  isLoading: boolean;
  selectedItem: VaultItem | null;
  showUnlockModal: boolean;
  showPurchaseModal: boolean;
}

type VaultAction =
  // User profile actions
  | { type: 'SET_USER_PROFILE'; payload: UserVaultProfile }
  | { type: 'UPDATE_XP_BALANCE'; payload: number }

  // Vault items actions
  | { type: 'SET_VAULT_ITEMS'; payload: VaultItem[] }
  | { type: 'UPDATE_ITEM_STOCK'; payload: { itemId: string; newStock: number } }

  // Monetization actions
  | { type: 'SET_MONETIZATION_ITEMS'; payload: MonetizationItem[] }

  // UI actions
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SELECTED_ITEM'; payload: VaultItem | null }
  | { type: 'SHOW_UNLOCK_MODAL'; payload: boolean }
  | { type: 'SHOW_PURCHASE_MODAL'; payload: boolean };

const initialState: VaultState = {
  userProfile: mockUserVaultProfile,
  vaultItems: [],
  featuredItems: [],
  monetizationItems: [],
  isLoading: false,
  selectedItem: null,
  showUnlockModal: false,
  showPurchaseModal: false,
};

const VaultContext = createContext<{
  state: VaultState;
  dispatch: React.Dispatch<VaultAction>;

  // Vault unlock actions
  unlockVaultItem: (request: VaultUnlockRequest) => Promise<boolean>;
  canUnlockItem: (item: VaultItem) => { canUnlock: boolean; reason?: string };

  // XP earning (read-only - XP can only be earned, never purchased)
  awardXP: (amount: number, source: string) => Promise<boolean>;

  // Utility functions
  refreshVaultData: () => Promise<void>;
}>({
  state: initialState,
  dispatch: () => {},
  unlockVaultItem: async () => false,
  canUnlockItem: () => ({ canUnlock: false }),
  awardXP: async () => false,
  refreshVaultData: async () => {},
});

function vaultReducer(state: VaultState, action: VaultAction): VaultState {
  switch (action.type) {
    // User profile updates
    case 'SET_USER_PROFILE':
      return { ...state, userProfile: action.payload };

    case 'UPDATE_XP_BALANCE':
      return {
        ...state,
        userProfile: {
          ...state.userProfile,
          xpBalance: action.payload,
          updatedAt: new Date().toISOString(),
        },
      };

    // Vault items
    case 'SET_VAULT_ITEMS':
      return {
        ...state,
        vaultItems: action.payload,
        featuredItems: getFeaturedVaultItems(),
      };

    case 'UPDATE_ITEM_STOCK':
      return {
        ...state,
        vaultItems: state.vaultItems.map((item) =>
          item.id === action.payload.itemId
            ? { ...item, currentStock: action.payload.newStock }
            : item,
        ),
      };

    // Monetization
    case 'SET_MONETIZATION_ITEMS':
      return { ...state, monetizationItems: action.payload };

    // UI state
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_SELECTED_ITEM':
      return { ...state, selectedItem: action.payload };

    case 'SHOW_UNLOCK_MODAL':
      return { ...state, showUnlockModal: action.payload };

    case 'SHOW_PURCHASE_MODAL':
      return { ...state, showPurchaseModal: action.payload };

    default:
      return state;
  }
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(vaultReducer, initialState);
  const { user } = useAuth();

  // Initialize vault data when user is available
  useEffect(() => {
    if (user?.id) {
      // Update cart userId with actual user ID
      dispatch({
        type: 'SET_USER_PROFILE',
        payload: {
          ...state.userProfile,
          userId: user.id,
        },
      });
      refreshVaultData();
    }
  }, [user?.id]);

  // ================== VAULT UNLOCK FUNCTIONS ==================

  const unlockVaultItem = useCallback(async (request: VaultUnlockRequest): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await vaultService.unlockVaultItem(request);

      if (response.success && response.transaction) {
        // Update XP balance
        dispatch({
          type: 'UPDATE_XP_BALANCE',
          payload: response.transaction.newXpBalance,
        });

        // Update item stock
        dispatch({
          type: 'UPDATE_ITEM_STOCK',
          payload: {
            itemId: request.itemId,
            newStock: response.transaction.itemUnlocked.currentStock - 1,
          },
        });

        // Close unlock modal
        dispatch({ type: 'SHOW_UNLOCK_MODAL', payload: false });
        dispatch({ type: 'SET_SELECTED_ITEM', payload: null });

        return true;
      }

      return false;
    } catch (error) {
      log.error('VaultContext', 'Unlock failed', error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const canUnlockItem = useCallback(
    (item: VaultItem) => {
      return canUserUnlockItem(item, state.userProfile);
    },
    [state.userProfile],
  );

  // ================== XP EARNING ==================

  const awardXP = useCallback(
    async (amount: number, source: string): Promise<boolean> => {
      try {
        const success = await vaultService.awardXP(state.userProfile.userId, amount, source);

        if (success) {
          // Update local XP balance (accounting for any booster multipliers)
          let finalAmount = amount;
          if (state.userProfile.activeBooster?.type === 'xp_multiplier') {
            const multiplier = state.userProfile.activeBooster.multiplier || 1;
            finalAmount = Math.floor(amount * multiplier);
          }

          dispatch({
            type: 'UPDATE_XP_BALANCE',
            payload: state.userProfile.xpBalance + finalAmount,
          });
        }

        return success;
      } catch (error) {
        log.error('VaultContext', 'Award XP failed', error, { amount, source });
        return false;
      }
    },
    [state.userProfile],
  );

  // ================== UTILITY FUNCTIONS ==================

  const refreshVaultData = useCallback(async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      // Load vault items
      const activeItems = getActiveVaultItems();
      dispatch({ type: 'SET_VAULT_ITEMS', payload: activeItems });

      // Load monetization items
      dispatch({ type: 'SET_MONETIZATION_ITEMS', payload: monetizationItems });

      // Refresh user profile only if we have a valid user ID
      const userId = user?.id || state.userProfile.userId;
      if (userId && userId !== 'user_12345') {
        const userProfile = await vaultService.getUserVaultProfile(userId);
        if (userProfile) {
          dispatch({ type: 'SET_USER_PROFILE', payload: userProfile });
        }
      }
    } catch (error) {
      log.error('VaultContext', 'Failed to refresh vault data', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user?.id, state.userProfile.userId]);

  // Phase 0.9 guardrail: memoize the context value so consumers don't
  // re-render on every VaultProvider render when nothing they read changed.
  // `dispatch` from useReducer is already stable across renders.
  const value = useMemo(
    () => ({
      state,
      dispatch,
      unlockVaultItem,
      canUnlockItem,
      awardXP,
      refreshVaultData,
    }),
    [state, unlockVaultItem, canUnlockItem, awardXP, refreshVaultData],
  );

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
