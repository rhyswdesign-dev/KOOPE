/**
 * SUBSCRIPTION CONTEXT
 * Global subscription state management using RevenueCat
 *
 * Provides subscription status (Pro, Prestige) to the entire app.
 * Handles initialization, user identification, and entitlement checking.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesEntitlementInfo,
  PurchasesOfferings,
  PurchasesPackage,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE
} from 'react-native-purchases';
import { SUBSCRIPTION_ENTITLEMENTS, REVENUECAT_CONFIG, SUBSCRIPTION_PRODUCTS } from '../constants/subscriptions';
import { setUserId, setUserProperties } from '../lib/analytics';
import { useUserTier } from '../store/useUserTier';
import type { UserTier } from '../store/useUserTier';

/**
 * MANUAL TESTING GUIDE
 *
 * Test Flow 1: Fresh Install (Free User)
 * ========================================
 * 1. Install app on fresh device/simulator
 * 2. Open app - should see free tier content
 * 3. Navigate to gated feature (e.g., Pro recipe, AI tools)
 * 4. Should be redirected to Paywall screen
 * 5. Purchase Pro subscription
 * 6. Should immediately get access to gated content
 * 7. Verify no navigation loops
 *
 * Test Flow 2: Existing Pro User
 * ========================================
 * 1. User who already purchased Pro re-installs app
 * 2. Open app - RevenueCat fetches cached customer info
 * 3. isPro should be true after ~1-2 seconds
 * 4. User should NOT see paywall or locked prompts
 * 5. All Pro features should be accessible
 *
 * Test Flow 3: Restore Purchases
 * ========================================
 * 1. User with previous purchase on new device
 * 2. Open app, navigate to Paywall
 * 3. Tap "Restore Purchases" button
 * 4. Should show success alert if purchases found
 * 5. isPro/isPrestige should update immediately
 * 6. Gated content should unlock without app restart
 *
 * Test Flow 4: Network Offline
 * ========================================
 * 1. Turn off network connection
 * 2. Open app (existing Pro user)
 * 3. RevenueCat should use cached data
 * 4. isPro should still be true from cache
 * 5. User should have access to Pro features
 *
 * Test Flow 5: User Cancels Purchase
 * ========================================
 * 1. Navigate to Paywall
 * 2. Tap "Subscribe to Pro"
 * 3. Cancel purchase in system dialog
 * 4. Should NOT show error alert (userCancelled: true)
 * 5. Should return to Paywall without crash
 * 6. Purchase button should be enabled again
 */

/**
 * Purchase result interface
 */
export interface PurchaseResult {
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
  userCancelled?: boolean;
}

/**
 * Subscription state interface
 */
interface SubscriptionState {
  isPro: boolean;
  isKoopePro: boolean;
  isPrestige: boolean;
  isSubscriber: boolean;
  isLoading: boolean;
  error: string | null;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  isPurchasing: boolean;
  refreshSubscriptionStatus: () => Promise<void>;
  getOfferings: () => Promise<PurchasesOfferings | null>;
  restorePurchases: () => Promise<PurchaseResult>;
  // Purchase helpers
  purchaseTier: (tier: 'pro' | 'prestige', billingMode: 'monthly' | 'yearly') => Promise<PurchaseResult>;
  purchaseProMonthly: () => Promise<PurchaseResult>;
  purchaseProYearly: () => Promise<PurchaseResult>;
  purchasePrestigeMonthly: () => Promise<PurchaseResult>;
  purchasePrestigeYearly: () => Promise<PurchaseResult>;
}

/**
 * Default subscription state (non-subscriber)
 */
const defaultState: SubscriptionState = {
  isPro: false,
  isKoopePro: false,
  isPrestige: false,
  isSubscriber: false,
  isLoading: true,
  error: null,
  customerInfo: null,
  offerings: null,
  isPurchasing: false,
  refreshSubscriptionStatus: async () => {},
  getOfferings: async () => null,
  restorePurchases: async () => ({ success: false }),
  purchaseTier: async () => ({ success: false }),
  purchaseProMonthly: async () => ({ success: false }),
  purchaseProYearly: async () => ({ success: false }),
  purchasePrestigeMonthly: async () => ({ success: false }),
  purchasePrestigeYearly: async () => ({ success: false }),
};

/**
 * Create the context
 */
const SubscriptionContext = createContext<SubscriptionState>(defaultState);

/**
 * Hook to access subscription state
 *
 * @example
 * ```tsx
 * const { isPro, isPrestige, isSubscriber, isLoading } = useSubscription();
 *
 * if (isPro) {
 *   return <ProFeature />;
 * }
 * ```
 */
