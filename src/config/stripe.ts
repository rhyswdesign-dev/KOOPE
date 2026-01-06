/**
 * Stripe Configuration
 * Handles Stripe SDK setup and constants
 */

// Stripe publishable keys (use environment variables in production)
export const STRIPE_PUBLISHABLE_KEY_TEST = 'pk_test_51SjmUHKUqjaEOsomOWrVHbPRJCNnkoONH8P3SH61n7r8C7GEVMALSJagTngnfEXU6qHbPzhoHeYQusWUCzmKsL7K00TnVxe9Qr';
export const STRIPE_PUBLISHABLE_KEY_LIVE = 'pk_live_YOUR_LIVE_KEY_HERE'; // Replace when ready for production

// Use test key by default in development
export const STRIPE_PUBLISHABLE_KEY = __DEV__
  ? STRIPE_PUBLISHABLE_KEY_TEST
  : STRIPE_PUBLISHABLE_KEY_LIVE;

// Stripe API configuration
export const STRIPE_CONFIG = {
  // Merchant display name
  merchantDisplayName: 'Home Game Advantage',

  // URL scheme for return URLs
  urlScheme: 'homegameadvantage',

  // Set to true to allow delayed presentation of Apple Pay/Google Pay
  setReturnUrlSchemeOnAndroid: true,
};

// Payment method types
export const PAYMENT_METHODS = {
  CARD: 'Card',
  APPLE_PAY: 'ApplePay',
  GOOGLE_PAY: 'GooglePay',
} as const;

// Currency
export const CURRENCY = 'usd';

// Vault cash product IDs (for tracking)
export const VAULT_CASH_PRODUCTS = {
  KEYS_5: 'vault_keys_5',
  KEYS_10: 'vault_keys_10',
  KEYS_25: 'vault_keys_25',
  KEYS_50: 'vault_keys_50',
  CASH_DISCOUNT: 'vault_cash_discount',
} as const;
