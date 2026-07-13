/**
 * VAULT SERVICE
 * Handles all XP economy transactions and Stripe integration
 */

import {
  VaultItem,
  VaultUnlockRequest,
  VaultUnlockResponse,
  VaultUnlockError,
  UserVaultProfile,
  MonetizationItem,
  UnlockedVaultItem
} from '../types/vault';
import { Platform } from 'react-native';

// Supabase repository imports
import { VaultRepository } from '../repos/supabase/vaultRepo';
import * as vaultTransactionRepo from '../repos/supabase/vaultTransactionRepo';
import { log } from '../lib/logger';

// Stripe imports
import { createPaymentIntent } from '../lib/stripeApi';

class VaultService {
  
  // ================== VAULT UNLOCK FLOW ==================
  
  /**
   * Unlocks a vault item by deducting XP from user profile
   * This is the core transaction of the Vault economy
   */
  async unlockVaultItem(request: VaultUnlockRequest): Promise<VaultUnlockResponse> {
    try {
      if (Platform.OS === 'ios' && request.useDiscountOption) {
        log.warn('VaultService', 'Blocked cash discount unlock on iOS for App Store compliance', {
          itemId: request.itemId,
          userId: request.userId,
        });
        return {
          success: false,
          error: 'payment_failed',
        };
      }

      // 1. Validate user exists and get current profile
      const userProfile = await this.getUserVaultProfile(request.userId);
      if (!userProfile) {
        return {
          success: false,
          error: 'user_not_found'
        };
      }

      // 2. Get and validate vault item
      const item = await this.getVaultItem(request.itemId);
      if (!item) {
        return {
          success: false,
          error: 'item_not_found'
        };
      }

      // 3. Check if item is available and user can afford it
      const validation = await this.validateUnlockRequest(item, userProfile, request.useDiscountOption);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error
        };
      }

      // 4. Calculate costs based on discount option
      const costs = this.calculateUnlockCosts(item, request.useDiscountOption);

      // 5. Process Stripe payment if using discount option
      let stripePaymentIntentId: string | undefined;
      if (request.useDiscountOption && costs.cashCost > 0) {
        const paymentResult = await this.processStripePayment(costs.cashCost, request.userId);
        if (!paymentResult.success) {
          return {
            success: false,
            error: 'payment_failed'
          };
        }
        stripePaymentIntentId = paymentResult.paymentIntentId;
      }

      // 6. Execute the unlock transaction (atomic in real implementation)
      const transactionId = await this.executeUnlockTransaction({
        userId: request.userId,
        itemId: request.itemId,
        xpCost: costs.xpCost,
        cashCost: costs.cashCost,
        stripePaymentIntentId,
        shippingAddress: request.shippingAddress
      });

      // 7. Update item stock
      await this.decrementItemStock(request.itemId);

