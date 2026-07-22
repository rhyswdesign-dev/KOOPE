# Quick Deployment Guide

## Your Project Details (Already Known)

✅ **Supabase Project Reference ID**: `srbvekhupzoajedpyepr`

✅ **Supabase URL**: `https://srbvekhupzoajedpyepr.supabase.co`

✅ **Stripe Secret Key**: Already configured in DEPLOY_COMMANDS.sh

## Step-by-Step Deployment

### Step 1: Install Supabase CLI (if not installed)

```bash
npm install -g supabase
```

### Step 2: Run Deployment Commands

Open your terminal and navigate to your project:

```bash
cd /Users/frodobagginz/Documents/test-project/HomeGameAdvantage
```

Then run these commands **one at a time**:

```bash
# 1. Login to Supabase (will open browser)
supabase login

# 2. Link to your project (use your project ref)
supabase link --project-ref srbvekhupzoajedpyepr

# 3. Set Stripe secret key
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE

# 4. Deploy create-payment-intent function
supabase functions deploy create-payment-intent

# 5. Deploy confirm-payment-intent function
supabase functions deploy confirm-payment-intent

# 6. Deploy stripe-webhook function
supabase functions deploy stripe-webhook
```

### Step 3: Configure Stripe Webhook

You're already on the right page! Click **"+ Add destination"** button and:

1. **Endpoint URL**: Enter this URL:
   ```
   https://srbvekhupzoajedpyepr.supabase.co/functions/v1/stripe-webhook
   ```

2. **Events to send**: Select these 3 events:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`
   - ✅ `payment_intent.canceled`

3. Click **"Add endpoint"**

4. After creating, you'll see a **Signing secret** (starts with `whsec_`)

5. Copy that secret and run:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE
   ```

## Done! 🎉

Your payment system will be live and ready to process payments through your app.

## Testing

Use test card: `4242 4242 4242 4242` with any future date, any CVC, any ZIP.
