/**
 * In-App Purchase Service
 * Platform-safe IAP integration with stubs
 */

import { log } from '../lib/logger';

export interface IAPProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  localizedPrice: string;
  currency: string;
  type: 'consumable' | 'non_consumable' | 'subscription';
}

export interface IAPPurchase {
  transactionId: string;
  productId: string;
  purchaseTime: number;
  purchaseState: 'purchased' | 'pending' | 'cancelled';
  receipt: string;
}

export interface IAPService {
  initialize(): Promise<void>;
  getProducts(productIds: string[]): Promise<IAPProduct[]>;
  purchaseProduct(productId: string): Promise<IAPPurchase>;
  restorePurchases(): Promise<IAPPurchase[]>;
  finishTransaction(transactionId: string): Promise<void>;
  isAvailable(): Promise<boolean>;
}

/**
 * Stub IAP Service for development
 */
export class StubIAPService implements IAPService {
  private products: Record<string, IAPProduct> = {
    'xp_small': {
      id: 'xp_small',
      title: 'Small XP Pack',
      description: '100 XP points',
      price: '$0.99',
      localizedPrice: '$0.99',
      currency: 'USD',
      type: 'consumable'
    },
    'xp_medium': {
      id: 'xp_medium',
      title: 'Medium XP Pack',
      description: '250 XP points',
      price: '$1.99',
      localizedPrice: '$1.99',
      currency: 'USD',
      type: 'consumable'
    },
    'xp_large': {
      id: 'xp_large',
      title: 'Large XP Pack',
      description: '500 XP points',
      price: '$3.99',
      localizedPrice: '$3.99',
      currency: 'USD',
      type: 'consumable'
    },
    'xp_mega': {
      id: 'xp_mega',
      title: 'Mega XP Pack',
      description: '1200 XP points',
      price: '$7.99',
      localizedPrice: '$7.99',
      currency: 'USD',
      type: 'consumable'
    },
    'premium_subscription': {
      id: 'premium_subscription',
      title: 'Premium Subscription',
      description: 'Unlimited lives and exclusive content',
      price: '$4.99/month',
      localizedPrice: '$4.99/month',
      currency: 'USD',
      type: 'subscription'
    }
  };

  async initialize(): Promise<void> {
    log.info('IAPService', 'Initializing IAP service (stub mode)');
    // TODO: Initialize platform-specific IAP
    // iOS: StoreKit
    // Android: Google Play Billing
  }

  async getProducts(productIds: string[]): Promise<IAPProduct[]> {
    log.fn('IAPService', 'getProducts', { productIds });
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return productIds
      .map(id => this.products[id])
      .filter(Boolean);
  }

  async purchaseProduct(productId: string): Promise<IAPPurchase> {
    console.log('Purchasing product:', productId);
    
    // Simulate purchase flow
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate 95% success rate
    if (Math.random() < 0.95) {
      const purchase: IAPPurchase = {
        transactionId: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId,
        purchaseTime: Date.now(),
        purchaseState: 'purchased',
        receipt: `receipt_${productId}_${Date.now()}`
      };
      
      console.log('Purchase successful:', purchase);
      return purchase;
    } else {
      throw new Error('Purchase cancelled or failed');
    }
  }

  async restorePurchases(): Promise<IAPPurchase[]> {
    console.log('Restoring purchases');
    
    // Simulate restore delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return empty array for stub - in production would restore actual purchases
    return [];
  }

  async finishTransaction(transactionId: string): Promise<void> {
    console.log('Finishing transaction:', transactionId);
    // In production, this would acknowledge the purchase
  }

  async isAvailable(): Promise<boolean> {
    // Always available in stub
    return true;
  }
}

/**
 * Real IAP Service (platform-specific implementation)
 */
export class PlatformIAPService implements IAPService {
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      const { initConnection } = require('react-native-iap');
      const result = await initConnection();
      
