# Stripe Backend Setup Guide

## Overview

The Home Game Advantage ap p requires a backend service to handle Stripe payments securely. This document outlines the required backend endpoints and implementation details.

## Why Backend is Required

Stripe payments require your **Stripe Secret Key** which **MUST NEVER** be included in the mobile app. The app only contains the **Stripe Publishable Key** (safe to expose). All payment intent creation must happen on your backend.

## Required Environment Variables

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE
STRIPE_SECRET_KEY_LIVE=sk_live_... # Add when ready for production

# Stripe Webhook Secret (get from https://dashboard.stripe.com/webhooks after creating endpoint)
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Required Backend Endpoints

### 1. Create Payment Intent

**Endpoint**: `POST /api/stripe/create-payment-intent`

**Request Body**:
```json
{
  "amount": 1000,           // Amount in cents (e.g., $10.00)
  "currency": "usd",
  "userId": "user-uuid",
  "paymentMethodId": "pm_...", // Optional
  "metadata": {
    "type": "vault_purchase",
    "userId": "user-uuid",
    "itemId": "vault_keys_5"
  }
}
```

**Response**:
```json
{
  "clientSecret": "pi_...secret...",
  "paymentIntentId": "pi_...",
  "ephemeralKey": "ek_test_...",  // Optional, for Apple Pay/Google Pay
  "customer": "cus_..."           // Optional, if using Stripe Customers
}
```

**Implementation Example (Node.js/Express)**:
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/stripe/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency, userId, metadata } = req.body;

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        userId,
        ...metadata,
      },
      // Optional: attach to a customer for saved payment methods
      // customer: customerId,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 2. Confirm Payment Intent (Optional)

**Endpoint**: `POST /api/stripe/confirm-payment-intent`

**Request Body**:
```json
{
  "paymentIntentId": "pi_..."
}
```

**Response**:
```json
{
  "success": true
}
```

**Implementation**:
```javascript
app.post('/api/stripe/confirm-payment-intent', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

    res.json({ success: paymentIntent.status === 'succeeded' });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: error.message, success: false });
  }
});
```

### 3. Get Payment Intent Status

**Endpoint**: `GET /api/stripe/payment-intent/:paymentIntentId`

**Response**:
```json
{
  "status": "succeeded" // or "requires_payment_method", "processing", etc.
}
```

**Implementation**:
```javascript
app.get('/api/stripe/payment-intent/:paymentIntentId', async (req, res) => {
  try {
    const { paymentIntentId } = req.params;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    res.json({ status: paymentIntent.status });
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});
```

### 4. Webhook Handler (Critical for Production)

**Endpoint**: `POST /api/stripe/webhook`

This endpoint receives Stripe webhook events to handle payment confirmations, failures, and refunds.

**Implementation**:
```javascript
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);

      // TODO: Update your database to mark the purchase as complete
      // Use paymentIntent.metadata.userId to identify the user

      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);

      // TODO: Handle failed payment (notify user, log, etc.)

      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});
```

## Stripe Dashboard Setup

### 1. Get API Keys
1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (already in `src/config/stripe.ts`)
3. Copy your **Secret key** (add to backend environment variables)

### 2. Set Up Webhooks
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your backend URL: `https://your-backend.com/api/stripe/webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
5. Copy the **Signing secret** to your environment variables

## Security Best Practices

1. **Never expose secret keys**: Secret keys must only exist on your backend
2. **Verify webhook signatures**: Always verify webhook signatures to prevent spoofing
3. **Use HTTPS**: All API endpoints must use HTTPS in production
4. **Validate amounts**: Always validate payment amounts on the backend
5. **Idempotency**: Use Stripe's idempotency keys for payment creation
6. **Customer IDs**: Consider using Stripe Customer objects to save payment methods

## Testing

### Test Cards
Use these test cards in development (with test keys):

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Use any future expiration date, any 3-digit CVC, and any ZIP code.

### Test Webhook Locally
Use Stripe CLI to forward webhooks to localhost:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Backend Options

You can implement this backend using:

1. **Node.js/Express** (examples above)
2. **Supabase Edge Functions** (serverless)
3. **Firebase Cloud Functions** (serverless)
4. **AWS Lambda** (serverless)
5. **Any other backend framework**

## Next Steps

1. Set up your backend service
2. Implement the 4 required endpoints
3. Update `API_BASE_URL` in `src/lib/stripeApi.ts` with your backend URL
4. Add your Stripe publishable key to `src/config/stripe.ts`
5. Test payment flow end-to-end
6. Set up webhooks for production

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe React Native SDK](https://github.com/stripe/stripe-react-native)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Webhook Event Types](https://stripe.com/docs/api/events/types)
