/**
 * SUBSCRIPTION CONSTANTS
 * RevenueCat entitlement and product IDs
 *
 * Configured for KOOPE app with Pro and Prestige tiers
 */

/**
 * Entitlement identifiers used to check subscription status
 * These must match the entitlement IDs configured in RevenueCat dashboard
 */
export const SUBSCRIPTION_ENTITLEMENTS = {
  KOOPE_PLUS: 'KOOPE+',
  KOOPE_PRO: 'KOOPE - Pro', // Matches RevenueCat dashboard identifier
  KOOPE_PRO_ALT: 'KOOPE Pro', // Alternative PRO entitlement
  PRESTIGE: 'prestige',
} as const;

/**
 * Product identifiers for subscription offerings
 * These must match the product IDs configured in:
 * - App Store Connect (iOS)
 * - Google Play Console (Android)
 * - RevenueCat dashboard
 */
export const SUBSCRIPTION_PRODUCTS = {
  // KOOPE+ tier subscriptions
  PLUS_YEARLY: 'plus_yearly',
  PLUS_MONTHLY: 'plus_monthly',

  // KOOPE PRO tier subscriptions
  PRO_YEARLY: 'pro_yearly',
  PRO_MONTHLY: 'pro_monthly',

  // Legacy (kept for migration / restore flows)
  PLUS_QUARTERLY: 'plus_quarterly',
  PRO_QUARTERLY: 'pro_quarterly',
  PLUS_WEEKLY: 'plus_weekly',
  PRO_WEEKLY: 'pro_weekly',
  PRESTIGE_MONTHLY: 'prestige_monthly',
  PRESTIGE_YEARLY: 'prestige_yearly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  LIFETIME: 'lifetime',
} as const;

/**
 * Pricing configuration for display purposes
 * NOTE: Actual prices come from RevenueCat/App Store Connect
 * These are fallback display values
 */
export const PRICING_DISPLAY = {
  // KŌOPE+ — confirmed live production pricing (App Store Connect / RevenueCat).
  // $59/yr (shown as $4.92/mo, "SAVE 30%" vs monthly) or $6.99/mo.
  PLUS: {
    yearly: '$59',
    yearlyPerMonth: '$4.92',
    yearlySavings: '30%',
    monthly: '$6.99',
    monthlyPerMonth: '$6.99',
  },
  PRO: {
    yearly: '$119',
    yearlyPerMonth: '$9.92',
    yearlySavings: '24%',
    monthly: '$14.99',
    monthlyPerMonth: '$14.99',
  },
  FOUNDERS: {
    PLUS: { yearly: '$29', yearlyPerMonth: '$2.42' },
    PRO: { yearly: '$79', yearlyPerMonth: '$6.58' },
    label: 'Founders',
  },
} as const;

/**
 * Stripe Price IDs for web / Stripe Checkout flows
 * These must match the price IDs configured in the Stripe dashboard
 */
export const STRIPE_PRICE_IDS = {
  PLUS_YEARLY: process.env.EXPO_PUBLIC_STRIPE_PLUS_YEARLY || 'price_PLACEHOLDER_plus_yearly',
  PLUS_MONTHLY: process.env.EXPO_PUBLIC_STRIPE_PLUS_MONTHLY || 'price_PLACEHOLDER_plus_monthly',
  PLUS_FOUNDERS: process.env.EXPO_PUBLIC_STRIPE_PLUS_FOUNDERS || 'price_PLACEHOLDER_plus_founders',
  PRO_YEARLY: process.env.EXPO_PUBLIC_STRIPE_PRO_YEARLY || 'price_PLACEHOLDER_pro_yearly',
  PRO_MONTHLY: process.env.EXPO_PUBLIC_STRIPE_PRO_MONTHLY || 'price_PLACEHOLDER_pro_monthly',
  PRO_FOUNDERS: process.env.EXPO_PUBLIC_STRIPE_PRO_FOUNDERS || 'price_PLACEHOLDER_pro_founders',
} as const;

/**
 * Offering identifiers for RevenueCat Paywalls
 * These define different subscription packages to present to users
 */
export const OFFERINGS = {
  DEFAULT: null, // Default offering
  PRO: 'pro',
  PRESTIGE: 'prestige',
  ONBOARDING: 'onboarding',
} as const;

/**
 * RevenueCat API Keys
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://app.revenuecat.com and create a project for KOOPE
 * 2. Navigate to API Keys section
 * 3. Copy the iOS and Android public API keys
 * 4. Add them to your .env file as:
 *    EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxxxxxxxxxxxx
 *    EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxxx
 *
 * For production, these should be set in your CI/CD environment
 */
export const REVENUECAT_CONFIG = {
  IOS_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || 'appl_PLACEHOLDER_REPLACE_ME',
  ANDROID_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'goog_PLACEHOLDER_REPLACE_ME',
} as const;

/**
 * Check if a RevenueCat key is clearly a placeholder or invalid.
 */
function isInvalidRevenueCatKey(key: string | undefined, platform: 'ios' | 'android'): boolean {
  if (!key) return true;

  const normalized = key.trim();
  const requiredPrefix = platform === 'ios' ? 'appl_' : 'goog_';

  if (!normalized.startsWith(requiredPrefix)) return true;

  const blockedFragments = ['PLACEHOLDER', 'REPLACE_ME', 'appl_your', 'goog_your'];

  return blockedFragments.some((fragment) => normalized.includes(fragment));
}

/**
 * Validate RevenueCat config for runtime guards and CI checks.
 */
export function getRevenueCatConfigValidation() {
  const iosValid = !isInvalidRevenueCatKey(REVENUECAT_CONFIG.IOS_API_KEY, 'ios');
  const androidValid = !isInvalidRevenueCatKey(REVENUECAT_CONFIG.ANDROID_API_KEY, 'android');

  return {
    iosValid,
    androidValid,
    allValid: iosValid && androidValid,
  };
}

/**
 * Type definitions for type-safe subscription handling
 */
export type SubscriptionEntitlement =
  (typeof SUBSCRIPTION_ENTITLEMENTS)[keyof typeof SUBSCRIPTION_ENTITLEMENTS];
export type SubscriptionProduct =
  (typeof SUBSCRIPTION_PRODUCTS)[keyof typeof SUBSCRIPTION_PRODUCTS];
