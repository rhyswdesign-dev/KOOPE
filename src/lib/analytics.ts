// @ts-nocheck
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

import React from 'react';
import { Mixpanel } from 'mixpanel-react-native';
import { log } from './logger';

/**
 * Mixpanel instance
 * Initialize once at app startup — but ONLY after analytics consent is
 * confirmed. Calling Mixpanel.init() is itself a tracking action (it
 * generates/reads a device ID), so it must never run before consent is
 * known, not just before the first tracked event.
 */
let mixpanel: Mixpanel | null = null;

/**
 * Consent-gated startup state.
 * - 'unknown': no consent decision stored yet (first run, prompt not
 *   yet answered). Events are buffered, NOT sent, until this resolves.
 * - 'granted': Mixpanel is (or will be) initialized; queued events flush.
 * - 'declined': Mixpanel is never initialized; queued events are dropped.
 */
type ConsentState = 'unknown' | 'granted' | 'declined';
let consentState: ConsentState = 'unknown';
let pendingToken: string | null = null;

const MAX_QUEUED_EVENTS = 100;
let eventQueue: { name: string; props?: Record<string, any> }[] = [];

/**
 * Raw Mixpanel init — never call directly from app code. Only reached
 * via initAnalyticsWithConsent (consent already confirmed granted) or
 * notifyAnalyticsConsent (consent just changed to granted).
 */
async function initMixpanelSdk(token: string): Promise<void> {
  try {
    mixpanel = await Mixpanel.init(token);
    log.info('Analytics', 'Mixpanel initialized successfully');
  } catch (error) {
    log.error('Analytics', 'Failed to initialize Mixpanel', error);
  }
}

/**
 * Consent-aware analytics bootstrap. Call this once in App.tsx at
 * startup instead of initializing Mixpanel directly.
 *
 * Checks the stored consent choice (via consentStore, the same store
 * ConsentCenterScreen and useConsent read/write):
 *  - No choice stored yet -> stays 'unknown'; every trackEvent() call
 *    until the user answers is buffered in memory, never sent.
 *  - Choice stored + analytics granted -> initializes Mixpanel now.
 *  - Choice stored + analytics declined -> never initializes Mixpanel;
 *    buffered events (if any) are dropped.
 *
 * @param token - Mixpanel project token
 */
export async function initAnalyticsWithConsent(token: string): Promise<void> {
  pendingToken = token;
  try {
    // Local import to avoid a hard circular import at module-load time
    // (consentStore also calls back into this file on save).
    const { hasStoredConsentChoices, getConsentChoices } = await import('./consentStore');
    const hasChoice = await hasStoredConsentChoices();

    if (!hasChoice) {
      consentState = 'unknown';
      log.info('Analytics', 'No consent decision stored yet — Mixpanel init deferred');
      return;
    }

    const choices = await getConsentChoices();
    if (choices.analytics) {
      consentState = 'granted';
      await initMixpanelSdk(token);
    } else {
      consentState = 'declined';
      log.info('Analytics', 'Analytics consent previously declined — Mixpanel not initialized');
    }
  } catch (error) {
    log.error('Analytics', 'Failed to resolve consent state at startup', error);
    // Fail closed: stay 'unknown' rather than silently tracking.
  }
}

/**
 * Called by consentStore.saveConsentChoices() whenever the user's
 * analytics consent choice changes (initial answer, or a later change
 * via ConsentCenterScreen). This is the single notification point for
 * every consent-saving code path (updateConsent / saveAllConsent /
 * acceptAllConsent / rejectAllConsent all funnel through it).
 */
export function notifyAnalyticsConsent(granted: boolean): void {
  if (granted) {
    consentState = 'granted';
    if (!mixpanel && pendingToken) {
      initMixpanelSdk(pendingToken).then(() => flushQueue());
    } else {
      flushQueue();
    }
  } else {
    consentState = 'declined';
    // Drop anything buffered pre-consent — never send it.
    eventQueue = [];
    log.info('Analytics', 'Analytics consent declined — buffered events dropped');
  }
}

function flushQueue(): void {
  if (!mixpanel || eventQueue.length === 0) return;
  const queued = eventQueue;
  eventQueue = [];
  for (const { name, props } of queued) {
    try {
      mixpanel.track(name, props);
    } catch (error) {
      log.error('Analytics', 'Error flushing queued event', error, { name });
    }
  }
  log.info('Analytics', 'Flushed queued pre-consent events', { count: queued.length });
}

/**
 * Track an event with optional properties. Consent-gated:
 *  - consent unknown -> buffered (capped), not sent, until resolved.
 *  - consent declined -> dropped immediately, never sent.
 *  - consent granted -> sent to Mixpanel now.
 *
 * @example
 * ```typescript
 * trackEvent('Paywall Viewed', { source: 'home_bar', tier: 'pro' });
 * ```
 */
