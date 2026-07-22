# Deploy Stripe Edge Functions to Supabase

## Overview

This guide walks you through deploying the Stripe payment functions to your Supabase project.

## Prerequisites

1. **Supabase CLI installed**
   ```bash
   npm install -g supabase
   ```

2. **Supabase account** with a project created at https://supabase.com

3. **Stripe account** with API keys (already configured in [STRIPE_BACKEND_SETUP.md](STRIPE_BACKEND_SETUP.md))

## Step 1: Login to Supabase CLI

```bash
supabase login
```

This will open a browser window for authentication.

## Step 2: Link Your Project

```bash
# Navigate to your project root
cd /Users/frodobagginz/Documents/test-project/HomeGameAdvantage

# Link to your Supabase project
supabase link --project-ref <your-project-ref>
```

**Finding your project ref:**
- Go to https://supabase.com/dashboard
- Select your project
- The project ref is in the URL: `https://supabase.com/dashboard/project/<project-ref>`
- Or find it in Settings → General → Reference ID

## Step 3: Set Environment Variables (Secrets)

Your Edge Functions need access to your Stripe keys. Set them as secrets:

```bash
# Set Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE

# Set webhook secret (you'll get this after setting up webhooks in Step 5)
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

**Note:** The webhook secret will be generated when you create the webhook endpoint in Step 5.

## Step 4: Deploy the Functions

Deploy all three Stripe functions:

```bash
# Deploy create-payment-intent function
supabase functions deploy create-payment-intent

# Deploy confirm-payment-intent function
supabase functions deploy confirm-payment-intent

# Deploy stripe-webhook function
supabase functions deploy stripe-webhook
```

## Step 5: Set Up Stripe Webhooks

After deploying the webhook function, you need to configure Stripe to send events to it.

### Get Your Webhook URL

After deployment, your webhook URL will be:
```
https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook
```

### Configure in Stripe Dashboard

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Enter your webhook URL: `https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen for:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `payment_intent.canceled`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Set it as a secret:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
   ```

## Step 6: Verify Deployment

Test that your functions are working:

### Test create-payment-intent

```bash
curl -X POST https://<your-project-ref>.supabase.co/functions/v1/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "usd",
    "userId": "test-user-id",
    "metadata": {
      "itemId": "vault_keys_5"
    }
  }'
```

Expected response:
```json
{
  "clientSecret": "pi_...secret...",
  "paymentIntentId": "pi_..."
}
```

### View Function Logs

```bash
# View logs for all functions
supabase functions logs

# View logs for specific function
supabase functions logs create-payment-intent
```

## Step 7: Update App Configuration (Already Done)

The app is already configured to use your Supabase Edge Functions via [src/lib/stripeApi.ts](../src/lib/stripeApi.ts).

The functions will be called at:
- `https://<your-project-ref>.supabase.co/functions/v1/create-payment-intent`
- `https://<your-project-ref>.supabase.co/functions/v1/confirm-payment-intent`

## Function URLs Reference

After deployment, your functions will be available at:

| Function | URL | Method |
|----------|-----|--------|
| Create Payment Intent | `https://<project-ref>.supabase.co/functions/v1/create-payment-intent` | POST |
| Confirm Payment Intent | `https://<project-ref>.supabase.co/functions/v1/confirm-payment-intent` | POST |
| Stripe Webhook | `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` | POST |

## Troubleshooting

### Function deployment fails

```bash
# Check you're linked to the correct project
supabase projects list

# Re-link if needed
supabase link --project-ref <your-project-ref>
```

### Secrets not working

```bash
# List all secrets
supabase secrets list

# Unset and re-set a secret
supabase secrets unset STRIPE_SECRET_KEY
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
```

### Function returns 500 error

```bash
# Check logs
supabase functions logs create-payment-intent --tail
```

Common issues:
- Missing `STRIPE_SECRET_KEY` secret
- Invalid Stripe API key
- CORS issues (already handled in function code)

### Webhook not receiving events

1. Verify webhook URL in Stripe Dashboard
2. Check webhook signing secret matches:
   ```bash
   supabase secrets list | grep WEBHOOK
   ```
3. Test webhook with Stripe CLI:
   ```bash
   stripe trigger payment_intent.succeeded
   ```

## Local Development

To test functions locally before deploying:

```bash
# Start local Supabase (including Edge Functions)
supabase start

# Test create-payment-intent locally
supabase functions serve create-payment-intent

# In another terminal, send a test request
curl -X POST http://localhost:54321/functions/v1/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "usd",
    "userId": "test-user-id"
  }'
```

**Note:** For local development, you'll need to set secrets in `.env.local` file:
```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Production Checklist

Before going to production:

- [ ] Replace test Stripe keys with live keys:
  ```bash
  supabase secrets set STRIPE_SECRET_KEY=sk_live_...
  ```
- [ ] Update [src/config/stripe.ts](../src/config/stripe.ts) with live publishable key
- [ ] Set up production webhook endpoint in Stripe
- [ ] Test payment flow end-to-end with test cards
- [ ] Verify webhook events are being received
- [ ] Set up monitoring/alerting for failed payments
- [ ] Review Stripe logs regularly

## Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
