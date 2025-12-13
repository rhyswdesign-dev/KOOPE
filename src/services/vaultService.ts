/**
 * VAULT SERVICE
 * Handles all XP + Keys economy transactions and Stripe integration
 */

import { 
  VaultItem, 
  VaultUnlockRequest, 
  VaultUnlockResponse, 
  VaultUnlockError,
  VaultPurchaseRequest,
  VaultPurchaseResponse,
  UserVaultProfile,
  MonetizationItem,
  VaultCart,
  VaultCartItem,
  UnlockedVaultItem
} from '../types/vault';

// Firebase Firestore imports
import { doc, updateDoc, increment, arrayUnion, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db, safeFirestoreOperation, logFirebaseError } from '../config/firebase';
import { log } from '../lib/logger';

// Mock Stripe imports (replace with actual Stripe imports)
// import { StripeProvider, useStripe } from '@stripe/stripe-react-native';

class VaultService {
  
  // ================== VAULT UNLOCK FLOW ==================
  
  /**
   * Unlocks a vault item by deducting XP and Keys from user profile
   * This is the core transaction of the Vault economy
   */
  async unlockVaultItem(request: VaultUnlockRequest): Promise<VaultUnlockResponse> {
    try {
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
      const validation = this.validateUnlockRequest(item, userProfile, request.useDiscountOption);
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
        keysCost: costs.keysCost,
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
          keysSpent: costs.keysCost,
          cashCharged: costs.cashCost,
          itemUnlocked: item,
          newXpBalance: updatedProfile!.xpBalance,
          newKeysBalance: updatedProfile!.keysBalance
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
  private validateUnlockRequest(
    item: VaultItem, 
    userProfile: UserVaultProfile, 
    useDiscountOption: boolean
  ): { success: boolean; error?: VaultUnlockError } {
    
    // Check if item is active
    if (!item.isActive) {
      return { success: false, error: 'item_not_active' };
    }

    // Check stock availability
    if (item.currentStock <= 0) {
      return { success: false, error: 'item_out_of_stock' };
    }

    // Check if cycle is still active
    if (!this.isCycleActive(item.cycleId)) {
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

    // Check Keys balance
    if (userProfile.keysBalance < costs.keysCost) {
      return { success: false, error: 'insufficient_keys' };
    }

    return { success: true };
  }

  /**
   * Calculates XP and Keys cost based on discount option
   */
  private calculateUnlockCosts(item: VaultItem, useDiscountOption: boolean): {
    xpCost: number;
    keysCost: number;
    cashCost: number;
  } {
    if (useDiscountOption && item.discountOption) {
      return {
        xpCost: item.discountOption.reducedXP,
        keysCost: item.keysCost, // Keys cost never changes
        cashCost: item.discountOption.cashPrice
      };
    }

    return {
      xpCost: item.xpCost,
      keysCost: item.keysCost,
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
    keysCost: number;
    cashCost: number;
    stripePaymentIntentId?: string;
    shippingAddress?: any;
  }): Promise<string> {
    
    const transactionId = `unlock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 1. Deduct XP and Keys from user profile
    await updateDoc(doc(db, 'userVaultProfiles', params.userId), {
      xpBalance: increment(-params.xpCost),
      keysBalance: increment(-params.keysCost),
      totalXpSpent: increment(params.xpCost),
      totalKeysSpent: increment(params.keysCost),
      updatedAt: new Date().toISOString()
    });

    // 2. Add to user's unlocked items
    const unlockedItem: UnlockedVaultItem = {
      itemId: params.itemId,
      itemName: '', // Would be populated from item data
      unlockedAt: new Date().toISOString(),
      cycleId: '', // Would be populated from item data
      xpSpent: params.xpCost,
      keysSpent: params.keysCost,
      cashSpent: params.cashCost > 0 ? params.cashCost : undefined,
      fulfillmentStatus: 'pending',
      shippingAddress: params.shippingAddress
    };

    await updateDoc(doc(db, 'userVaultProfiles', params.userId), {
      unlockedItems: arrayUnion(unlockedItem)
    });

    // 3. Log transaction for analytics and order history
    await addDoc(collection(db, 'vaultTransactions'), {
      transactionId,
      userId: params.userId,
      type: 'unlock',
      itemId: params.itemId,
      xpSpent: params.xpCost,
      keysSpent: params.keysCost,
      cashSpent: params.cashCost,
      stripePaymentIntentId: params.stripePaymentIntentId,
      timestamp: new Date().toISOString()
    });

    return transactionId;
  }

  // ================== KEYS/BOOSTERS PURCHASE FLOW ==================

  /**
   * Purchases Keys or Boosters with real money via Stripe
   */
  async purchaseMonetizationItem(request: VaultPurchaseRequest): Promise<VaultPurchaseResponse> {
    try {
      // 1. Get monetization item details
      const item = await this.getMonetizationItem(request.monetizationItemId);
      if (!item) {
        return {
          success: false,
          error: 'Item not found'
        };
      }

      // 2. Check stock availability
      if (!item.inStock) {
        return {
          success: false,
          error: 'Item out of stock'
        };
      }

      if (item.stockLimit && item.stockLimit <= 0) {
        return {
          success: false,
          error: 'Item sold out'
        };
      }

      // 3. Calculate total cost
      const totalCost = item.price * request.quantity;

      // 4. Process Stripe payment
      const paymentResult = await this.processStripePayment(
        totalCost, 
        request.userId, 
        request.paymentMethodId
      );

      if (!paymentResult.success) {
        return {
          success: false,
          error: paymentResult.error || 'Payment failed'
        };
      }

      // 5. Grant Keys and/or Boosters to user
      const purchaseId = await this.grantPurchaseRewards(request.userId, item, request.quantity);

      // 6. Update user balances
      const updatedProfile = await this.getUserVaultProfile(request.userId);

      return {
        success: true,
        purchase: {
          purchaseId,
          totalPaid: totalCost,
          keysGranted: (item.keysGranted || 0) * request.quantity,
          boosterGranted: item.boosterEffect,
          stripePaymentIntentId: paymentResult.paymentIntentId!,
          newKeysBalance: updatedProfile!.keysBalance
        }
      };

    } catch (error) {
      log.error('VaultService', 'Purchase failed', error, {
        userId: request.userId,
        itemId: request.monetizationItemId
      });
      return {
        success: false,
        error: 'Purchase failed'
      };
    }
  }

  /**
   * Grants Keys and Boosters to user after successful purchase
   */
  private async grantPurchaseRewards(
    userId: string, 
    item: MonetizationItem, 
    quantity: number
  ): Promise<string> {
    
    const purchaseId = `purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    // Grant Keys
    if (item.keysGranted) {
      updates.keysBalance = increment(item.keysGranted * quantity);
      updates.totalKeysEarned = increment(item.keysGranted * quantity);
    }

    // Apply Booster
    if (item.boosterEffect) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + item.boosterEffect.duration);
      
      updates.activeBooster = {
        type: item.boosterEffect.type,
        multiplier: item.boosterEffect.multiplier,
        expiresAt: expiresAt.toISOString()
      };
    }

    await updateDoc(doc(db, 'userVaultProfiles', userId), updates);

    return purchaseId;
  }

  // ================== VAULT CART SYSTEM ==================

  /**
   * Adds monetization item to user's cart (Keys/Boosters only)
   */
  async addToVaultCart(userId: string, itemId: string, quantity: number): Promise<boolean> {
    try {
      const item = await this.getMonetizationItem(itemId);
      if (!item || !item.inStock) {
        return false;
      }

      const cartRef = doc(db, 'vaultCarts', userId);
      const cartDoc = await safeFirestoreOperation(() => getDoc(cartRef));
      
      let cart: VaultCart;
      if (cartDoc && cartDoc.exists()) {
        cart = cartDoc.data() as VaultCart;
      } else {
        cart = {
          userId,
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0,
          updatedAt: new Date().toISOString()
        };
      }

      // Check if item already in cart
      const existingItemIndex = cart.items.findIndex(
        cartItem => cartItem.monetizationItemId === itemId
      );

      if (existingItemIndex >= 0) {
        // Update quantity
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].totalPrice = 
          cart.items[existingItemIndex].quantity * item.price;
      } else {
        // Add new item
        const cartItem: VaultCartItem = {
          monetizationItemId: itemId,
          quantity,
          unitPrice: item.price,
          totalPrice: quantity * item.price
        };
        cart.items.push(cartItem);
      }

      // Recalculate totals
      cart.subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
      cart.tax = Math.round(cart.subtotal * 0.08); // 8% tax
      cart.total = cart.subtotal + cart.tax;
      cart.updatedAt = new Date().toISOString();

      await setDoc(cartRef, cart);
      
      return true;
    } catch (error) {
      log.error('VaultService', 'Add to cart failed', error, { userId, itemId });
      return false;
    }
  }

