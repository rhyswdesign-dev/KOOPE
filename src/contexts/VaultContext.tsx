/**
 * VAULT CONTEXT
 * Manages XP + Keys economy state across the app
 */

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import {
  VaultItem,
  UserVaultProfile,
  MonetizationItem,
  VaultCart,
  VaultCartItem,
  VaultUnlockRequest,
  VaultPurchaseRequest
} from '../types/vault';
import vaultService from '../services/vaultService';
import { log } from '../lib/logger';
import {
  vaultItems,
  monetizationItems,
  mockUserVaultProfile,
  getActiveVaultItems,
  getFeaturedVaultItems,
  canUserUnlockItem 
} from '../data/vaultData';

interface VaultState {
  // User economy
  userProfile: UserVaultProfile;
  
  // Vault items
  vaultItems: VaultItem[];
  featuredItems: VaultItem[];
  
  // Monetization (Keys/Boosters)
  monetizationItems: MonetizationItem[];
  cart: VaultCart;
  
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
  | { type: 'UPDATE_KEYS_BALANCE'; payload: number }
  
  // Vault items actions
  | { type: 'SET_VAULT_ITEMS'; payload: VaultItem[] }
  | { type: 'UPDATE_ITEM_STOCK'; payload: { itemId: string; newStock: number } }
  
  // Monetization actions
  | { type: 'SET_MONETIZATION_ITEMS'; payload: MonetizationItem[] }
  | { type: 'ADD_TO_CART'; payload: VaultCartItem }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_CART_QUANTITY'; payload: { itemId: string; quantity: number } }
  | { type: 'CLEAR_CART' }
  | { type: 'CALCULATE_CART_TOTALS' }
  
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
  cart: {
    userId: 'user_12345',
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    updatedAt: new Date().toISOString()
  },
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
  
  // Monetization actions
  purchaseMonetizationItem: (request: VaultPurchaseRequest) => Promise<boolean>;
  addToCart: (itemId: string, quantity: number) => Promise<boolean>;
  removeFromCart: (itemId: string) => void;
  
  // XP earning (read-only - XP can only be earned, never purchased)
  awardXP: (amount: number, source: string) => Promise<boolean>;
  
