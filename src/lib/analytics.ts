/**
 * ANALYTICS WRAPPER
 * Centralized event tracking for subscription funnel and engagement metrics
 *
 * SDK: Mixpanel
 * Install: npm install mixpanel-react-native
 *
 * SETUP REQUIRED:
 * 1. Create Mixpanel account at mixpanel.com
 * 2. Get Project Token from Settings → Project Settings
 * 3. Add MIXPANEL_TOKEN to your environment configuration
 */

import { Mixpanel } from 'mixpanel-react-native';

/**
 * Mixpanel instance
 * Initialize once at app startup
 */
let mixpanel: Mixpanel | null = null;

/**
 * Initialize analytics SDK
 * Call this once in App.tsx before rendering
 *
 * @param token - Mixpanel project token
 */
export async function initAnalytics(token: string): Promise<void> {
  try {
    mixpanel = await Mixpanel.init(token);
    console.log('[Analytics] Mixpanel initialized successfully');
  } catch (error) {
    console.error('[Analytics] Failed to initialize Mixpanel:', error);
  }
}

/**
 * Track an event with optional properties
 *
 * @example
 * ```typescript
 * trackEvent('Paywall Viewed', { source: 'home_bar', tier: 'pro' });
 * ```
 */
export function trackEvent(name: string, props?: Record<string, any>): void {
  try {
    if (!mixpanel) {
      console.warn('[Analytics] Mixpanel not initialized, event not tracked:', name);
      return;
    }

    mixpanel.track(name, props);
    console.log('[Analytics] Event tracked:', name, props);
  } catch (error) {
    console.error('[Analytics] Error tracking event:', name, error);
  }
}

/**
 * Set user identity
 * Call this after user signs up or logs in
 *
 * @example
 * ```typescript
 * setUserId('user_12345');
 * ```
 */
export function setUserId(userId: string): void {
  try {
    if (!mixpanel) {
      console.warn('[Analytics] Mixpanel not initialized, user ID not set');
      return;
    }

    mixpanel.identify(userId);
    console.log('[Analytics] User identified:', userId);
  } catch (error) {
    console.error('[Analytics] Error setting user ID:', error);
  }
}

/**
 * Set user properties
 * Use this to track subscription status, preferences, etc.
 *
 * @example
 * ```typescript
 * setUserProperties({
 *   subscription_tier: 'pro',
 *   subscription_status: 'active',
 *   signup_date: '2025-01-15',
 * });
 * ```
 */
export function setUserProperties(props: Record<string, any>): void {
  try {
    if (!mixpanel) {
      console.warn('[Analytics] Mixpanel not initialized, properties not set');
      return;
    }

    mixpanel.getPeople().set(props);
    console.log('[Analytics] User properties set:', props);
  } catch (error) {
    console.error('[Analytics] Error setting user properties:', error);
  }
}

/**
 * Reset user identity
 * Call this on logout
 */
export function resetUser(): void {
  try {
    if (!mixpanel) {
      console.warn('[Analytics] Mixpanel not initialized, cannot reset user');
      return;
    }

    mixpanel.reset();
    console.log('[Analytics] User reset');
  } catch (error) {
    console.error('[Analytics] Error resetting user:', error);
  }
}

// ============================================================================
// EVENT NAMING CONVENTIONS
// ============================================================================

/**
 * ONBOARDING EVENTS
 */
export const ANALYTICS_EVENTS = {
  // Onboarding
  ONBOARDING_STARTED: 'Onboarding Started',
  ONBOARDING_STEP_COMPLETED: 'Onboarding Step Completed',
  ONBOARDING_COMPLETED: 'Onboarding Completed',

  // Paywall
  PAYWALL_VIEWED: 'Paywall Viewed',
  PAYWALL_CTA_CLICKED: 'Paywall CTA Clicked',
  PURCHASE_STARTED: 'Purchase Started',
  PURCHASE_COMPLETED: 'Purchase Completed',
  PURCHASE_FAILED: 'Purchase Failed',
  PURCHASE_CANCELLED: 'Purchase Cancelled',
  RESTORE_PURCHASES_TAPPED: 'Restore Purchases Tapped',
  RESTORE_PURCHASES_SUCCESS: 'Restore Purchases Success',
  RESTORE_PURCHASES_FAILED: 'Restore Purchases Failed',

  // Lessons
  LESSON_STARTED: 'Lesson Started',
  LESSON_COMPLETED: 'Lesson Completed',

  // Vault
  VAULT_ITEM_OPENED: 'Vault Item Opened',

  // Recipe Saves
  RECIPE_SAVED: 'Recipe Saved',
  RECIPE_UNSAVED: 'Recipe Unsaved',
  RECIPE_SAVE_LIMIT_REACHED: 'Recipe Save Limit Reached',
} as const;

/**
 * PROPERTY NAMING CONVENTIONS
 */
export const ANALYTICS_PROPS = {
  // General
  SOURCE: 'source', // Where the event originated (e.g., 'home_bar', 'cocktail_detail', 'lessons')

  // Onboarding
  STEP_NUMBER: 'step_number',
  STEP_NAME: 'step_name',

  // Paywall
  TIER: 'tier', // 'pro' | 'prestige'
  BILLING_MODE: 'billing_mode', // 'monthly' | 'yearly'
  PRODUCT_ID: 'product_id',
  PRICE: 'price',
  CURRENCY: 'currency',

  // Lessons
  LESSON_ID: 'lesson_id',
  LESSON_TITLE: 'lesson_title',
  LESSON_CATEGORY: 'lesson_category',

  // Vault
  VAULT_ITEM_ID: 'vault_item_id',
  VAULT_ITEM_TITLE: 'vault_item_title',
  VAULT_ITEM_CATEGORY: 'vault_item_category',

  // Recipes
  RECIPE_ID: 'recipe_id',
  RECIPE_NAME: 'recipe_name',
  RECIPE_CATEGORY: 'recipe_category',
  TOTAL_SAVED: 'total_saved',
  SAVE_LIMIT: 'save_limit',
} as const;
