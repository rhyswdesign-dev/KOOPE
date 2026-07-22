/**
 * SUBSCRIPTION CONTEXT
 * Global subscription state management using RevenueCat
 *
 * Provides subscription status (Pro, Prestige) to the entire app.
 * Handles initialization, user identification, and entitlement checking.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import {
  SUBSCRIPTION_ENTITLEMENTS,
  REVENUECAT_CONFIG,
  SUBSCRIPTION_PRODUCTS,
  PRICING_DISPLAY,
  getRevenueCatConfigValidation,
} from '../constants/subscriptions';
import { setUserId, setUserProperties } from '../lib/analytics';
import { useUserTier } from '../store/useUserTier';
import type { UserTier } from '../store/useUserTier';
import { log } from '../lib/logger';
import { supabase } from '../lib/supabase';
import { deriveEntitlementState, isEntitlementActive } from './entitlementMapping';

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
  purchaseTier: (
    tier: 'plus' | 'pro' | 'prestige',
    billingMode: 'weekly' | 'monthly' | 'yearly',
  ) => Promise<PurchaseResult>;
  purchasePlusWeekly: () => Promise<PurchaseResult>;
  purchasePlusMonthly: () => Promise<PurchaseResult>;
  purchasePlusYearly: () => Promise<PurchaseResult>;
  purchaseProWeekly: () => Promise<PurchaseResult>;
  purchaseProMonthly: () => Promise<PurchaseResult>;
  purchaseProYearly: () => Promise<PurchaseResult>;
  purchasePrestigeMonthly: () => Promise<PurchaseResult>;
  purchasePrestigeYearly: () => Promise<PurchaseResult>;
  /**
   * Start a 7-day free trial for the given tier.
   * Finds the yearly package (most likely to have a trial) and initiates purchase.
   * After success, stores trial state in useUserTier.
   */
  startFreeTrial: (tier: 'plus' | 'pro') => Promise<PurchaseResult>;
  /** Current total user count — used for founders urgency banner in PaywallScreen */
  founderCount: number;
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
  purchasePlusWeekly: async () => ({ success: false }),
  purchasePlusMonthly: async () => ({ success: false }),
  purchasePlusYearly: async () => ({ success: false }),
  purchaseProWeekly: async () => ({ success: false }),
  purchaseProMonthly: async () => ({ success: false }),
  purchaseProYearly: async () => ({ success: false }),
  purchasePrestigeMonthly: async () => ({ success: false }),
  purchasePrestigeYearly: async () => ({ success: false }),
  startFreeTrial: async () => ({ success: false }),
  founderCount: 0,
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
  const [founderCount, setFounderCount] = useState(0);
  const revenueCatConfiguredRef = useRef(false);

  const FOUNDER_LIMIT = 300;

  /**
   * Update subscription state based on customer info
   *
   * STATE PERSISTENCE:
   * - This function is called on app launch via useEffect
   * - RevenueCat automatically caches customer info locally
   * - On app reload, customer info is fetched from cache first, then refreshed from server
   * - This ensures paid users don't see paywall on reload while server check completes
   */
  const updateSubscriptionState = useCallback((info: CustomerInfo) => {
    const derived = deriveEntitlementState(info.entitlements.active);

    setIsKoopePro(derived.isKoopePro); // Either KOOPE+ or KOOPE PRO grants koopePro status
    setIsPro(derived.hasProEntitlement); // Only KOOPE PRO grants pro status
    setIsPrestige(derived.prestigeActive);
    setIsSubscriber(derived.isSubscriber);
    setCustomerInfo(info);

    // Update analytics user properties
    setUserProperties({
      subscription_tier: derived.subscriptionTier,
      subscription_status: derived.subscriptionStatus,
      customer_id: info.originalAppUserId,
    });

    // Set user ID for analytics
    if (info.originalAppUserId) {
      setUserId(info.originalAppUserId);
    }

    // Update UserTier store to sync with subscription status. setTier()
    // normalizes 'PRO' -> 'PLUS' on write (Phase 0.7) — gating is
    // identical for both.
    const tierStore = useUserTier.getState();
    tierStore.setTier(derived.tier);

    // Update subscription status in tier store
    if (derived.isSubscriber) {
      tierStore.setSubscriptionStatus('active');
    }

    log.state('SubscriptionContext', 'updateSubscriptionState', {
      tier: derived.tier,
      status: derived.subscriptionStatus,
      koopePlus: derived.koopePlus,
      koopePro: derived.hasProEntitlement,
      prestige: derived.prestigeActive,
    });
  }, []);

  /**
   * Get available offerings from RevenueCat
   */
  const getOfferings = useCallback(async (): Promise<PurchasesOfferings | null> => {
    log.fn('SubscriptionContext', 'getOfferings');

    if (!revenueCatConfiguredRef.current) {
      log.info('SubscriptionContext', 'Skipping getOfferings until RevenueCat is configured');
      return null;
    }

    try {
      const fetchedOfferings = await Purchases.getOfferings();
      setOfferings(fetchedOfferings);
      log.info('SubscriptionContext', 'Offerings fetched successfully', {
        offeringsCount: fetchedOfferings.current?.availablePackages.length || 0,
      });
      return fetchedOfferings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch offerings';
      if (errorMessage.toLowerCase().includes('no singleton instance')) {
        log.warn(
          'SubscriptionContext',
          'getOfferings called before RevenueCat singleton was ready',
        );
        return null;
      }
      log.error('SubscriptionContext', 'Error fetching offerings', err);
      setError(errorMessage);
      return null;
    }
  }, []);

  /**
   * Find a package by product identifier
   */
  const findPackageByIdentifier = useCallback(
    async (productId: string): Promise<PurchasesPackage | null> => {
      try {
        let currentOfferings = offerings;
        if (!currentOfferings) {
          currentOfferings = await getOfferings();
        }

        if (!currentOfferings?.current) {
          const fallbackOffering = currentOfferings
            ? Object.values(currentOfferings.all || {})[0]
            : undefined;
          if (!fallbackOffering) {
            log.warn('SubscriptionContext', 'No offering available in RevenueCat');
            return null;
          }
          log.warn(
            'SubscriptionContext',
            'No current offering set, falling back to first available offering',
            {
              fallbackIdentifier: fallbackOffering.identifier,
            },
          );
          const pkg = fallbackOffering.availablePackages.find(
            (p) => p.product?.identifier === productId,
          );
          if (!pkg) {
            log.warn('SubscriptionContext', 'Package not found in fallback offering', {
              productId,
            });
            return null;
          }
          return pkg;
        }

        const pkg = currentOfferings.current.availablePackages.find((p) => {
          if (p.product?.identifier === productId) return true;
          return p.identifier === productId;
        });

        if (!pkg) {
          log.warn('SubscriptionContext', 'Package not found', { productId });
        }

        return pkg || null;
      } catch (err) {
        log.error('SubscriptionContext', 'Error finding package', err, { productId });
        return null;
      }
    },
    [offerings, getOfferings],
  );

  /**
   * Check founder status after a successful purchase.
   * If total user count is ≤ FOUNDER_LIMIT, mark user as founder and lock their price.
   *
   * Moved above purchaseTier (Phase 0.9): purchaseTier's useCallback deps
   * reference this function, and a const declared later in the same scope
   * isn't accessible from an earlier dependency array (temporal dead zone).
   */
  const checkAndSetFounderStatus = useCallback(async (priceCents: number) => {
    try {
      const { count, error } = await supabase
        .from('auth.users')
        .select('id', { count: 'exact', head: true });

      if (error || count == null) return;

      const userNumber = count;
      setFounderCount(userNumber);

      if (userNumber <= FOUNDER_LIMIT) {
        const tierStore = useUserTier.getState();
        tierStore.setFounderStatus(true, priceCents);
        // Tag in RevenueCat so backend can validate
        await Purchases.setAttributes({
          is_founder: 'true',
          founder_number: String(userNumber),
        });
        log.info('SubscriptionContext', 'Founder status set', { userNumber, priceCents });
      }
    } catch (err) {
      log.error('SubscriptionContext', 'checkAndSetFounderStatus failed', err);
    }
  }, []);

  /**
   * Generic purchase tier function
   * Supports plus, pro, and prestige tiers with weekly, monthly, and yearly billing
   */
  const purchaseTier = useCallback(
    async (
      tier: 'plus' | 'pro' | 'prestige',
      billingMode: 'weekly' | 'monthly' | 'yearly',
    ): Promise<PurchaseResult> => {
      if (!revenueCatConfiguredRef.current) {
        const errorMsg = 'Purchases are still initializing. Please try again in a moment.';
        log.warn('SubscriptionContext', 'purchaseTier called before RevenueCat configuration', {
          tier,
          billingMode,
        });
        return { success: false, error: errorMsg };
      }

      try {
        setIsPurchasing(true);
        setError(null);

        let productId: string;
        if (tier === 'plus') {
          productId =
            billingMode === 'weekly'
              ? SUBSCRIPTION_PRODUCTS.PLUS_WEEKLY
              : billingMode === 'monthly'
                ? SUBSCRIPTION_PRODUCTS.PLUS_MONTHLY
                : SUBSCRIPTION_PRODUCTS.PLUS_YEARLY;
        } else if (tier === 'pro') {
          productId =
            billingMode === 'weekly'
              ? SUBSCRIPTION_PRODUCTS.PRO_WEEKLY
              : billingMode === 'monthly'
                ? SUBSCRIPTION_PRODUCTS.PRO_MONTHLY
                : SUBSCRIPTION_PRODUCTS.PRO_YEARLY;
        } else {
          // Prestige doesn't have weekly option
          productId =
            billingMode === 'monthly'
              ? SUBSCRIPTION_PRODUCTS.PRESTIGE_MONTHLY
              : SUBSCRIPTION_PRODUCTS.PRESTIGE_YEARLY;
        }

        log.fn('SubscriptionContext', 'purchaseTier', { tier, billingMode, productId });

        const pkg = await findPackageByIdentifier(productId);
        if (!pkg) {
          const errorMsg = `Package not found for ${tier} ${billingMode}`;
          log.warn('SubscriptionContext', errorMsg, { tier, billingMode, productId });
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }

        const { customerInfo: updatedInfo } = await Purchases.purchasePackage(pkg);
        updateSubscriptionState(updatedInfo);
        log.info('SubscriptionContext', 'Purchase successful', { tier, billingMode });

        // Check and set founder status (first 300 users lock their price)
        const priceCents = Math.round((pkg.product?.price ?? 0) * 100);
        checkAndSetFounderStatus(priceCents);

        return { success: true, customerInfo: updatedInfo };
      } catch (err: any) {
        if (err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR || err.userCancelled) {
          log.info('SubscriptionContext', 'Purchase cancelled by user', { tier, billingMode });
          return { success: false, userCancelled: true };
        }

        const errorMessage = err.message || 'Purchase failed';
        log.error('SubscriptionContext', 'Purchase error', err, { tier, billingMode });
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsPurchasing(false);
      }
    },
    [findPackageByIdentifier, updateSubscriptionState, checkAndSetFounderStatus],
  );

  // KOOPE+ purchase shortcuts
  const purchasePlusWeekly = useCallback(
    async () => purchaseTier('plus', 'weekly'),
    [purchaseTier],
  );
  const purchasePlusMonthly = useCallback(
    async () => purchaseTier('plus', 'monthly'),
    [purchaseTier],
  );
  const purchasePlusYearly = useCallback(
    async () => purchaseTier('plus', 'yearly'),
    [purchaseTier],
  );

  // KOOPE PRO purchase shortcuts
  const purchaseProWeekly = useCallback(async () => purchaseTier('pro', 'weekly'), [purchaseTier]);
  const purchaseProMonthly = useCallback(
    async () => purchaseTier('pro', 'monthly'),
    [purchaseTier],
  );
  const purchaseProYearly = useCallback(async () => purchaseTier('pro', 'yearly'), [purchaseTier]);

  // Prestige purchase shortcuts (no weekly option)
  const purchasePrestigeMonthly = useCallback(
    async () => purchaseTier('prestige', 'monthly'),
    [purchaseTier],
  );
  const purchasePrestigeYearly = useCallback(
    async () => purchaseTier('prestige', 'yearly'),
    [purchaseTier],
  );

  /**
   * Restore previous purchases
   */
  const restorePurchases = useCallback(async (): Promise<PurchaseResult> => {
    log.fn('SubscriptionContext', 'restorePurchases');

    if (!revenueCatConfiguredRef.current) {
      const errorMessage = 'RevenueCat is still initializing. Please try again in a moment.';
      log.warn('SubscriptionContext', 'Restore attempted before RevenueCat configuration');
      return { success: false, error: errorMessage };
    }

    try {
      setIsPurchasing(true);
      setError(null); // Clear any previous errors
      const info = await Purchases.restorePurchases();
      updateSubscriptionState(info);
      log.info('SubscriptionContext', 'Purchases restored successfully');
      return { success: true, customerInfo: info };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore purchases';
      log.error('SubscriptionContext', 'Error restoring purchases', err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsPurchasing(false);
    }
  }, [updateSubscriptionState]);

  /**
   * Start a 7-day free trial.
   * Finds the yearly package for the tier (most likely to have a trial offer) and
   * initiates the purchase. RevenueCat handles the trial natively via introductoryDiscount.
   * On success, persists trial state to useUserTier for local gating.
   */
  const startFreeTrial = useCallback(
    async (tier: 'plus' | 'pro'): Promise<PurchaseResult> => {
      const productId =
        tier === 'plus' ? SUBSCRIPTION_PRODUCTS.PLUS_YEARLY : SUBSCRIPTION_PRODUCTS.PRO_YEARLY;

      try {
        setIsPurchasing(true);
        setError(null);

        const pkg = await findPackageByIdentifier(productId);
        if (!pkg) {
          const errorMsg = `Trial package not found for tier: ${tier}`;
          log.warn('SubscriptionContext', errorMsg);
          return { success: false, error: errorMsg };
        }

        // RevenueCat automatically applies the introductory price/trial when purchasing.
        // updateSubscriptionState (above) already sets `tier` from the entitlement
        // RevenueCat actually granted — mark the trial metadata only (Phase 0.9/0.7
        // fix for useUserTier's duplicate-tier-write: the old code called
        // tierStore.startTrial(userTier, 7) here, which re-set `tier` a second time
        // from the *requested* tier, not what RevenueCat actually confirmed).
        const { customerInfo: updatedInfo } = await Purchases.purchasePackage(pkg);
        updateSubscriptionState(updatedInfo);

        const tierStore = useUserTier.getState();
        tierStore.markTrialStarted(7);

        log.info('SubscriptionContext', 'Trial started', { tier });
        return { success: true, customerInfo: updatedInfo };
      } catch (err: any) {
        if (err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR || err.userCancelled) {
          return { success: false, userCancelled: true };
        }
        const errorMessage = err.message || 'Failed to start trial';
        log.error('SubscriptionContext', 'Trial start error', err);
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsPurchasing(false);
      }
    },
    [findPackageByIdentifier, updateSubscriptionState],
  );

  /**
   * Refresh subscription status from RevenueCat
   */
  const refreshSubscriptionStatus = useCallback(async () => {
    log.fn('SubscriptionContext', 'refreshSubscriptionStatus');

    if (!revenueCatConfiguredRef.current) {
      log.warn(
        'SubscriptionContext',
        'Skipping refreshSubscriptionStatus until RevenueCat is configured',
      );
      return;
    }

    try {
      setIsLoading(true);
      const info = await Purchases.getCustomerInfo();
      updateSubscriptionState(info);
      setError(null);
      log.info('SubscriptionContext', 'Subscription status refreshed successfully');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to refresh subscription status';
      log.error('SubscriptionContext', 'Error refreshing subscription', err);
      setError(errorMessage);
      // Don't block the app - just mark as non-subscriber
      setIsKoopePro(false);
      setIsPro(false);
      setIsPrestige(false);
      setIsSubscriber(false);
    } finally {
      setIsLoading(false);
    }
  }, [updateSubscriptionState]);

  /**
   * Initialize RevenueCat on mount
   */
  useEffect(() => {
    const initializeRevenueCat = async () => {
      try {
        setIsLoading(true);

        // Select API key based on platform
        const apiKey =
          Platform.OS === 'ios' ? REVENUECAT_CONFIG.IOS_API_KEY : REVENUECAT_CONFIG.ANDROID_API_KEY;

        const validation = getRevenueCatConfigValidation();
        const platformValid = Platform.OS === 'ios' ? validation.iosValid : validation.androidValid;
        const strictRevenueCatMode =
          !__DEV__ || process.env.EXPO_PUBLIC_REVENUECAT_STRICT_MODE === 'true';

        // Prevent silent free-mode fallback in strict/release builds.
        if (!platformValid) {
          const errorMessage = `RevenueCat key invalid for ${Platform.OS}. Check EXPO_PUBLIC_REVENUECAT_${Platform.OS === 'ios' ? 'IOS' : 'ANDROID'}_KEY.`;
          if (strictRevenueCatMode) {
            log.error(
              'SubscriptionContext',
              'RevenueCat configuration invalid in strict mode',
              new Error(errorMessage),
              {
                platform: Platform.OS,
                strictRevenueCatMode,
              },
            );
            setError(errorMessage);
            setIsLoading(false);
            return;
          }

          log.info('SubscriptionContext', 'RevenueCat not configured - running in free mode');

          // Apply dev tier override even when RevenueCat key is missing (Expo Go / simulator)
          if (__DEV__) {
            const devTier = process.env.EXPO_PUBLIC_DEV_TIER_OVERRIDE as UserTier | undefined;
            if (devTier === 'PRO' || devTier === 'PLUS') {
              log.info('SubscriptionContext', `DEV_TIER_OVERRIDE active (no RC key): ${devTier}`);
              const tierStore = useUserTier.getState();
              tierStore.setTier(devTier);
              tierStore.setSubscriptionStatus('active');
              setIsKoopePro(true);
              setIsPro(devTier === 'PRO');
              setIsPrestige(false);
              setIsSubscriber(true);
            }
          }

          setIsLoading(false);
          return;
        }

        // Configure RevenueCat with debug logging in development
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        // Configure RevenueCat
        await Purchases.configure({
          apiKey,
          appUserID: undefined, // Anonymous user for now
        });
        revenueCatConfiguredRef.current = true;

        log.info('SubscriptionContext', 'RevenueCat initialized successfully', {
          platform: Platform.OS,
        });

        // Fetch initial offerings
        await getOfferings();

        // Set up customer info update listener
        Purchases.addCustomerInfoUpdateListener((info) => {
          log.info('SubscriptionContext', 'Customer info updated via listener');
          updateSubscriptionState(info);
        });

        // Fetch initial customer info
        const info = await Purchases.getCustomerInfo();
        updateSubscriptionState(info);
        setError(null);

        log.info('SubscriptionContext', 'Initial subscription state loaded', {
          isPro: isEntitlementActive(info.entitlements.active[SUBSCRIPTION_ENTITLEMENTS.KOOPE_PRO]),
          isPrestige: isEntitlementActive(
            info.entitlements.active[SUBSCRIPTION_ENTITLEMENTS.PRESTIGE],
          ),
        });
      } catch (err: any) {
        // Check if this is an Expo Go / native store unavailable error
        const errorMessage = err?.message || String(err);
        const isExpoGoError =
          errorMessage.includes('native store is not available') ||
          errorMessage.includes('Invalid API key') ||
          errorMessage.includes('Expo Go');

        if (isExpoGoError) {
          // Expected in Expo Go - silently continue in free mode
          log.info(
            'SubscriptionContext',
            'Running in Expo Go - IAP not available, using free mode',
          );
        } else {
          log.warn('SubscriptionContext', 'RevenueCat initialization failed', {
            error: errorMessage,
          });
        }

        // In dev, respect EXPO_PUBLIC_DEV_TIER_OVERRIDE so the team can test
        // gated features without a real RevenueCat purchase.
        // Set EXPO_PUBLIC_DEV_TIER_OVERRIDE=PRO (or PLUS) in .env.local.
        if (__DEV__) {
          const devTier = process.env.EXPO_PUBLIC_DEV_TIER_OVERRIDE as UserTier | undefined;
          if (devTier === 'PRO' || devTier === 'PLUS') {
            log.info('SubscriptionContext', `DEV_TIER_OVERRIDE active: ${devTier}`);
            const tierStore = useUserTier.getState();
            tierStore.setTier(devTier);
            tierStore.setSubscriptionStatus('active');
            setIsKoopePro(true);
            setIsPro(devTier === 'PRO');
            setIsSubscriber(true);
          }
        }

        // Continue in free mode (or overridden mode) - don't block the app
        setError(null);
        revenueCatConfiguredRef.current = false;
      } finally {
        setIsLoading(false);
      }
    };

    initializeRevenueCat();
  }, [getOfferings, updateSubscriptionState]);

  // Phase 0.9 guardrail: memoize the context value. All the functions above
  // are now stable (useCallback) so this only recomputes when actual
  // subscription state changes, not on every provider render.
  const value: SubscriptionState = useMemo(
    () => ({
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
      purchasePlusWeekly,
      purchasePlusMonthly,
      purchasePlusYearly,
      purchaseProWeekly,
      purchaseProMonthly,
      purchaseProYearly,
      purchasePrestigeMonthly,
      purchasePrestigeYearly,
      startFreeTrial,
      founderCount,
    }),
    [
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
      purchasePlusWeekly,
      purchasePlusMonthly,
      purchasePlusYearly,
      purchaseProWeekly,
      purchaseProMonthly,
      purchaseProYearly,
      purchasePrestigeMonthly,
      purchasePrestigeYearly,
      startFreeTrial,
      founderCount,
    ],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}
