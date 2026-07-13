/**
 * Bottle Recognize Edge Function
 *
 * Consolidates the previous two-hop bottle-identification chain
 * (vision-analyze -> client-side local-DB match -> spirit-lookup, which on a
 * cache miss meant TWO separate chained client-initiated network calls) into
 * a SINGLE request for the 'bottle' scan type. This is the "collapse the two
 * chained AI calls" phase of the scanner rework
 * (see docs/KOOPE-SCANNER-ANSWER-CARD-SPEC.md Part A).
 *
 * Flow, all within one invocation:
 *   1. Auth + per-tier daily rate limit (same as vision-analyze)
 *   2. Google Vision: TEXT_DETECTION + LABEL_DETECTION only (no WEB_DETECTION
 *      — see supabase/functions/spirit-lookup/index.ts's documented
 *      rationale; Claude reading the label directly is preferred over Web
 *      Detection's brand-guessing for identification purposes).
 *   3. Spirit-image gate (ported from GoogleVisionService.isSpiritImage) —
 *      reject non-bottle photos here, before spending a catalog/Claude call.
 *   4. Score the OCR text against spirits_catalog (server-side mirror of
 *      src/data/spiritsDatabase.ts) using the same scoring/threshold logic
 *      the client uses locally (supabase/functions/_shared/matchSpirit.ts).
 *   5. On a catalog hit: return immediately — no Claude call.
 *   6. On a miss: call Claude Vision (same prompt/parsing as spirit-lookup)
 *      in the SAME invocation, and cache the result if confident enough.
 *
 * Known scope cut: unlike spirit-lookup, this function does not check
 * spirits_cache before falling through to Claude (that cache is keyed by an
 * OCR-extracted canonical name, which requires porting a second heavily-
 * tuned heuristic — GoogleVisionService.extractBottleNameFromOCR — that
 * isn't needed for correctness here). Repeat scans of the same
 * catalog-unknown bottle by different users will each independently pay for
 * a Claude call rather than hitting a shared cache. The catalog fast path
 * still covers all locally-known bottles with zero Claude cost, and results
 * are still written to spirits_cache after a Claude call for spirit-lookup's
 * own callers to benefit from — this is a scoped-down v1, not a stopping
 * point; add the cache pre-check as a follow-up if Claude call volume
 * warrants it.
 *
 * This function only handles the 'bottle' scan type. `vision-analyze` stays
 * in place unchanged for the 'recipe'/'ingredient' scan types it also serves.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { matchSpiritFromCatalog, isSpiritImage, type CatalogRow } from '../_shared/matchSpirit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VISION_API_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate'
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

const LIMIT_FREE = 30
const LIMIT_PAID = 200

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startedAt = Date.now()

  try {
    // ── Auth & rate limiting (mirrors vision-analyze) ────────────────────────

    const authHeader = req.headers.get('authorization')
    if (!authHeader) return jsonError('Unauthorized', 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    if (authError || !user) return jsonError('Unauthorized', 401)

    const tier: string = user.user_metadata?.tier ?? 'FREE'
    const dailyLimit = tier === 'FREE' ? LIMIT_FREE : LIMIT_PAID
    const today = new Date().toISOString().split('T')[0]
    const { data: rateRow, error: rateError } = await supabase
      .rpc('increment_scan_count', { p_user_id: user.id, p_date: today })

    if (rateError) {
      console.error('Rate limit check failed:', rateError.message)
    } else if (rateRow !== null && rateRow > dailyLimit) {
      return jsonError(`Daily scan limit reached (${dailyLimit}/day). Come back tomorrow.`, 429)
    }

    const { imageBase64 } = await req.json()
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return jsonError('Missing imageBase64', 400)
    }

    // ── Google Vision — text + labels only ───────────────────────────────────

    const visionKey = Deno.env.get('GOOGLE_VISION_API_KEY')
    if (!visionKey) return jsonError('Vision API not configured', 503)

    const visionStartedAt = Date.now()
    const visionResponse = await fetch(`${VISION_API_ENDPOINT}?key=${visionKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [
            { type: 'TEXT_DETECTION', maxResults: 10 },
            { type: 'LABEL_DETECTION', maxResults: 10 },
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
    const visionResult = visionData.responses?.[0]
    if (visionResult?.error) {
      console.error('Vision API returned error:', visionResult.error)
      return jsonError(`Vision API error: ${visionResult.error.message}`, 502)
    }

    const textAnnotations: Array<{ description: string }> = visionResult?.textAnnotations || []
    const labelAnnotations: Array<{ description: string; score: number }> = visionResult?.labelAnnotations || []
    const ocrText = textAnnotations[0]?.description || ''
    const labels = labelAnnotations.map((l) => l.description.toLowerCase())
    const visionConfidence = labelAnnotations.length > 0
      ? labelAnnotations.reduce((sum, l) => sum + l.score, 0) / labelAnnotations.length
      : 0
    console.log(`bottle-recognize: Vision call took ${Date.now() - visionStartedAt}ms`)

    // ── Spirit-image gate — reject non-bottle photos before spending a
    // catalog/Claude call (ported from GoogleVisionService.isSpiritImage) ────

    if (!isSpiritImage(labels, ocrText)) {
      console.log(`bottle-recognize: spirit-image gate failed — total ${Date.now() - startedAt}ms`)
      return new Response(
        JSON.stringify({ isSpiritImage: false, profile: null, source: 'none', confidence: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Score against spirits_catalog ─────────────────────────────────────────

    const catalogStartedAt = Date.now()
    const { data: catalogRows, error: catalogError } = await supabase
      .from('spirits_catalog')
      .select('*')

    if (catalogError) {
      console.error('spirits_catalog fetch failed:', catalogError.message)
    }
    console.log(`bottle-recognize: catalog query took ${Date.now() - catalogStartedAt}ms (${catalogRows?.length ?? 0} rows)`)

    const catalogMatch = catalogRows
      ? matchSpiritFromCatalog(ocrText, labels, visionConfidence, catalogRows as CatalogRow[])
      : null

    if (catalogMatch) {
      console.log(`bottle-recognize: catalog hit "${catalogMatch.name}" — total ${Date.now() - startedAt}ms, no Claude call`)

      // Upsert to spirits_cache (source: 'catalog', confidence 1.0) so
      // spirit-lookup's other callers (e.g. the Stage-7 manual-entry flow)
      // also benefit from this being a known, confirmed bottle — mirrors
      // what the old client-side local-DB-match path used to do.
      const catalogLookupKey = catalogMatch.name.toLowerCase().replace(/\s+/g, ' ').trim()
      const catalogRow = profileToCacheRow(catalogRowToProfile(catalogMatch), catalogLookupKey, 1.0)
      supabase.from('spirits_cache').upsert({ ...catalogRow, source: 'catalog' }, { onConflict: 'lookup_key' })
        .then(({ error: cacheError }) => {
          if (cacheError) console.error('spirits_cache upsert (catalog hit) failed:', cacheError.message)
        })

      return new Response(
        JSON.stringify({
          isSpiritImage: true,
          profile: catalogRowToProfile(catalogMatch),
          source: 'catalog',
          confidence: 1.0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Fall through to Claude (same prompt/parsing as spirit-lookup) ────────

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) return jsonError('AI lookup not configured', 503)

    const claudeStartedAt = Date.now()
    const { profile, confidence } = await callClaudeVision(anthropicKey, imageBase64, ocrText, labels)
    console.log(`bottle-recognize: Claude call took ${Date.now() - claudeStartedAt}ms — total ${Date.now() - startedAt}ms`)

    // Cache if confident enough — same threshold spirit-lookup uses for its vision path.
    const lookupKey = profile.name.toLowerCase().replace(/\s+/g, ' ').trim()
    if (confidence >= 0.8) {
      const row = profileToCacheRow(profile, lookupKey, confidence)
      const { error: cacheError } = await supabase.from('spirits_cache').upsert(row, { onConflict: 'lookup_key' })
      if (cacheError) console.error('spirits_cache upsert failed:', cacheError.message)
    }

    return new Response(
      JSON.stringify({ isSpiritImage: true, profile, source: 'claude-vision', confidence }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('bottle-recognize error:', error)
    return jsonError((error as Error).message || 'Internal server error', 500)
  }
})

// ── Claude Vision (ported from spirit-lookup/index.ts) ────────────────────────

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
}

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
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
          { type: 'text', text: prompt },
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

function parseClaudeResponse(rawText: string, fallbackName: string): { profile: SpiritProfile; confidence: number } {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    console.error('Claude response had no JSON:', rawText)
    throw new Error('AI returned unrecognised format')
  }

  let profile: SpiritProfile
  try {
    profile = JSON.parse(jsonMatch[0]) as SpiritProfile
  } catch {
    console.error('Failed to parse Claude JSON:', jsonMatch[0])
    throw new Error('AI returned invalid JSON')
  }

  const confidence = typeof (profile as any).confidence === 'number' ? (profile as any).confidence : 0.75
  return { profile: normaliseProfile(profile, fallbackName), confidence }
}

function normaliseProfile(p: Partial<SpiritProfile>, bottleName: string): SpiritProfile {
  const name = p.name || bottleName || 'Unknown Bottle'
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

function catalogRowToProfile(row: CatalogRow): SpiritProfile {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    type: row.spirit_type,
    abv: row.abv,
    priceTier: row.price_tier,
    priceEstimate: {
      USD: { min: row.price_usd_min ?? 20, max: row.price_usd_max ?? 35 },
      CAD: { min: row.price_cad_min ?? 28, max: row.price_cad_max ?? 45 },
      GBP: { min: row.price_gbp_min ?? 18, max: row.price_gbp_max ?? 30 },
    },
    flavorProfile: row.flavor_profile,
    tastingNotes: row.tasting_notes,
    origin: row.origin,
    searchTerms: row.search_terms,
  }
}

function profileToCacheRow(p: SpiritProfile, lookupKey: string, confidence: number): Record<string, unknown> {
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

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}
