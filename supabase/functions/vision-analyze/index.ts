/**
 * Vision Analyze Edge Function
 * Proxies Google Cloud Vision API calls so the API key stays server-side.
 * Accepts a base64-encoded image, returns labels + OCR text.
 *
 * Rate limiting:
 *   - FREE users: 30 scans/day
 *   - PLUS/PRO users: 200 scans/day (abuse protection only — normal use never hits this)
 *   - Unauthenticated: rejected
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VISION_API_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate'

// Daily scan limits per tier
const LIMIT_FREE = 30
const LIMIT_PAID = 200 // PLUS/PRO — cost protection only, not a feature gate

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Auth & rate limiting ──────────────────────────────────────────────────

    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return jsonError('Unauthorized', 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Verify JWT and extract user
    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    if (authError || !user) {
      return jsonError('Unauthorized', 401)
    }

    // Determine tier from user metadata (set by RevenueCat webhook or trial logic)
    const tier: string = user.user_metadata?.tier ?? 'FREE'
    const dailyLimit = tier === 'FREE' ? LIMIT_FREE : LIMIT_PAID

    // Upsert today's scan count and read it back atomically
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const { data: rateRow, error: rateError } = await supabase
      .rpc('increment_scan_count', { p_user_id: user.id, p_date: today })

    if (rateError) {
      // Don't block scans if rate limit table is unavailable — log and continue
      console.error('Rate limit check failed:', rateError.message)
    } else if (rateRow !== null && rateRow > dailyLimit) {
      return jsonError(
        `Daily scan limit reached (${dailyLimit}/day). Come back tomorrow.`,
        429
      )
    }

    // ── Vision API call ───────────────────────────────────────────────────────

    const { imageBase64 } = await req.json()
    if (!imageBase64) {
      return jsonError('Missing imageBase64', 400)
    }

    const visionKey = Deno.env.get('GOOGLE_VISION_API_KEY')
    if (!visionKey) {
      return jsonError('Vision API not configured', 503)
    }

    const visionResponse = await fetch(`${VISION_API_ENDPOINT}?key=${visionKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [
            { type: 'TEXT_DETECTION', maxResults: 10 },
            { type: 'LABEL_DETECTION', maxResults: 10 },
            { type: 'WEB_DETECTION', maxResults: 5 },
          ],
        }],
      }),
    })

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text()
      console.error('Vision API HTTP error:', visionResponse.status, errorText)
      return jsonError(`Vision API error ${visionResponse.status}: ${errorText}`, 502)
    }

    const visionData = await visionResponse.json()
    const response = visionData.responses?.[0]

    if (response?.error) {
      console.error('Vision API returned error:', response.error)
      return jsonError(`Vision API error: ${response.error.message}`, 502)
    }

    const textAnnotations: Array<{ description: string }> = response?.textAnnotations || []
    const labelAnnotations: Array<{ description: string; score: number }> = response?.labelAnnotations || []
    const webDetection = response?.webDetection || {}

    // Web entities: ranked product/brand matches Vision found across the web
    // e.g. [{ entityId: '/m/...', score: 0.9, description: 'Crystal Head Vodka' }]
    const webEntities: string[] = (webDetection.webEntities || [])
      .filter((e: any) => e.score > 0.5 && e.description)
      .map((e: any) => e.description as string)

    // Best guess labels: Vision's top-level product identification
    // e.g. ['Crystal Head Vodka', 'Skull Vodka']
    const bestGuessLabels: string[] = (webDetection.bestGuessLabels || [])
      .map((l: any) => l.label as string)

    const labels = labelAnnotations.map((l) => l.description.toLowerCase())
    const text = textAnnotations.map((t) => t.description)
    const confidence = labelAnnotations.length > 0
      ? labelAnnotations.reduce((sum, l) => sum + l.score, 0) / labelAnnotations.length
      : 0

    return new Response(
      JSON.stringify({ labels, text, confidence, webEntities, bestGuessLabels }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('vision-analyze error:', error)
    return jsonError((error as Error).message || 'Internal server error', 500)
  }
})

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
