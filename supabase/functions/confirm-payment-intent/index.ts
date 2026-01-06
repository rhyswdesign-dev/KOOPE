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
    const { paymentIntentId } = await req.json()

    // Validate required fields
    if (!paymentIntentId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: paymentIntentId' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Confirm payment intent
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId)

    console.log('Payment intent confirmed:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
    })

    // Return success if payment succeeded
    return new Response(
      JSON.stringify({
        success: paymentIntent.status === 'succeeded',
        status: paymentIntent.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error confirming payment intent:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to confirm payment intent',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
