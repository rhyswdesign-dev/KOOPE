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
  LOG_LEVEL
} from 'react-native-purchases';
import { SUBSCRIPTION_ENTITLEMENTS, REVENUECAT_CONFIG } from '../constants/subscriptions';

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
  refreshSubscriptionStatus: () => Promise<void>;
  getOfferings: () => Promise<PurchasesOfferings | null>;
  restorePurchases: () => Promise<void>;
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
  refreshSubscriptionStatus: async () => {},
  getOfferings: async () => null,
  restorePurchases: async () => {},
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

  /**
   * Check if an entitlement is active
   */
  const isEntitlementActive = (entitlement: PurchasesEntitlementInfo | undefined): boolean => {
    return entitlement?.isActive === true;
  };

  /**
   * Update subscription state based on customer info
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
   * Restore previous purchases
   */
  const restorePurchases = async () => {
    try {
      setIsLoading(true);
      const info = await Purchases.restorePurchases();
      updateSubscriptionState(info);
      setError(null);
      console.log('[SubscriptionContext] Purchases restored successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore purchases';
      console.error('[SubscriptionContext] Error restoring purchases:', errorMessage);
      setError(errorMessage);
      throw err; // Re-throw so UI can show error
    } finally {
      setIsLoading(false);
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
          isPro: isEntitlementActive(info.entitlements.active[SUBSCRIPTION_ENTITLEMENTS.PRO]),
          isPrestige: isEntitlementActive(info.entitlements.active[SUBSCRIPTION_ENTITLEMENTS.PRESTIGE]),
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize RevenueCat';
        console.error('[SubscriptionContext] Initialization error:', errorMessage);
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
    refreshSubscriptionStatus,
    getOfferings,
    restorePurchases,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}
