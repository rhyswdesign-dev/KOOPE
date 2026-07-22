/**
 * Spirit Lookup Edge Function
 *
 * Called when a scanned bottle is not found in the local spirits database.
 *
 * Waterfall:
 *   1. Check spirits_cache (fast, free)
 *   2. If imageBase64 is present → Claude Sonnet Vision (reads the label directly)
 *   3. If no image → Claude Haiku text-only fallback (OCR text + labels)
 *   4. Cache result if confidence >= 0.8 (vision) or >= 0.7 (text-only)
 *
 * Request body:
 *   {
 *     bottleName: string          — OCR-extracted name (used as cache key + text fallback)
 *     imageBase64?: string        — JPEG base64 of the cropped bottle label
 *     visionLabels?: string[]     — Google Vision label detections (shape, colour, type)
 *   }
 *
 * NOTE: webEntities and bestGuessLabels are intentionally NOT used for identification.
 * Google Web Detection reliably misidentifies uncommon bottles as the most famous brand
 * in that category (Sierra Tequila → Jose Cuervo). Claude reading the actual label is
 * always more accurate.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Validate JWT
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return jsonError('Unauthorized', 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    if (authError || !user) {
      return jsonError('Unauthorized', 401)
    }

    const { bottleName, imageBase64, visionLabels } = await req.json()
    if (!bottleName || typeof bottleName !== 'string') {
      return jsonError('Missing bottleName', 400)
    }

    const labels: string[] = Array.isArray(visionLabels) ? visionLabels : []
    const hasImage = typeof imageBase64 === 'string' && imageBase64.length > 0

    const lookupKey = bottleName.toLowerCase().replace(/\s+/g, ' ').trim()

    // Generic single-word category names (tequila, gin, liqueur…) are too broad
    // to be reliable cache keys — one bad Claude response would poison every scan
    // of that spirit type. Skip cache entirely for these.
    const GENERIC_KEYS = new Set([
      'gin','vodka','rum','whiskey','whisky','bourbon','scotch','tequila','mezcal',
      'cognac','brandy','liqueur','amaro','bitter','aperitivo','vermouth','spirit',
      'spirits','reposado','blanco','anejo','silver','gold','unknown bottle',
    ])
    const useCache = !GENERIC_KEYS.has(lookupKey)

    // ── 2. Check cache ────────────────────────────────────────────────────────

    const { data: cached } = useCache ? await supabase
      .from('spirits_cache')
      .select('*')
      .eq('lookup_key', lookupKey)
      .maybeSingle() : { data: null }

    if (cached) {
      supabase
        .from('spirits_cache')
        .update({ hit_count: cached.hit_count + 1, last_hit_at: new Date().toISOString() })
        .eq('id', cached.id)
        .then(() => {})

      return new Response(
        JSON.stringify({ profile: rowToProfile(cached), source: 'cache' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 3. Call Claude ────────────────────────────────────────────────────────
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return jsonError('AI lookup not configured', 503)
    }

    let profile: SpiritProfile
    let claudeConfidence: number
    let source: string

    if (hasImage) {
      // ── Vision path: Claude Sonnet reads the label directly ─────────────────
      const result = await callClaudeVision(anthropicKey, imageBase64, bottleName, labels)
      profile = result.profile
      claudeConfidence = result.confidence
      source = 'claude-vision'
    } else {
      // ── Text fallback: Haiku guesses from OCR noise ──────────────────────────
      const result = await callClaudeText(anthropicKey, bottleName, labels)
      profile = result.profile
      claudeConfidence = result.confidence
      source = 'claude-text'
    }

    // ── 3. Cache if confident enough ──────────────────────────────────────────
    const cacheThreshold = hasImage ? 0.8 : 0.7
    if (useCache && claudeConfidence >= cacheThreshold) {
      const row = profileToRow(profile, lookupKey, claudeConfidence)
      await supabase.from('spirits_cache').upsert(row, { onConflict: 'lookup_key' })
    } else if (!useCache) {
      console.log(`Generic key "${lookupKey}" — skipping cache to prevent cross-bottle pollution`)
    } else {
      console.log(`Low confidence (${claudeConfidence}) for "${lookupKey}" — skipping cache`)
    }

    return new Response(
      JSON.stringify({ profile, source, confidence: claudeConfidence }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('spirit-lookup error:', error)
    return jsonError((error as Error).message || 'Internal server error', 500)
  }
})

// ── Claude Vision (Sonnet) ─────────────────────────────────────────────────────
// Passes the actual bottle image to Claude so it reads the label directly.
// This handles any bottle in the world regardless of database coverage.

async function callClaudeVision(
  apiKey: string,
  imageBase64: string,
  ocrHint: string,
  visionLabels: string[]
): Promise<{ profile: SpiritProfile; confidence: number }> {
  const labelsLine = visionLabels.length > 0
    ? `\nGoogle Vision labels (bottle shape/colour/category context): ${visionLabels.join(', ')}`
    : ''

  const prompt = `You are a spirits expert and database. Look at this bottle image and identify the spirit precisely.

OCR hint (may be noisy/incomplete): "${ocrHint}"${labelsLine}

Read the label in the image directly — it is the authoritative source. Use the OCR hint only to cross-check.

Return ONLY a JSON object (no markdown, no explanation):
{
  "id": "brand-name-style-slug",
  "name": "Full Official Product Name",
  "brand": "Brand Name",
  "type": "gin|vodka|rum|whiskey|tequila|mezcal|brandy|liqueur|other",
  "abv": 40.0,
  "priceTier": "budget|mid-range|premium|ultra-premium",
  "priceEstimate": {
    "USD": { "min": 25, "max": 35 },
    "CAD": { "min": 35, "max": 45 },
    "GBP": { "min": 22, "max": 30 }
  },
  "flavorProfile": ["Note 1", "Note 2", "Note 3"],
  "tastingNotes": "2-3 sentence professional tasting note.",
  "origin": "Country",
  "searchTerms": ["common name", "abbreviation"],
  "confidence": 0.95
}

Rules:
- Read the brand and product name exactly as printed on the label
- Use real, accurate data for well-known bottles
- For bottles you don't recognise, use what you can read on the label plus reasonable estimates for the spirit type
- priceTier: budget = under $20, mid-range = $20–40, premium = $40–80, ultra-premium = $80+
- confidence: 0.9+ if you can clearly read the label; 0.7–0.89 if partially obscured; below 0.7 if genuinely unclear
- id: lowercase kebab-case`

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude Vision API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const rawText = data?.content?.[0]?.text ?? ''
  return parseClaudeResponse(rawText, ocrHint)
}

// ── Claude Text (Haiku) ────────────────────────────────────────────────────────
// Fallback when no image is available. Less accurate but cheap.

async function callClaudeText(
  apiKey: string,
  bottleName: string,
  visionLabels: string[]
): Promise<{ profile: SpiritProfile; confidence: number }> {
  const labelsSection = visionLabels.length > 0
    ? `\nVisual labels from Google Vision: ${visionLabels.join(', ')}`
    : ''

  const prompt = `You are a spirits database. Given a bottle name (from OCR), return a JSON profile.

Bottle name: "${bottleName}"${labelsSection}

Return ONLY a JSON object (no markdown, no explanation):
{
  "id": "brand-name-slug",
  "name": "Full Official Product Name",
  "brand": "Brand Name",
  "type": "gin|vodka|rum|whiskey|tequila|mezcal|brandy|liqueur|other",
  "abv": 40.0,
  "priceTier": "budget|mid-range|premium|ultra-premium",
  "priceEstimate": {
    "USD": { "min": 25, "max": 35 },
    "CAD": { "min": 35, "max": 45 },
    "GBP": { "min": 22, "max": 30 }
  },
  "flavorProfile": ["Note 1", "Note 2", "Note 3"],
  "tastingNotes": "2-3 sentence professional tasting note.",
  "origin": "Country",
  "searchTerms": ["common name"],
  "confidence": 0.75
}

Rules:
- Use real data for well-known bottles; reasonable estimates for unknown ones
- Set confidence below 0.6 if the name is garbled or unrecognisable
- priceTier: budget = under $20, mid-range = $20–40, premium = $40–80, ultra-premium = $80+`

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude text API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const rawText = data?.content?.[0]?.text ?? ''
  return parseClaudeResponse(rawText, bottleName)
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function parseClaudeResponse(rawText: string, fallbackName: string): { profile: SpiritProfile; confidence: number } {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('Claude response had no JSON:', rawText)
    throw new Error('AI returned unrecognised format')
  }

  let profile: SpiritProfile
  try {
    profile = JSON.parse(jsonMatch[0]) as SpiritProfile
  } catch (e) {
    console.error('Failed to parse Claude JSON:', jsonMatch[0])
    throw new Error('AI returned invalid JSON')
  }

  const confidence = typeof (profile as any).confidence === 'number'
    ? (profile as any).confidence
    : 0.75

  profile = normaliseProfile(profile, fallbackName)
  return { profile, confidence }
}

function normaliseProfile(p: Partial<SpiritProfile>, bottleName: string): SpiritProfile {
  const name = p.name || bottleName
  const brand = p.brand || name.split(' ')[0]
  return {
    id: p.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    name,
    brand,
    type: p.type || 'other',
    abv: typeof p.abv === 'number' ? p.abv : 40,
    priceTier: p.priceTier || 'mid-range',
    priceEstimate: p.priceEstimate || {
      USD: { min: 20, max: 35 },
      CAD: { min: 28, max: 45 },
      GBP: { min: 18, max: 30 },
    },
    flavorProfile: Array.isArray(p.flavorProfile) && p.flavorProfile.length > 0
      ? p.flavorProfile
      : ['Complex', 'Aromatic', 'Distinct'],
    tastingNotes: p.tastingNotes || 'A distinctive spirit with its own character.',
    origin: p.origin || 'International',
    searchTerms: Array.isArray(p.searchTerms) ? p.searchTerms : [name.toLowerCase()],
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface SpiritProfile {
  id: string
  name: string
  brand: string
  type: string
  abv: number
  priceTier: string
  priceEstimate: {
    USD: { min: number; max: number }
    CAD: { min: number; max: number }
    GBP: { min: number; max: number }
  }
  flavorProfile: string[]
  tastingNotes: string
  origin: string
  searchTerms: string[]
  confidence?: number
}

// ── Row conversion ─────────────────────────────────────────────────────────────

function profileToRow(p: SpiritProfile, lookupKey: string, confidence: number): Record<string, unknown> {
  return {
    lookup_key: lookupKey,
    name: p.name,
    brand: p.brand,
    spirit_type: p.type,
    abv: p.abv,
    price_tier: p.priceTier,
    price_usd_min: p.priceEstimate.USD.min,
    price_usd_max: p.priceEstimate.USD.max,
    price_cad_min: p.priceEstimate.CAD.min,
    price_cad_max: p.priceEstimate.CAD.max,
    price_gbp_min: p.priceEstimate.GBP.min,
    price_gbp_max: p.priceEstimate.GBP.max,
    flavor_profile: p.flavorProfile,
    tasting_notes: p.tastingNotes,
    origin: p.origin,
    search_terms: p.searchTerms,
    confidence,
    source: 'claude',
  }
}

function rowToProfile(row: Record<string, unknown>): SpiritProfile {
  return {
    id: String(row.lookup_key).replace(/\s+/g, '-'),
    name: String(row.name),
    brand: String(row.brand),
    type: String(row.spirit_type),
    abv: Number(row.abv) || 40,
    priceTier: String(row.price_tier || 'mid-range'),
    priceEstimate: {
      USD: { min: Number(row.price_usd_min), max: Number(row.price_usd_max) },
      CAD: { min: Number(row.price_cad_min), max: Number(row.price_cad_max) },
      GBP: { min: Number(row.price_gbp_min), max: Number(row.price_gbp_max) },
    },
    flavorProfile: Array.isArray(row.flavor_profile) ? row.flavor_profile as string[] : [],
    tastingNotes: String(row.tasting_notes || ''),
    origin: String(row.origin || ''),
    searchTerms: Array.isArray(row.search_terms) ? row.search_terms as string[] : [],
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
