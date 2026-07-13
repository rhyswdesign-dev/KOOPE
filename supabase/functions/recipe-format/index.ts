/**
 * recipe-format Edge Function
 *
 * Handles two modes:
 *   text  — GPT-3.5-turbo: converts raw recipe text into structured JSON
 *   image — GPT-4 Vision:  extracts recipe data from an image URL
 *
 * The client builds the prompts; this function makes the OpenAI call
 * server-side so the key never touches the client bundle.
 *
 * Request body:
 *   { mode: 'text',  systemPrompt: string, userPrompt: string }
 *   { mode: 'image', systemPrompt: string, userPrompt: string, imageUrl: string }
 *
 * Response: { result: string }  (raw JSON string — client parses it)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TEXT_MODEL = 'gpt-3.5-turbo'
const VISION_MODEL = 'gpt-4-vision-preview'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validate JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonError('Missing authorization header', 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return jsonError('Invalid or expired token', 401)
    }

    // 2. Check tier — recipe formatting requires Plus or Pro
    const tier: string = user.user_metadata?.tier ?? 'free'
    const TIER_RANK: Record<string, number> = { free: 0, koope_plus: 1, koope_pro: 2 }
    if ((TIER_RANK[tier] ?? 0) < TIER_RANK['koope_plus']) {
      return jsonError('Recipe formatting requires a Plus or Pro subscription.', 403)
    }

    // 3. Parse request
    const body = await req.json()
    const { mode, systemPrompt, userPrompt, imageUrl } = body

    if (!mode || !systemPrompt || !userPrompt) {
      return jsonError('Missing required fields: mode, systemPrompt, userPrompt', 400)
    }
    if (mode !== 'text' && mode !== 'image') {
      return jsonError('mode must be "text" or "image"', 400)
    }
    if (mode === 'image' && !imageUrl) {
      return jsonError('Missing required field for image mode: imageUrl', 400)
    }

    // 3. Build OpenAI request
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return jsonError('AI service not configured', 503)
    }

    const model = mode === 'image' ? VISION_MODEL : TEXT_MODEL

    const userContent = mode === 'image'
      ? [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
        ]
      : userPrompt

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('OpenAI error:', openaiResponse.status, errorText)
      return jsonError('AI service error', 502)
    }

    const aiResult = await openaiResponse.json()
    const result = aiResult.choices?.[0]?.message?.content ?? ''

    return new Response(
      JSON.stringify({ result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('recipe-format error:', error)
    return jsonError(error.message || 'Internal server error', 500)
  }
})

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
