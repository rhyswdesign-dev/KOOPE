// Follow this setup guide: https://supabase.com/docs/guides/functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe with secret key
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Parse request body
    const { amount, currency, userId, metadata } = await req.json()

    // Validate required fields
    if (!amount || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, userId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate amount (must be positive integer)
    if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
      return new Response(
        JSON.stringify({ error: 'Invalid amount. Must be a positive integer in cents.' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency || 'usd',
      metadata: {
        userId,
        type: 'vault_purchase',
        ...metadata,
      },
      // Enable automatic payment methods
      automatic_payment_methods: {
        enabled: true,
      },
    })

    console.log('Payment intent created:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      userId,
    })

    // Return client secret for payment confirmation
    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error creating payment intent:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to create payment intent',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