export function trackEvent(name: string, props?: Record<string, any>): void {
  if (consentState === 'declined') {
    return;
  }

  if (consentState === 'unknown' || !mixpanel) {
    if (consentState === 'unknown') {
      if (eventQueue.length >= MAX_QUEUED_EVENTS) {
        eventQueue.shift();
      }
      eventQueue.push({ name, props });
    } else {
      log.warn('Analytics', 'Mixpanel not initialized, event not tracked', { name });
    }
    return;
  }

  try {
    mixpanel.track(name, props);
    log.info('Analytics', 'Event tracked', { name, props });
  } catch (error) {
    log.error('Analytics', 'Error tracking event', error, { name });
  }
}

/**
 * Screen view convenience wrapper (kept for parity with the old
 * services/analytics.ts facade that this file replaces).
 */
export function trackScreen(screenName: string, properties?: Record<string, any>): void {
  trackEvent('Screen Viewed', { screen_name: screenName, ...properties });
}

/**
 * Screen-view tracking hook (replaces the old useScreenTracking from
 * the deleted src/context/AnalyticsContext.tsx — same call signature).
 */
export function useScreenTracking(screenName: string, properties?: Record<string, any>): void {
  React.useEffect(() => {
    trackScreen(screenName, properties);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenName]);
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
      log.warn('Analytics', 'Mixpanel not initialized, user ID not set');
      return;
    }

    mixpanel.identify(userId);
    log.info('Analytics', 'User identified', { userId });
  } catch (error) {
    log.error('Analytics', 'Error setting user ID', error);
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
      log.warn('Analytics', 'Mixpanel not initialized, properties not set');
      return;
    }

    mixpanel.getPeople().set(props);
    log.info('Analytics', 'User properties set', { props });
  } catch (error) {
    log.error('Analytics', 'Error setting user properties', error);
  }
}

/**
 * Reset user identity
 * Call this on logout
 */