export function useSubscription(): SubscriptionState {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

/**
 * Provider props
 */
interface SubscriptionProviderProps {
  children: ReactNode;
}

/**
 * Subscription Provider Component
 *
 * Wraps the app to provide subscription state globally.
 * Initializes RevenueCat and manages subscription status.
 */
export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [isPro, setIsPro] = useState(false);
  const [isKoopePro, setIsKoopePro] = useState(false);
  const [isPrestige, setIsPrestige] = useState(false);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  /**
   * Check if an entitlement is active
   */
  const isEntitlementActive = (entitlement: PurchasesEntitlementInfo | undefined): boolean => {
    return entitlement?.isActive === true;
  };

  /**
   * Update subscription state based on customer info
   *
   * STATE PERSISTENCE:
   * - This function is called on app launch via useEffect
   * - RevenueCat automatically caches customer info locally
   * - On app reload, customer info is fetched from cache first, then refreshed from server
   * - This ensures paid users don't see paywall on reload while server check completes
   */
  const updateSubscriptionState = (info: CustomerInfo) => {
    const entitlements = info.entitlements.active;

    const koopePlus = isEntitlementActive(entitlements[SUBSCRIPTION_ENTITLEMENTS.KOOPE_PLUS]);
    const koopePro = isEntitlementActive(entitlements[SUBSCRIPTION_ENTITLEMENTS.KOOPE_PRO]);
    const koopeProAlt = isEntitlementActive(entitlements[SUBSCRIPTION_ENTITLEMENTS.KOOPE_PRO_ALT]);
    const prestigeActive = isEntitlementActive(entitlements[SUBSCRIPTION_ENTITLEMENTS.PRESTIGE]);

    const hasProEntitlement = koopePro || koopeProAlt;

    setIsKoopePro(koopePlus || hasProEntitlement); // Either KOOPE+ or KOOPE PRO grants koopePro status
    setIsPro(hasProEntitlement); // Only KOOPE PRO grants pro status
    setIsPrestige(prestigeActive);
    setIsSubscriber(koopePlus || hasProEntitlement || prestigeActive);
    setCustomerInfo(info);

    // Update analytics user properties
    const subscriptionTier = prestigeActive ? 'prestige' : hasProEntitlement ? 'pro' : koopePlus ? 'plus' : 'free';
    const subscriptionStatus = (koopePlus || hasProEntitlement || prestigeActive) ? 'active' : 'inactive';

    setUserProperties({
      subscription_tier: subscriptionTier,
      subscription_status: subscriptionStatus,
      customer_id: info.originalAppUserId,
    });

    // Set user ID for analytics
    if (info.originalAppUserId) {
      setUserId(info.originalAppUserId);
    }

    // Update UserTier store to sync with subscription status
    const newTier: UserTier = hasProEntitlement ? 'PRO' : koopePlus ? 'PLUS' : 'FREE';
    const tierStore = useUserTier.getState();
    tierStore.setTier(newTier);

    // Update subscription status in tier store
    if (koopePlus || hasProEntitlement || prestigeActive) {
      tierStore.setSubscriptionStatus('active');
    }

    console.log(`[SubscriptionContext] Tier synced: ${newTier} (${subscriptionStatus})`);
  };

  /**
   * Get available offerings from RevenueCat
   */
  const getOfferings = async (): Promise<PurchasesOfferings | null> => {
    try {
      const fetchedOfferings = await Purchases.getOfferings();
      setOfferings(fetchedOfferings);
      console.log('[SubscriptionContext] Offerings fetched successfully');
      return fetchedOfferings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch offerings';
      console.error('[SubscriptionContext] Error fetching offerings:', errorMessage);
      setError(errorMessage);
      return null;
    }
  };

  /**
   * Find a package by product identifier
   */
  const findPackageByIdentifier = async (productId: string): Promise<PurchasesPackage | null> => {
    try {
      let currentOfferings = offerings;
      if (!currentOfferings) {
        currentOfferings = await getOfferings();
      }

      if (!currentOfferings?.current) {
        console.error('[SubscriptionContext] No current offering available');
        return null;
      }

      const pkg = currentOfferings.current.availablePackages.find(p => {
        const id = p.identifier.toLowerCase();
        const searchId = productId.toLowerCase();
        return id.includes(searchId) || id === searchId;
      });

      if (!pkg) {
        console.warn('[SubscriptionContext] Package not found for product:', productId);
      }

      return pkg || null;
    } catch (err) {
      console.error('[SubscriptionContext] Error finding package:', err);
      return null;
    }
  };

  /**
   * Generic purchase tier function
   */
  const purchaseTier = async (tier: 'pro' | 'prestige', billingMode: 'monthly' | 'yearly'): Promise<PurchaseResult> => {
    try {
      setIsPurchasing(true);
      setError(null);

      let productId: string;
      if (tier === 'pro') {
        productId = billingMode === 'monthly' ? SUBSCRIPTION_PRODUCTS.PRO_MONTHLY : SUBSCRIPTION_PRODUCTS.PRO_YEARLY;
      } else {
        productId = billingMode === 'monthly' ? SUBSCRIPTION_PRODUCTS.PRESTIGE_MONTHLY : SUBSCRIPTION_PRODUCTS.PRESTIGE_YEARLY;
      }

      console.log('[SubscriptionContext] Attempting purchase:', { tier, billingMode, productId });

      const pkg = await findPackageByIdentifier(productId);
      if (!pkg) {
        const errorMsg = `Package not found for ${tier} ${billingMode}`;
        console.error('[SubscriptionContext]', errorMsg);
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      const { customerInfo: updatedInfo } = await Purchases.purchasePackage(pkg);
      updateSubscriptionState(updatedInfo);
      console.log('[SubscriptionContext] Purchase successful:', { tier, billingMode });

      return { success: true, customerInfo: updatedInfo };
    } catch (err: any) {
      if (err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR || err.userCancelled) {
        console.log('[SubscriptionContext] Purchase cancelled by user');
        return { success: false, userCancelled: true };
      }

      const errorMessage = err.message || 'Purchase failed';
      console.error('[SubscriptionContext] Purchase error:', errorMessage, err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsPurchasing(false);
    }
  };

  const purchaseProMonthly = async () => purchaseTier('pro', 'monthly');
  const purchaseProYearly = async () => purchaseTier('pro', 'yearly');
  const purchasePrestigeMonthly = async () => purchaseTier('prestige', 'monthly');
  const purchasePrestigeYearly = async () => purchaseTier('prestige', 'yearly');

  /**
   * Restore previous purchases
   */
  const restorePurchases = async (): Promise<PurchaseResult> => {
    try {
      setIsPurchasing(true);
      setError(null); // Clear any previous errors
      const info = await Purchases.restorePurchases();
      updateSubscriptionState(info);
      console.log('[SubscriptionContext] Purchases restored successfully');
      return { success: true, customerInfo: info };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore purchases';
      console.error('[SubscriptionContext] Error restoring purchases:', errorMessage);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsPurchasing(false);
    }
  };

  /**
   * Refresh subscription status from RevenueCat
   */
  const refreshSubscriptionStatus = async () => {
    try {
      setIsLoading(true);
      const info = await Purchases.getCustomerInfo();
      updateSubscriptionState(info);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh subscription status';
      console.error('[SubscriptionContext] Error refreshing subscription:', errorMessage);
      setError(errorMessage);
      // Don't block the app - just mark as non-subscriber
      setIsKoopePro(false);
      setIsPro(false);
      setIsPrestige(false);
      setIsSubscriber(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Initialize RevenueCat on mount
   */
  useEffect(() => {
    const initializeRevenueCat = async () => {
      try {
        setIsLoading(true);

        // Select API key based on platform
        const apiKey = Platform.OS === 'ios'
          ? REVENUECAT_CONFIG.IOS_API_KEY
          : REVENUECAT_CONFIG.ANDROID_API_KEY;

        // Configure RevenueCat with debug logging in development
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        // Configure RevenueCat
        await Purchases.configure({
          apiKey,
          appUserID: undefined, // Anonymous user for now
        });

        console.log('[SubscriptionContext] RevenueCat initialized successfully');

        // Fetch initial offerings
        await getOfferings();

        // Set up customer info update listener
        Purchases.addCustomerInfoUpdateListener((info) => {
          console.log('[SubscriptionContext] Customer info updated');
          updateSubscriptionState(info);
        });

        // Fetch initial customer info
        const info = await Purchases.getCustomerInfo();
        updateSubscriptionState(info);
        setError(null);

        console.log('[SubscriptionContext] Initial subscription state loaded', {
          isPro: isEntitlementActive(info.entitlements.active[SUBSCRIPTION_ENTITLEMENTS.KOOPE_PRO]),
          isPrestige: isEntitlementActive(info.entitlements.active[SUBSCRIPTION_ENTITLEMENTS.PRESTIGE]),
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize RevenueCat';
        console.error('[SubscriptionContext] Initialization error:', errorMessage);
        setError(errorMessage);

        // Don't immediately block - give user benefit of doubt during network issues
        // Free users will still get gated by individual checks
        console.warn('[SubscriptionContext] Operating in degraded mode - some features may be limited');
      } finally {
        setIsLoading(false);
      }
    };

    initializeRevenueCat();
  }, []);

  const value: SubscriptionState = {
    isPro,
    isKoopePro,
    isPrestige,
    isSubscriber,
    isLoading,
    error,
    customerInfo,
    offerings,
    isPurchasing,
    refreshSubscriptionStatus,
    getOfferings,
    restorePurchases,
    purchaseTier,
    purchaseProMonthly,
    purchaseProYearly,
    purchasePrestigeMonthly,
    purchasePrestigeYearly,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}