  // Utility functions
  getCartItemCount: () => number;
  getCartTotal: () => number;
  refreshVaultData: () => Promise<void>;
}>({
  state: initialState,
  dispatch: () => {},
  unlockVaultItem: async () => false,
  canUnlockItem: () => ({ canUnlock: false }),
  purchaseMonetizationItem: async () => false,
  addToCart: async () => false,
  removeFromCart: () => {},
  awardXP: async () => false,
  getCartItemCount: () => 0,
  getCartTotal: () => 0,
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
          updatedAt: new Date().toISOString()
        }
      };
    
    case 'UPDATE_KEYS_BALANCE':
      return {
        ...state,
        userProfile: {
          ...state.userProfile,
          keysBalance: action.payload,
          updatedAt: new Date().toISOString()
        }
      };
    
    // Vault items
    case 'SET_VAULT_ITEMS':
      return {
        ...state,
        vaultItems: action.payload,
        featuredItems: getFeaturedVaultItems()
      };
    
    case 'UPDATE_ITEM_STOCK':
      return {
        ...state,
        vaultItems: state.vaultItems.map(item =>
          item.id === action.payload.itemId
            ? { ...item, currentStock: action.payload.newStock }
            : item
        )
      };
    
    // Monetization
    case 'SET_MONETIZATION_ITEMS':
      return { ...state, monetizationItems: action.payload };
    
    case 'ADD_TO_CART': {
      const existingItemIndex = state.cart.items.findIndex(
        item => item.monetizationItemId === action.payload.monetizationItemId
      );
      
      let updatedItems;
      if (existingItemIndex >= 0) {
        // Update existing item quantity
        updatedItems = [...state.cart.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + action.payload.quantity,
          totalPrice: (updatedItems[existingItemIndex].quantity + action.payload.quantity) * action.payload.unitPrice
        };
      } else {
        // Add new item
        updatedItems = [...state.cart.items, action.payload];
      }
      
      return {
        ...state,
        cart: {
          ...state.cart,
          items: updatedItems,
          updatedAt: new Date().toISOString()
        }
      };
    }
    
    case 'REMOVE_FROM_CART':
      return {
        ...state,
        cart: {
          ...state.cart,
          items: state.cart.items.filter(item => item.monetizationItemId !== action.payload),
          updatedAt: new Date().toISOString()
        }
      };
    
    case 'UPDATE_CART_QUANTITY':
      return {
        ...state,
        cart: {
          ...state.cart,
          items: state.cart.items.map(item =>
            item.monetizationItemId === action.payload.itemId
              ? { 
                  ...item, 
                  quantity: action.payload.quantity,
                  totalPrice: action.payload.quantity * item.unitPrice
                }
              : item
          ).filter(item => item.quantity > 0),
          updatedAt: new Date().toISOString()
        }
      };
    
    case 'CLEAR_CART':
      return {
        ...state,
        cart: {
          ...state.cart,
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0,
          updatedAt: new Date().toISOString()
        }
      };
    
    case 'CALCULATE_CART_TOTALS': {
      const subtotal = state.cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const tax = Math.round(subtotal * 0.08); // 8% tax
      const total = subtotal + tax;
      
      return {
        ...state,
        cart: {
          ...state.cart,
          subtotal,
          tax,
          total
        }
      };
    }
    
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
  
  // Auto-calculate cart totals when items change
  useEffect(() => {
    dispatch({ type: 'CALCULATE_CART_TOTALS' });
  }, [state.cart.items]);
  
  // Initialize vault data on mount
  useEffect(() => {
    refreshVaultData();
  }, []);
  
  // ================== VAULT UNLOCK FUNCTIONS ==================
  
  const unlockVaultItem = async (request: VaultUnlockRequest): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await vaultService.unlockVaultItem(request);
      
      if (response.success && response.transaction) {
        // Update user balances
        dispatch({ 
          type: 'UPDATE_XP_BALANCE', 
          payload: response.transaction.newXpBalance 
        });
        dispatch({ 
          type: 'UPDATE_KEYS_BALANCE', 
          payload: response.transaction.newKeysBalance 
        });
        
        // Update item stock
        dispatch({
          type: 'UPDATE_ITEM_STOCK',
          payload: {
            itemId: request.itemId,
            newStock: response.transaction.itemUnlocked.currentStock - 1
          }
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
  };
  
  const canUnlockItem = (item: VaultItem) => {
    return canUserUnlockItem(item, state.userProfile);
  };
  
  // ================== MONETIZATION FUNCTIONS ==================
  
  const purchaseMonetizationItem = async (request: VaultPurchaseRequest): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await vaultService.purchaseMonetizationItem(request);
      
      if (response.success && response.purchase) {
        // Update Keys balance
        dispatch({ 
          type: 'UPDATE_KEYS_BALANCE', 
          payload: response.purchase.newKeysBalance 
        });
        
        // Clear cart if purchase was from cart
        dispatch({ type: 'CLEAR_CART' });
        
        // Close purchase modal
        dispatch({ type: 'SHOW_PURCHASE_MODAL', payload: false });
        
        return true;
      }
      
      return false;
    } catch (error) {
      log.error('VaultContext', 'Purchase failed', error);
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };
  
  const addToCart = async (itemId: string, quantity: number): Promise<boolean> => {
    try {
      const item = monetizationItems.find(item => item.id === itemId);
      if (!item || !item.inStock) {
        return false;
      }
      
      const cartItem: VaultCartItem = {
        monetizationItemId: itemId,
        quantity,
        unitPrice: item.price,
        totalPrice: quantity * item.price
      };
      
      dispatch({ type: 'ADD_TO_CART', payload: cartItem });
      
      // Also add to backend cart
      await vaultService.addToVaultCart(state.userProfile.userId, itemId, quantity);
      
      return true;
    } catch (error) {
      log.error('VaultContext', 'Add to cart failed', error);
      return false;
    }
  };

  const removeFromCart = (itemId: string) => {
    dispatch({ type: 'REMOVE_FROM_CART', payload: itemId });
  };

  // ================== XP EARNING ==================

  const awardXP = async (amount: number, source: string): Promise<boolean> => {
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
          payload: state.userProfile.xpBalance + finalAmount
        });
      }

      return success;
    } catch (error) {
      log.error('VaultContext', 'Award XP failed', error, { amount, source });
      return false;
    }
  };
  
  // ================== UTILITY FUNCTIONS ==================
  
  const getCartItemCount = (): number => {
    return state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
  };
  
  const getCartTotal = (): number => {
    return state.cart.total;
  };
  
  const refreshVaultData = async (): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      // Load vault items
      const activeItems = getActiveVaultItems();
      dispatch({ type: 'SET_VAULT_ITEMS', payload: activeItems });
      
      // Load monetization items
      dispatch({ type: 'SET_MONETIZATION_ITEMS', payload: monetizationItems });
      
      // Refresh user profile
      const userProfile = await vaultService.getUserVaultProfile(state.userProfile.userId);
      if (userProfile) {
        dispatch({ type: 'SET_USER_PROFILE', payload: userProfile });
      }


    } catch (error) {
      log.error('VaultContext', 'Failed to refresh vault data', error);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };
  
  return (
    <VaultContext.Provider value={{
      state,
      dispatch,
      unlockVaultItem,
      canUnlockItem,
      purchaseMonetizationItem,
      addToCart,
      removeFromCart,
      awardXP,
      getCartItemCount,
      getCartTotal,
      refreshVaultData,
    }}>
      {children}
    </VaultContext.Provider>
  );
}

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};