export function resetUser(): void {
  try {
    if (!mixpanel) {
      log.warn('Analytics', 'Mixpanel not initialized, cannot reset user');
      return;
    }

    mixpanel.reset();
    log.info('Analytics', 'User reset');
  } catch (error) {
    log.error('Analytics', 'Error resetting user', error);
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
  AGE_GATE_PASSED: 'Age Gate Passed',
  AGE_GATE_FAILED: 'Age Gate Failed',

  // Paywall & Monetization
  PAYWALL_VIEWED: 'Paywall Viewed',
  PAYWALL_CTA_CLICKED: 'Paywall CTA Clicked',
  PURCHASE_STARTED: 'Purchase Started',
  PURCHASE_COMPLETED: 'Purchase Completed',
  PURCHASE_FAILED: 'Purchase Failed',
  PURCHASE_CANCELLED: 'Purchase Cancelled',
  RESTORE_PURCHASES_TAPPED: 'Restore Purchases Tapped',
  RESTORE_PURCHASES_SUCCESS: 'Restore Purchases Success',
  RESTORE_PURCHASES_FAILED: 'Restore Purchases Failed',
  UPGRADE_VIEWED: 'Upgrade Viewed', // In-context upgrade prompt (distinct from paywall)
  UPGRADE_COMPLETED: 'Upgrade Completed', // Tier change event
  PAYWALL_OFFER_SELECTED: 'Paywall Offer Selected',
  PAYWALL_OFFER_CONFIRMED: 'Paywall Offer Confirmed',
  PAYWALL_SKIPPED: 'Paywall Skipped',
  PAYWALL_FOUNDERS_TOGGLED: 'Paywall Founders Toggled',

  // Feature Gating (universal gate tracking)
  FEATURE_GATED: 'Feature Gated', // Fires on any gate block: { feature, required_tier, user_tier }

  // Scanning
  SCAN_ATTEMPT: 'Scan Attempt',
  SCAN_SUCCESS: 'Scan Success',
  SCAN_FAILED: 'Scan Failed',
  SCAN_LIMIT_REACHED: 'Scan Limit Reached',

  // Value-on-scan (Phase 1.2). Acceptance metric "≥60% of scans show a
  // value line" = VALUE_LINE_SHOWN / SCAN_SUCCESS as a Mixpanel ratio.
  VALUE_LINE_SHOWN: 'Value Line Shown',
  SPOTTED_PRICE_LOGGED: 'Spotted Price Logged',
  VALUE_VERDICT_SHOWN: 'Value Verdict Shown',

  // Inventory
  INVENTORY_ITEM_ADDED: 'Inventory Item Added',
  INVENTORY_ITEM_REMOVED: 'Inventory Item Removed',
  INVENTORY_LIMIT_REACHED: 'Inventory Limit Reached',

  // Lessons
  LESSON_STARTED: 'Lesson Started',
  LESSON_COMPLETED: 'Lesson Completed',
  LESSON_ITEM_ATTEMPTED: 'Lesson Item Attempted',
  XP_AWARDED: 'XP Awarded',

  // Vault
  VAULT_ITEM_OPENED: 'Vault Item Opened',
  VAULT_ITEM_UNLOCKED: 'Vault Item Unlocked',

  // Recipe Saves
  RECIPE_SAVED: 'Recipe Saved',
  RECIPE_UNSAVED: 'Recipe Unsaved',
  RECIPE_SAVE_LIMIT_REACHED: 'Recipe Save Limit Reached',

  // Recipe Views & Engagement
  RECIPE_VIEWED: 'Recipe Viewed',
  RECIPE_ENGAGEMENT: 'Recipe Engagement',
  RECIPE_MADE: 'Recipe Made',
  RECIPE_SHARED: 'Recipe Shared',

  // Taste Match & Intelligence
  TASTE_MATCH_VIEWED: 'Taste Match Viewed',
  TASTE_MATCH_CLICKED: 'Taste Match Clicked',
  TASTE_PROFILE_INITIALIZED: 'Taste Profile Initialized',

  // Filters & Discovery
  FILTER_ADVANCED_ATTEMPTED: 'Filter Advanced Attempted', // FREE user tries advanced filter
  WHAT_CAN_I_MAKE_SEARCHED: 'What Can I Make Searched',

  // Hosting & Party
  HOSTING_MODE_OPENED: 'Hosting Mode Opened',
  PARTY_SCALED: 'Party Scaled',
  BATCH_CALCULATED: 'Batch Calculated',

  // Commerce & Shopping
  CART_ITEM_ADDED: 'Cart Item Added',
  SHOPPING_LIST_EXPORTED: 'Shopping List Exported',
  MISSING_INGREDIENT_VIEWED: 'Missing Ingredient Viewed',
  AFFILIATE_LINK_CLICKED: 'Affiliate Link Clicked',

  // AI / Bartender
  BARTENDER_MESSAGE_SENT: 'Bartender Message Sent',
  BARTENDER_LIMIT_REACHED: 'Bartender Limit Reached',
  AI_RECIPE_GENERATED: 'AI Recipe Generated',

  // Pro Builder Features
  PRO_BUILDER_ATTEMPT: 'Pro Builder Attempt', // User tries remix/flavor controls
  REMIX_ENGINE_USED: 'Remix Engine Used',
  OPTIMIZE_MY_BAR_VIEWED: 'Optimize My Bar Viewed',

  // Achievements
  ACHIEVEMENT_UNLOCKED: 'Achievement Unlocked',

  // Uploads
  UPLOAD_STARTED: 'Upload Started',
  UPLOAD_COMPLETED: 'Upload Completed',
  UPLOAD_FAILED: 'Upload Failed',
  RECIPE_SUBMITTED: 'Recipe Submitted',
  COMPETITION_ENTRY_SUBMITTED: 'Competition Entry Submitted',
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

  // Paywall & Tiers
  TIER: 'tier', // 'free' | 'plus' | 'pro'
  BILLING_MODE: 'billing_mode', // 'monthly' | 'yearly'
  PRODUCT_ID: 'product_id',
  PRICE: 'price',
  CURRENCY: 'currency',

  // Value-on-scan (Phase 1.2)
  VALUE_SOURCE: 'value_source',
  VERDICT: 'verdict',
  CAPTURE_POINT: 'capture_point',
  PREVIOUS_TIER: 'previous_tier',
  NEW_TIER: 'new_tier',

  // Feature Gating
  FEATURE: 'feature', // Which feature was gated
  REQUIRED_TIER: 'required_tier', // Tier needed to access
  USER_TIER: 'user_tier', // User's current tier

  // Scanning
  SCAN_TYPE: 'scan_type', // 'bottle' | 'ingredient' | 'recipe'
  ITEM_NAME: 'item_name',
  DETECTION_CONFIDENCE: 'detection_confidence',
  MONTHLY_SCAN_COUNT: 'monthly_scan_count',

  // Inventory
  INVENTORY_COUNT: 'inventory_count',
  INVENTORY_LIMIT: 'inventory_limit',

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
  VIEW_DURATION_SECONDS: 'view_duration_seconds',
  SHARE_METHOD: 'share_method',
  TASTE_MATCH_PERCENT: 'taste_match_percent',

  // Hosting
  GUEST_COUNT: 'guest_count',
  BATCH_SIZE: 'batch_size',
  RECIPES_SELECTED: 'recipes_selected',

  // Commerce
  INGREDIENT_NAME: 'ingredient_name',
  UNLOCK_COUNT: 'unlock_count', // How many cocktails unlocked by adding ingredient
  AFFILIATE_PROVIDER: 'affiliate_provider',

  // AI / Bartender
  MESSAGE_COUNT: 'message_count',
  AI_MODEL: 'ai_model',

  // Achievements
  ACHIEVEMENT_ID: 'achievement_id',
  ACHIEVEMENT_TITLE: 'achievement_title',
  ACHIEVEMENT_CATEGORY: 'achievement_category',
  ACHIEVEMENT_RARITY: 'achievement_rarity',
  XP_REWARD: 'xp_reward',

  // Uploads
  UPLOAD_TYPE: 'upload_type', // 'image' | 'video' | 'document'
  FILE_SIZE: 'file_size',
  FILE_COUNT: 'file_count',
  DURATION_MS: 'duration_ms',
  ERROR_MESSAGE: 'error_message',
} as const;
