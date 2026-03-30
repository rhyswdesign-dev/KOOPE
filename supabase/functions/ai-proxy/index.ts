/**
 * AI Proxy Edge Function — Server-side tier enforcement
 *
 * All AI requests route through here so the server can:
 *   1. Validate the user's JWT (auth required)
 *   2. Look up their subscription tier from the DB
 *   3. Enforce rate limits per tier
 *   4. Check ai_response_cache for cacheable features (free, no LLM call)
 *   5. Forward valid requests to OpenAI on cache miss
 *   6. Log usage for analytics (cache hits do NOT count against daily limit)
 *
 * This prevents client-side gate bypasses.
 *
 * Cache key format: "{feature}:{sorted_key=value_pairs}"
 * Example: "taste_match:spirit=whiskey,tier=premium"
 * Example: "remix_engine:bottle_id=woodford-reserve,type=whiskey"
 * Example: "optimize_my_bar:inventory=campari,gin,sweet-vermouth"
 *
 * bartender_chat is NOT cached (conversational — every message is unique).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Tier limits
const TIER_LIMITS: Record<string, { maxMessagesPerDay: number; maxTokens: number; model: string }> = {
  free: { maxMessagesPerDay: 3, maxTokens: 500, model: 'gpt-4o-mini' },
  koope_plus: { maxMessagesPerDay: 50, maxTokens: 2000, model: 'gpt-4o' },
  koope_pro: { maxMessagesPerDay: 999999, maxTokens: 4000, model: 'gpt-4o' },
}

// Feature-to-tier mapping (server-side enforcement)
const FEATURE_MIN_TIER: Record<string, string> = {
  'bartender_chat': 'free',
  'recipe_generation': 'free',
  'taste_match': 'koope_plus',
  'optimize_my_bar': 'koope_plus',
  'hosting_basic': 'koope_plus',   // Party size, basic menu planning
  'hosting_planner': 'koope_plus', // Alias for hosting_basic (backward compat)
  'predictive_engine': 'koope_pro',
  'remix_engine': 'koope_pro',
  'flavor_correction': 'koope_pro',
  'hosting_advanced': 'koope_pro', // Predictive restock, cost tracking
}

const TIER_RANK: Record<string, number> = {
  free: 0,
  koope_plus: 1,
  koope_pro: 2,
}

// These features produce deterministic outputs for the same inputs — safe to cache.
// bartender_chat is excluded because every conversation is unique.
const CACHEABLE_FEATURES = new Set([
  'recipe_generation',
  'taste_match',
  'optimize_my_bar',
  'hosting_basic',
  'hosting_planner',
  'hosting_advanced',
  'predictive_engine',
  'remix_engine',
  'flavor_correction',
])

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Extract and validate JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonError('Missing authorization header', 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return jsonError('Invalid or expired token', 401)
    }

    // 2. Parse request
    const body = await req.json()
    const { feature, messages, systemPrompt, checkUsageOnly, cacheInputs } = body

    if (!feature) {
      return jsonError('Missing required field: feature', 400)
    }

    // 3. Look up user tier
    const tier = await getUserTier(supabase, user.id)

    // 4. Check feature access
    const minTier = FEATURE_MIN_TIER[feature] || 'koope_pro'
    if (TIER_RANK[tier] < TIER_RANK[minTier]) {
      return jsonError(
        `Feature "${feature}" requires ${minTier}. Your tier: ${tier}`,
        403
      )
    }

    // 5. Check rate limits
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free
    const dailyUsage = await getDailyUsage(supabase, user.id)

    if (dailyUsage >= limits.maxMessagesPerDay) {
      return jsonError(
        `Daily message limit reached (${limits.maxMessagesPerDay}). Upgrade for more.`,
        429
      )
    }

    // Usage-only check — return stats without calling OpenAI
    if (checkUsageOnly) {
      return new Response(
        JSON.stringify({
          content: '',
          dailyUsage,
          dailyLimit: limits.maxMessagesPerDay,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return jsonError('Missing required field: messages', 400)
    }

    // 6. Cache check — for deterministic features only
    if (CACHEABLE_FEATURES.has(feature) && cacheInputs && typeof cacheInputs === 'object') {
      const cacheKey = buildCacheKey(cacheInputs)
      const cached = await getCachedResponse(supabase, feature, cacheKey)

      if (cached) {
        // Cache hit — return immediately, no LLM call, no rate limit increment
        bumpCacheHit(supabase, feature, cacheKey) // fire-and-forget
        return new Response(
          JSON.stringify({
            content: cached.response_text,
            model: cached.model,
            usage: { promptTokens: cached.prompt_tokens, completionTokens: cached.completion_tokens },
            dailyUsage,
            dailyLimit: limits.maxMessagesPerDay,
            cached: true,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 7. Forward to OpenAI
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      return jsonError('AI service not configured', 503)
    }

    const openaiMessages = []
    if (systemPrompt) {
      openaiMessages.push({ role: 'system', content: systemPrompt })
    }
    openaiMessages.push(...messages)

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: limits.model,
        messages: openaiMessages,
        max_tokens: limits.maxTokens,
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('OpenAI error:', errorData)
      return jsonError('AI service error', 502)
    }

    const aiResult = await openaiResponse.json()
    const responseText = aiResult.choices?.[0]?.message?.content || ''
    const promptTokens = aiResult.usage?.prompt_tokens
    const completionTokens = aiResult.usage?.completion_tokens

    // 8. Save to cache for deterministic features
    if (CACHEABLE_FEATURES.has(feature) && cacheInputs && typeof cacheInputs === 'object') {
      const cacheKey = buildCacheKey(cacheInputs)
      saveCacheResponse(supabase, feature, cacheKey, responseText, limits.model, promptTokens, completionTokens) // fire-and-forget
    }

    // 9. Log usage (only on actual LLM calls, not cache hits)
    await logUsage(supabase, user.id, feature, tier)

    // 10. Return response
    return new Response(
      JSON.stringify({
        content: responseText,
        model: aiResult.model,
        usage: {
          promptTokens,
          completionTokens,
        },
        dailyUsage: dailyUsage + 1,
        dailyLimit: limits.maxMessagesPerDay,
        cached: false,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('AI proxy error:', error)
    return jsonError(error.message || 'Internal server error', 500)
  }
})

// ============================================================================
// CACHE HELPERS
// ============================================================================

/**
 * Build a deterministic cache key from an inputs object.
 * Keys are sorted so { spirit: 'gin', tier: 'premium' } and
 * { tier: 'premium', spirit: 'gin' } produce the same key.
 *
 * For array values, elements are sorted and joined with '+'.
 * Example output: "spirit=gin,tier=premium"
 */
