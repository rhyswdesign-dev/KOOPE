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

import { Mixpanel } from 'mixpanel-react-native';
import { log } from './logger';

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
    log.info('Analytics', 'Mixpanel initialized successfully');
  } catch (error) {
    log.error('Analytics', 'Failed to initialize Mixpanel', error);
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
      log.warn('Analytics', 'Mixpanel not initialized, event not tracked', { name });
      return;
    }

    mixpanel.track(name, props);
    log.info('Analytics', 'Event tracked', { name, props });
  } catch (error) {
    log.error('Analytics', 'Error tracking event', error, { name });
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

  // Inventory
  INVENTORY_ITEM_ADDED: 'Inventory Item Added',
  INVENTORY_ITEM_REMOVED: 'Inventory Item Removed',
  INVENTORY_LIMIT_REACHED: 'Inventory Limit Reached',

  // Lessons
  LESSON_STARTED: 'Lesson Started',
  LESSON_COMPLETED: 'Lesson Completed',

  // Vault
  VAULT_ITEM_OPENED: 'Vault Item Opened',

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