  // ================== STRIPE INTEGRATION ==================

  /**
   * Processes Stripe payment for real money transactions
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
    
    try {
      // In real implementation, this would call your backend API
      // which creates a Stripe Payment Intent
      
      /*
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountInCents,
          currency: 'usd',
          userId,
          paymentMethodId,
          metadata: {
            type: 'vault_purchase',
            userId
          }
        }),
      });

      const { clientSecret, paymentIntentId } = await response.json();

      // Use Stripe React Native SDK to confirm payment
      const { error } = await stripe.confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        paymentIntentId
      };
      */

      // Mock successful payment for demo
      return {
        success: true,
        paymentIntentId: `pi_mock_${Date.now()}`
      };

    } catch (error) {
      log.error('VaultService', 'Stripe payment failed', error, { amountInCents, userId });
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  }

  // ================== DATA ACCESS METHODS ==================

  /**
   * Gets user's vault profile with XP and Keys balances
   */
  async getUserVaultProfile(userId: string): Promise<UserVaultProfile | null> {
    try {
      const docRef = doc(db, 'userVaultProfiles', userId);
      const docSnap = await safeFirestoreOperation(() => getDoc(docRef));
      
      if (docSnap && docSnap.exists()) {
        return docSnap.data() as UserVaultProfile;
      }
      
      // Create default profile if doesn't exist
      const defaultProfile: UserVaultProfile = {
        userId,
        xpBalance: 0,
        keysBalance: 0,
        totalXpEarned: 0,
        totalKeysEarned: 0,
        totalXpSpent: 0,
        totalKeysSpent: 0,
        unlockedItems: [],
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(docRef, defaultProfile);
      return defaultProfile;
    } catch (error) {
      logFirebaseError('get user vault profile', error);
      return null;
    }
  }

  /**
   * Gets a specific vault item by ID
   */
  async getVaultItem(itemId: string): Promise<VaultItem | null> {
    try {
      const docRef = doc(db, 'vaultItems', itemId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as VaultItem;
      }
      
      // Fallback to mock data if not in Firestore
      const { vaultItems } = await import('../data/vaultData');
      return vaultItems.find(item => item.id === itemId) || null;
    } catch (error) {
      logFirebaseError('get vault item', error);
      return null;
    }
  }

  /**
   * Gets a monetization item by ID
   */
  async getMonetizationItem(itemId: string): Promise<MonetizationItem | null> {
    try {
      const docRef = doc(db, 'monetizationItems', itemId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as MonetizationItem;
      }
      
      // Fallback to mock data if not in Firestore
      const { monetizationItems } = await import('../data/vaultData');
      return monetizationItems.find(item => item.id === itemId) || null;
    } catch (error) {
      logFirebaseError('get monetization item', error);
      return null;
    }
  }

  /**
   * Decrements vault item stock after unlock
   */
  private async decrementItemStock(itemId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'vaultItems', itemId), {
        currentStock: increment(-1),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      log.error('VaultService', 'Failed to decrement item stock', error, { itemId });
    }
  }

  /**
   * Checks if a vault cycle is still active
   */
  private isCycleActive(cycleId: string): boolean {
    // In real implementation, would check against Firestore
    const now = new Date();
    const { currentVaultCycle } = require('../data/vaultData');
    
    return currentVaultCycle.id === cycleId && 
           new Date(currentVaultCycle.startDate) <= now && 
           new Date(currentVaultCycle.endDate) >= now;
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
      let finalAmount = amount;
      
      if (userProfile?.activeBooster?.type === 'xp_multiplier') {
        const multiplier = userProfile.activeBooster.multiplier || 1;
        finalAmount = Math.floor(amount * multiplier);
      }

      await updateDoc(doc(db, 'userVaultProfiles', userId), {
        xpBalance: increment(finalAmount),
        totalXpEarned: increment(finalAmount),
        updatedAt: new Date().toISOString()
      });

      // Log XP earning for analytics
      await addDoc(collection(db, 'xpTransactions'), {
        userId,
        amount: finalAmount,
        originalAmount: amount,
        source, // 'lesson_complete', 'challenge_win', 'video_watch', etc.
        timestamp: new Date().toISOString()
      });

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