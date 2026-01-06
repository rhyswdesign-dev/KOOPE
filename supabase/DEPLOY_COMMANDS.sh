#!/bin/bash
# Stripe Edge Functions Deployment Script
# Run these commands in order

echo "Step 1: Login to Supabase"
supabase login

echo "Step 2: Link to your project"
supabase link --project-ref srbvekhupzoajedpyepr

echo "Step 3: Set Stripe secret key"
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_SECRET_KEY_HERE

echo "Step 4: Deploy create-payment-intent function"
supabase functions deploy create-payment-intent

echo "Step 5: Deploy confirm-payment-intent function"
supabase functions deploy confirm-payment-intent

echo "Step 6: Deploy stripe-webhook function"
supabase functions deploy stripe-webhook

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Get your webhook URL: https://srbvekhupzoajedpyepr.supabase.co/functions/v1/stripe-webhook"
echo "2. Add this webhook URL to Stripe Dashboard: https://dashboard.stripe.com/webhooks"
echo "3. Copy the webhook signing secret from Stripe"
echo "4. Run: supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET"
