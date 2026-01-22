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
  // One-time purchases
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  LIFETIME: 'lifetime',

  // KOOPE+ tier subscriptions
  PLUS_WEEKLY: 'plus_weekly',
  PLUS_MONTHLY: 'plus_monthly',
  PLUS_YEARLY: 'plus_yearly',

  // KOOPE PRO tier subscriptions
  PRO_WEEKLY: 'pro_weekly',
  PRO_MONTHLY: 'pro_monthly',
  PRO_YEARLY: 'pro_yearly',

  // Prestige tier subscriptions (legacy)
  PRESTIGE_MONTHLY: 'prestige_monthly',
  PRESTIGE_YEARLY: 'prestige_yearly',
} as const;

/**
 * Pricing configuration for display purposes
 * NOTE: Actual prices come from RevenueCat/App Store Connect
 * These are fallback display values
 */
export const PRICING_DISPLAY = {
  PLUS: {
    weekly: '$2.99',
    monthly: '$8.99',
    yearly: '$59.99',
    yearlySavings: '44%',
  },
  PRO: {
    weekly: '$5.99',
    monthly: '$17.99',
    yearly: '$119.99',
    yearlySavings: '44%',
  },
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
 * NOTE: These are test keys. Replace with production keys before launch.
 * In production, consider using environment variables or secure configuration.
 */
export const REVENUECAT_CONFIG = {
  // Get these from: https://app.revenuecat.com/projects/<your-project>/api-keys
  IOS_API_KEY: 'test_KIZwnFeRKJvlQzvHuvqxkwSdSda',
  ANDROID_API_KEY: 'test_KIZwnFeRKJvlQzvHuvqxkwSdSda',
} as const;

/**
 * Type definitions for type-safe subscription handling
 */
export type SubscriptionEntitlement = typeof SUBSCRIPTION_ENTITLEMENTS[keyof typeof SUBSCRIPTION_ENTITLEMENTS];
export type SubscriptionProduct = typeof SUBSCRIPTION_PRODUCTS[keyof typeof SUBSCRIPTION_PRODUCTS];