function buildCacheKey(inputs: Record<string, unknown>): string {
  return Object.keys(inputs)
    .sort()
    .map((k) => {
      const v = inputs[k]
      if (Array.isArray(v)) {
        return `${k}=${[...v].sort().join('+')}`
      }
      return `${k}=${String(v).toLowerCase().trim()}`
    })
    .join(',')
}

async function getCachedResponse(
  supabase: any,
  feature: string,
  cacheKey: string
): Promise<{ response_text: string; model: string; prompt_tokens: number | null; completion_tokens: number | null } | null> {
  const { data } = await supabase
    .from('ai_response_cache')
    .select('response_text, model, prompt_tokens, completion_tokens')
    .eq('feature', feature)
    .eq('cache_key', cacheKey)
    .maybeSingle()

  return data ?? null
}

function bumpCacheHit(supabase: any, feature: string, cacheKey: string): void {
  supabase
    .from('ai_response_cache')
    .rpc('increment_cache_hit', { p_feature: feature, p_cache_key: cacheKey })
    .then(() => {})
    .catch(() => {
      // Fallback: manual update if RPC not available
      supabase
        .from('ai_response_cache')
        .select('id, hit_count')
        .eq('feature', feature)
        .eq('cache_key', cacheKey)
        .maybeSingle()
        .then(({ data }: { data: any }) => {
          if (data) {
            supabase
              .from('ai_response_cache')
              .update({ hit_count: data.hit_count + 1, last_hit_at: new Date().toISOString() })
              .eq('id', data.id)
              .then(() => {})
          }
        })
    })
}

function saveCacheResponse(
  supabase: any,
  feature: string,
  cacheKey: string,
  responseText: string,
  model: string,
  promptTokens: number | undefined,
  completionTokens: number | undefined
): void {
  supabase
    .from('ai_response_cache')
    .upsert(
      {
        feature,
        cache_key: cacheKey,
        response_text: responseText,
        model,
        prompt_tokens: promptTokens ?? null,
        completion_tokens: completionTokens ?? null,
        last_hit_at: new Date().toISOString(),
        hit_count: 1,
      },
      { onConflict: 'feature,cache_key' }
    )
    .then(() => {})
}

// ============================================================================
// HELPERS
// ============================================================================

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getUserTier(supabase: any, userId: string): Promise<string> {
  // Check user_subscriptions table for active subscription
  const { data } = await supabase
    .from('user_subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (data?.tier) {
    return data.tier // 'free' | 'koope_plus' | 'koope_pro'
  }

  return 'free'
}

async function getDailyUsage(supabase: any, userId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0]

  const { count } = await supabase
    .from('ai_usage_log')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00Z`)

  return count || 0
}

async function logUsage(
  supabase: any,
  userId: string,
  feature: string,
  tier: string
): Promise<void> {
  await supabase.from('ai_usage_log').insert({
    user_id: userId,
    feature,
    tier,
    created_at: new Date().toISOString(),
  })
}
