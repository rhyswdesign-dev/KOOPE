/**
 * Stripe API Client
 * Handles communication with backend Stripe endpoints
 */

import { log } from './logger';
import { CURRENCY } from '../config/stripe';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Supabase Edge Functions URL
// Functions are deployed at: https://<project-ref>.supabase.co/functions/v1/<function-name>
const SUPABASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const API_BASE_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : '';

interface CreatePaymentIntentParams {
  amount: number;  // Amount in cents
  currency?: string;
  userId: string;
  paymentMethodId?: string;
  metadata?: Record<string, string>;
}

interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  ephemeralKey?: string;
  customer?: string;
}

/**
 * Create a Stripe payment intent
 * This calls your backend which creates the payment intent with your Stripe secret key
 */
export async function createPaymentIntent(
  params: CreatePaymentIntentParams
): Promise<CreatePaymentIntentResponse | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      log.error('StripeAPI', 'Not authenticated')
      return null
    }

    const response = await fetch(`${API_BASE_URL}/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        amount: params.amount,
        currency: params.currency || CURRENCY,
        // userId is derived server-side from the JWT — do not send it
        paymentMethodId: params.paymentMethodId,
        metadata: params.metadata,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      log.error('StripeAPI', 'Failed to create payment intent', errorData);
      return null;
    }

    const data = await response.json();

    log.info('StripeAPI', 'Payment intent created', {
      paymentIntentId: data.paymentIntentId,
      amount: params.amount,
    });

    return data;
  } catch (error) {
    log.error('StripeAPI', 'Error creating payment intent', error);
    return null;
  }
}

/**
 * Confirm a payment intent on the backend
 * Used for server-side confirmation after client-side setup
 */
export async function confirmPaymentIntent(
  paymentIntentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' }
    }

    const response = await fetch(`${API_BASE_URL}/confirm-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ paymentIntentId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error || 'Failed to confirm payment',
      };
    }

    return { success: true };
  } catch (error) {
    log.error('StripeAPI', 'Error confirming payment intent', error);
    return {
      success: false,
      error: 'Payment confirmation failed',
    };
  }
}

/**
 * Retrieve payment intent status
 * Note: Status updates are handled by Stripe webhooks
 * This function is kept for potential future use
 */
export async function getPaymentIntentStatus(
  paymentIntentId: string
): Promise<{ status: string; error?: string } | null> {
  // Status tracking is handled by webhooks
  // Payment status is updated in the vault_transactions table
  log.warn('StripeAPI', 'Payment status should be checked via database, not direct API call');
  return null;
}
