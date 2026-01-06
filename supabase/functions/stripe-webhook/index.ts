// Follow this setup guide: https://supabase.com/docs/guides/functions
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const signature = req.headers.get('stripe-signature')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

    if (!signature || !webhookSecret) {
      console.error('Missing signature or webhook secret')
      return new Response(
        JSON.stringify({ error: 'Webhook configuration error' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Get raw body for signature verification
    const body = await req.text()

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message)
      return new Response(
        JSON.stringify({ error: `Webhook Error: ${err.message}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    console.log('Webhook event received:', event.type)

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment succeeded:', {
          id: paymentIntent.id,
          amount: paymentIntent.amount,
          userId: paymentIntent.metadata?.userId,
        })

        // TODO: Update your database to mark purchase as complete
        // You can use the Supabase client here to update vault_transactions table
        // Example:
        // const userId = paymentIntent.metadata?.userId
        // if (userId) {
        //   await supabaseClient
        //     .from('vault_transactions')
        //     .update({ fulfillment_status: 'processing' })
        //     .eq('stripe_payment_intent_id', paymentIntent.id)
        // }

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment failed:', {
          id: paymentIntent.id,
          userId: paymentIntent.metadata?.userId,
          error: paymentIntent.last_payment_error?.message,
        })

        // TODO: Handle failed payment
        // - Notify user
        // - Log failure
        // - Update database

        break
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('Payment canceled:', {
          id: paymentIntent.id,
          userId: paymentIntent.metadata?.userId,
        })

        // TODO: Handle canceled payment

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    // Return success to Stripe
    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Webhook handler error:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Webhook processing failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