      // 8. Return success response
      const updatedProfile = await this.getUserVaultProfile(request.userId);
      return {
        success: true,
        transaction: {
          transactionId,
          xpSpent: costs.xpCost,
          cashCharged: costs.cashCost,
          itemUnlocked: item,
          newXpBalance: updatedProfile!.xpBalance,
        }
      };

    } catch (error) {
      log.error('VaultService', 'Vault unlock failed', error, { userId: request.userId, itemId: request.itemId });
      return {
        success: false,
        error: 'item_not_found' // Generic error for security
      };
    }
  }

  /**
   * Validates if a user can unlock a specific item
   */
  private async validateUnlockRequest(
    item: VaultItem,
    userProfile: UserVaultProfile,
    useDiscountOption: boolean
  ): Promise<{ success: boolean; error?: VaultUnlockError }> {
    
    // Check if item is active
    if (!item.isActive) {
      return { success: false, error: 'item_not_active' };
    }

    // Check stock availability
    if (item.currentStock <= 0) {
      return { success: false, error: 'item_out_of_stock' };
    }

    // Check if cycle is still active
    if (!(await this.isCycleActive(item.cycleId))) {
      return { success: false, error: 'cycle_expired' };
    }

    // Check if user already unlocked this item
    const alreadyUnlocked = userProfile.unlockedItems.some(
      unlocked => unlocked.itemId === item.id
    );
    if (alreadyUnlocked) {
      return { success: false, error: 'item_not_found' }; // Don't reveal they already own it
    }

    // Calculate required resources based on discount option
    const costs = this.calculateUnlockCosts(item, useDiscountOption);

    // Check XP balance
    if (userProfile.xpBalance < costs.xpCost) {
      return { success: false, error: 'insufficient_xp' };
    }

    return { success: true };
  }

  /**
   * Calculates XP cost based on discount option
   */
  private calculateUnlockCosts(item: VaultItem, useDiscountOption: boolean): {
    xpCost: number;
    cashCost: number;
  } {
    if (useDiscountOption && item.discountOption) {
      return {
        xpCost: item.discountOption.reducedXP,
        cashCost: item.discountOption.cashPrice
      };
    }

    return {
      xpCost: item.xpCost,
      cashCost: 0
    };
  }

  /**
   * Executes the actual unlock transaction (should be atomic in real implementation)
   */
  private async executeUnlockTransaction(params: {
    userId: string;
    itemId: string;
    xpCost: number;
    cashCost: number;
    stripePaymentIntentId?: string;
    shippingAddress?: any;
  }): Promise<string> {

    // 1. Deduct XP from user profile using Supabase
    await vaultTransactionRepo.updateVaultBalances(
      params.userId,
      -params.xpCost,   // Negative to deduct
      0                 // No cash balance change
    );

    // 2. Add to user's unlocked items
    const unlockedItem: UnlockedVaultItem = {
      itemId: params.itemId,
      itemName: '', // Would be populated from item data
      unlockedAt: new Date().toISOString(),
      cycleId: '', // Would be populated from item data
      xpSpent: params.xpCost,
      cashSpent: params.cashCost > 0 ? params.cashCost : undefined,
      fulfillmentStatus: 'pending',
      shippingAddress: params.shippingAddress
    };

    await vaultTransactionRepo.addUnlockedItem(params.userId, unlockedItem);

    // 3. Log transaction for analytics and order history
    const transactionId = await vaultTransactionRepo.logVaultTransaction({
      userId: params.userId,
      transactionType: 'unlock',
      itemId: params.itemId,
      xpCost: params.xpCost,
      cashCost: params.cashCost,
      stripePaymentIntentId: params.stripePaymentIntentId,
      shippingAddress: params.shippingAddress
    });

    return transactionId;
  }

  // ================== STRIPE INTEGRATION ==================

  /**
   * Processes Stripe payment for real money transactions
   * Note: This returns the payment intent details for client-side confirmation
   * The actual confirmation should be done in the UI component using useStripe() hook
   */
  async createStripePayment(
    amountInCents: number,
    userId: string,
    metadata?: Record<string, string>
  ): Promise<{
    success: boolean;
    clientSecret?: string;
    paymentIntentId?: string;
    error?: string;
  }> {

    try {
      // Call backend API to create payment intent
      const paymentIntent = await createPaymentIntent({
        amount: amountInCents,
        userId,
        metadata,
      });

      if (!paymentIntent) {
        return {
          success: false,
          error: 'Failed to create payment intent'
        };
      }

      log.info('VaultService', 'Payment intent created', {
        paymentIntentId: paymentIntent.paymentIntentId,
        amount: amountInCents,
      });

      return {
        success: true,
        clientSecret: paymentIntent.clientSecret,
        paymentIntentId: paymentIntent.paymentIntentId,
      };

    } catch (error) {
      log.error('VaultService', 'Stripe payment failed', error, { amountInCents, userId });
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use createStripePayment instead and confirm in UI with useStripe() hook
   */
  private async processStripePayment(
    amountInCents: number,
    userId: string,
    paymentMethodId?: string
  ): Promise<{
    success: boolean;
    paymentIntentId?: string;
    error?: string;
  }> {
    // Mock successful payment for backward compatibility
    // This should be removed once all code uses createStripePayment
    log.warn('VaultService', 'Using deprecated processStripePayment - use createStripePayment instead');

    return {
      success: true,
      paymentIntentId: `pi_mock_${Date.now()}`
    };
  }

  // ================== DATA ACCESS METHODS ==================

  /**
   * Gets user's vault profile with XP balance
   */
  async getUserVaultProfile(userId: string): Promise<UserVaultProfile | null> {
    try {
      // Try to get existing profile from Supabase
      let profile = await vaultTransactionRepo.getUserVaultProfile(userId);

      // Create default profile if doesn't exist
      if (!profile) {
        profile = await vaultTransactionRepo.createUserVaultProfile(userId);
      }

      return profile;
    } catch (error) {
      log.error('VaultService', 'Failed to get user vault profile', error, { userId });
      return null;
    }
  }

  /**
   * Gets a specific vault item by ID
   */
  async getVaultItem(itemId: string): Promise<VaultItem | null> {
    try {
      // Get from Supabase
      const item = await VaultRepository.getVaultItemById(itemId);

      if (item) {
        return item;
      }

      // Fallback to mock data if not in Supabase
      const { vaultItems } = await import('../data/vaultData');
      return vaultItems.find(item => item.id === itemId) || null;
    } catch (error) {
      log.error('VaultService', 'Failed to get vault item', error, { itemId });
      return null;
    }
  }

  /**
   * Gets a monetization item by ID
   */
  async getMonetizationItem(itemId: string): Promise<MonetizationItem | null> {
    try {
      // Get all monetization items from Supabase and find by ID
      const items = await VaultRepository.getMonetizationItems();
      const item = items.find(i => i.id === itemId);

      if (item) {
        return item;
      }

      // Fallback to mock data if not in Supabase
      const { monetizationItems } = await import('../data/vaultData');
      return monetizationItems.find(item => item.id === itemId) || null;
    } catch (error) {
      log.error('VaultService', 'Failed to get monetization item', error, { itemId });
      return null;
    }
  }

  /**
   * Decrements vault item stock after unlock
   */
  private async decrementItemStock(itemId: string): Promise<void> {
    try {
      const success = await VaultRepository.decrementItemStock(itemId);
      if (!success) {
        log.warn('VaultService', 'Failed to decrement item stock', { itemId });
      }
    } catch (error) {
      log.error('VaultService', 'Failed to decrement item stock', error, { itemId });
    }
  }

  /**
   * Checks if a vault cycle is still active
   */
  private async isCycleActive(cycleId: string): Promise<boolean> {
    try {
      // Get current active cycle from Supabase
      const currentCycle = await VaultRepository.getCurrentCycle();

      if (!currentCycle) {
        return false;
      }

      return currentCycle.id === cycleId && currentCycle.isActive;
    } catch (error) {
      log.error('VaultService', 'Failed to check cycle status', error, { cycleId });
      // Fallback to mock data
      const now = new Date();
      const { currentVaultCycle } = require('../data/vaultData');

      return currentVaultCycle.id === cycleId &&
             new Date(currentVaultCycle.startDate) <= now &&
             new Date(currentVaultCycle.endDate) >= now;
    }
  }

  // ================== XP EARNING METHODS ==================

  /**
   * Awards XP to user for completing lessons, challenges, videos
   * (XP can ONLY be earned, never purchased)
   */
  async awardXP(userId: string, amount: number, source: string): Promise<boolean> {
    try {
      // Get user's active booster to apply multiplier
      const userProfile = await this.getUserVaultProfile(userId);
      let multiplier = 1;

      if (userProfile?.activeBooster?.type === 'xp_multiplier') {
        multiplier = userProfile.activeBooster.multiplier || 1;
      }

      // Use Supabase transaction repo to award XP (handles multiplier)
      await vaultTransactionRepo.awardXP(userId, amount, source, undefined, multiplier);

      return true;
    } catch (error) {
      log.error('VaultService', 'Failed to award XP', error, { userId, amount, source });
      return false;
    }
  }
}

// Export singleton instance
export const vaultService = new VaultService();
export default vaultService;