      this.isInitialized = result;
      console.log('Platform IAP Service initialized:', result);
    } catch (error) {
      console.error('IAP initialization failed:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  async getProducts(productIds: string[]): Promise<IAPProduct[]> {
    if (!this.isInitialized) {
      throw new Error('IAP not initialized');
    }

    try {
      const { getProducts, getSubscriptions } = require('react-native-iap');
      
      const [products, subscriptions] = await Promise.all([
        getProducts({ skus: productIds }),
        getSubscriptions({ skus: productIds })
      ]);
      
      const allProducts = [...products, ...subscriptions];
      
      return allProducts.map(product => ({
        id: product.productId,
        title: product.title,
        description: product.description,
        price: product.price,
        localizedPrice: product.localizedPrice,
        currency: product.currency,
        type: product.type === 'iap' ? 'consumable' : 'subscription'
      }));
    } catch (error) {
      console.error('Get products failed:', error);
      throw error;
    }
  }

  async purchaseProduct(productId: string): Promise<IAPPurchase> {
    if (!this.isInitialized) {
      throw new Error('IAP not initialized');
    }

    try {
      const { requestPurchase, requestSubscription } = require('react-native-iap');
      
      // Try consumable purchase first
      let purchase;
      try {
        purchase = await requestPurchase({ sku: productId, andDangerouslyFinishTransactionAutomaticallyIOS: false });
      } catch {
        // If consumable fails, try subscription
        purchase = await requestSubscription({ sku: productId });
      }
      
      return {
        transactionId: purchase.transactionId,
        productId: purchase.productId,
        purchaseTime: purchase.purchaseTime || Date.now(),
        purchaseState: 'purchased',
        receipt: purchase.transactionReceipt
      };
    } catch (error) {
      console.error('Purchase failed:', error);
      throw error;
    }
  }

  async restorePurchases(): Promise<IAPPurchase[]> {
    if (!this.isInitialized) {
      throw new Error('IAP not initialized');
    }

    try {
      const { getAvailablePurchases } = require('react-native-iap');
      const purchases = await getAvailablePurchases();
      
      return purchases.map(purchase => ({
        transactionId: purchase.transactionId,
        productId: purchase.productId,
        purchaseTime: purchase.purchaseTime || Date.now(),
        purchaseState: 'purchased',
        receipt: purchase.transactionReceipt
      }));
    } catch (error) {
      console.error('Restore purchases failed:', error);
      throw error;
    }
  }

  async finishTransaction(transactionId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('IAP not initialized');
    }

    try {
      const { finishTransaction, isIosStorekit2 } = require('react-native-iap');
      
      if (isIosStorekit2()) {
        await finishTransaction({ purchase: { transactionId }, isConsumable: true });
      } else {
        await finishTransaction({ purchase: { transactionId } });
      }
      
      console.log('Transaction finished:', transactionId);
    } catch (error) {
      console.error('Finish transaction failed:', error);
      throw error;
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      return this.isInitialized;
    } catch (error) {
      console.error('IAP availability check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
let iapService: IAPService;

/**
 * Get IAP service instance
 */
export function getIAPService(): IAPService {
  if (!iapService) {
    // Use stub in development, platform service in production
    iapService = __DEV__ ? new StubIAPService() : new PlatformIAPService();
  }
  return iapService;
}

/**
 * Set IAP service (for testing)
 */
export function setIAPService(service: IAPService): void {
  iapService = service;
}

/**
 * XP Bundle configuration
 */
export const XP_BUNDLES = {
  'xp_small': { xp: 100, price: 0.99 },
  'xp_medium': { xp: 250, price: 1.99 },
  'xp_large': { xp: 500, price: 3.99 },
  'xp_mega': { xp: 1200, price: 7.99 }
} as const;

/**
 * Get XP amount for product ID
 */
export function getXPForProduct(productId: string): number {
  return (XP_BUNDLES as any)[productId]?.xp || 0;
}