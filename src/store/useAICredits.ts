/**
 * AI CREDITS STORE
 * Manages AI usage credits, limits, and purchases
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../lib/logger';
import { getIAPService, getXPForProduct } from '../services/iap';

export interface AIAction {
  id: string;
  type: 'recipe_generation' | 'recommendation' | 'search_enhancement' | 'image_analysis' | 'ocr_processing';
  cost: number;
  timestamp: number;
  userQuery?: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // in USD
  popular?: boolean;
  bonus?: number; // bonus credits
}

export interface AICreditsState {
  // Credits
  credits: number;
  totalEarned: number;
  totalSpent: number;

  // Usage tracking
  dailyUsage: number;
  monthlyUsage: number;
  lastResetDate: string;
  usageHistory: AIAction[];

  // Limits
  dailyLimit: number;
  freeCreditsPerDay: number;
  maxHistoryEntries: number;

  // Premium features
  isPremium: boolean;
  premiumExpiry?: number;

  // Actions
  canUseAI: (actionType: AIAction['type']) => boolean;
  consumeCredits: (action: Omit<AIAction, 'id' | 'timestamp'>) => boolean;
  addCredits: (amount: number, source: 'purchase' | 'daily_bonus' | 'reward' | 'promotion') => void;
  resetDailyUsage: () => void;
  getUsageStats: () => {
    today: number;
    thisMonth: number;
    averageDaily: number;
    totalActions: number;
  };
  purchaseCredits: (packageId: string) => Promise<boolean>;

  // Credit costs for different actions
  getActionCost: (actionType: AIAction['type']) => number;
}

// Default credit costs (can be adjusted based on actual OpenAI costs)
const ACTION_COSTS: Record<AIAction['type'], number> = {
  recipe_generation: 3,      // ~$0.01-0.03 - most expensive
  recommendation: 2,         // ~$0.005-0.02 - medium cost
  search_enhancement: 1,     // ~$0.001-0.01 - lightweight
  image_analysis: 5,         // ~$0.02-0.05 - vision model
  ocr_processing: 2,         // ~$0.001-0.01 - text extraction
};

// Available credit packages
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 50,
    price: 2.99,
  },
  {
    id: 'popular',
    name: 'Popular Pack',
    credits: 150,
    price: 6.99,
    popular: true,
    bonus: 25, // 25 bonus credits
  },
  {
    id: 'power_user',
    name: 'Power User',
    credits: 400,
    price: 14.99,
    bonus: 100, // 100 bonus credits
  },
  {
    id: 'unlimited_monthly',
    name: 'Unlimited Monthly',
    credits: 999999, // Effectively unlimited
    price: 19.99,
  },
];

export const useAICredits = create<AICreditsState>()(
  persist(
    (set, get) => ({
      // Initial state
      credits: 10, // Start with 10 free credits
      totalEarned: 10,
      totalSpent: 0,
      dailyUsage: 0,
      monthlyUsage: 0,
      lastResetDate: new Date().toDateString(),
      usageHistory: [],
      dailyLimit: 25, // Free users: 25 AI actions per day
      freeCreditsPerDay: 5, // Give 5 free credits daily
      maxHistoryEntries: 100,
      isPremium: false,

      // Check if user can use AI
      canUseAI: (actionType) => {
        const state = get();
        const cost = state.getActionCost(actionType);

        // Check if it's a new day and reset daily usage
        const today = new Date().toDateString();
        if (state.lastResetDate !== today) {
          state.resetDailyUsage();
        }

        // Premium users have higher limits
        const effectiveDailyLimit = state.isPremium ? 100 : state.dailyLimit;

        // Check daily limit
        if (state.dailyUsage >= effectiveDailyLimit) {
          return false;
        }

        // Check if user has enough credits
        return state.credits >= cost;
      },

      // Consume credits for an AI action
      consumeCredits: (action) => {
        const state = get();
        const cost = state.getActionCost(action.type);

        if (!state.canUseAI(action.type)) {
          log.warn('AICredits', 'Insufficient credits or daily limit reached', {
            actionType: action.type,
            cost,
            availableCredits: state.credits,
            dailyUsage: state.dailyUsage
          });
          return false;
        }

        const newAction: AIAction = {
          ...action,
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
          cost,
        };

        set((state) => {
          const newHistory = [newAction, ...state.usageHistory].slice(0, state.maxHistoryEntries);

          return {
            credits: state.credits - cost,
            totalSpent: state.totalSpent + cost,
            dailyUsage: state.dailyUsage + 1,
            monthlyUsage: state.monthlyUsage + 1,
            usageHistory: newHistory,
          };
        });

        log.state('AICredits', 'consumeCredits', {
          actionType: action.type,
          cost,
          remainingCredits: get().credits,
          dailyUsage: get().dailyUsage
        });

        return true;
      },

      // Add credits to user account
      addCredits: (amount, source) => {
        set((state) => ({
          credits: state.credits + amount,
          totalEarned: state.totalEarned + amount,
        }));

        log.state('AICredits', 'addCredits', {
          amount,
          source,
          newTotal: get().credits
        });
      },

      // Reset daily usage (called automatically)
      resetDailyUsage: () => {
        const today = new Date().toDateString();
        const state = get();

        set({
          dailyUsage: 0,
          lastResetDate: today,
          // Give daily free credits
          credits: state.credits + state.freeCreditsPerDay,
          totalEarned: state.totalEarned + state.freeCreditsPerDay,
        });

        log.info('AICredits', 'Daily usage reset', {
          date: today,
          freeCreditsAdded: state.freeCreditsPerDay,
          newTotal: get().credits
        });
      },

      // Get usage statistics
      getUsageStats: () => {
        const state = get();
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

        const todayActions = state.usageHistory.filter(action => action.timestamp > oneDayAgo);
        const monthActions = state.usageHistory.filter(action => action.timestamp > oneMonthAgo);

        return {
          today: todayActions.length,
          thisMonth: monthActions.length,
          averageDaily: monthActions.length / 30,
          totalActions: state.usageHistory.length,
        };
      },

      // Get cost for action type
      getActionCost: (actionType) => {
        return ACTION_COSTS[actionType] || 1;
      },

      // Purchase credits via IAP
      purchaseCredits: async (packageId) => {
        const package_ = CREDIT_PACKAGES.find(p => p.id === packageId);
        if (!package_) {
          log.warn('AICredits', 'Invalid package ID', { packageId });
          return false;
        }

        log.fn('AICredits', 'purchaseCredits', { packageId, package: package_.name });

        try {
          const iapService = getIAPService();

          // Map credit package ID to IAP product ID
          const productId = `ai_credits_${packageId}`;
          log.info('AICredits', `Initiating purchase: ${package_.name}`, { productId, price: package_.price });

          // Purchase via IAP service
          const purchase = await iapService.purchaseProduct(productId);

          // Add credits + bonus
          const totalCredits = package_.credits + (package_.bonus || 0);

          if (packageId === 'unlimited_monthly') {
            // Special handling for unlimited plan
            const expiryDate = new Date();
            expiryDate.setMonth(expiryDate.getMonth() + 1);

            set((state) => ({
              isPremium: true,
              premiumExpiry: expiryDate.getTime(),
              credits: Math.max(state.credits, 999), // Ensure high credit count
            }));

            log.info('AICredits', 'Unlimited monthly subscription activated', { expiryDate: expiryDate.toISOString() });
          } else {
            set((state) => ({
              credits: state.credits + totalCredits,
              totalEarned: state.totalEarned + totalCredits,
            }));

            log.info('AICredits', 'Credits added successfully', {
              package: package_.name,
              baseCredits: package_.credits,
              bonus: package_.bonus || 0,
              total: totalCredits
            });
          }

          // Finish the transaction
          await iapService.finishTransaction(purchase.transactionId);

          log.state('AICredits', 'purchaseCredits', { success: true, packageId, transactionId: purchase.transactionId });
          return true;
        } catch (error) {
          log.error('AICredits', 'Credit purchase failed', error, { packageId });
          return false;
        }
      },
    }),
    {
      name: 'ai-credits-storage',
      storage: {
        getItem: async (name) => {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      },
    }
  )
);