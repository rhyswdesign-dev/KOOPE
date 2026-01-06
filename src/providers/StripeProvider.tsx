/**
 * Stripe Provider
 * Wraps app with Stripe SDK context
 */

import React from 'react';
import { StripeProvider as StripeSDKProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUBLISHABLE_KEY, STRIPE_CONFIG } from '../config/stripe';
import { log } from '../lib/logger';

interface StripeProviderProps {
  children: React.ReactNode;
}

export function StripeProvider({ children }: StripeProviderProps) {
  // Validate publishable key
  if (!STRIPE_PUBLISHABLE_KEY || STRIPE_PUBLISHABLE_KEY.includes('YOUR_')) {
    log.warn('StripeProvider', 'Stripe publishable key not configured');
  }

  return (
    <StripeSDKProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier={STRIPE_CONFIG.merchantDisplayName}
      urlScheme={STRIPE_CONFIG.urlScheme}
      setReturnUrlSchemeOnAndroid={STRIPE_CONFIG.setReturnUrlSchemeOnAndroid}
    >
      {children}
    </StripeSDKProvider>
  );
}
