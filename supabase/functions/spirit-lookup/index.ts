/**
 * Spirit Lookup Edge Function
 *
 * Called when a scanned bottle name is not found in the local spirits database.
 * 1. Checks the spirits_cache table first (fast, free).
 * 2. If not cached, asks Claude to generate a full bottle profile.
 * 3. Saves the result to spirits_cache so it's instant on the next scan.
 *
 * Expected request body:
 *   { bottleName: string }   — the raw name string from OCR / Vision
 *
 * Returns a SpiritProfile object matching the local Spirit interface shape.
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
    const { bottleName, visionLabels, webEntities, bestGuessLabels } = await req.json()
    if (!bottleName || typeof bottleName !== 'string') {
      return jsonError('Missing bottleName', 400)
    }

    const labels: string[] = Array.isArray(visionLabels) ? visionLabels : []
    const entities: string[] = Array.isArray(webEntities) ? webEntities : []
    const guesses: string[] = Array.isArray(bestGuessLabels) ? bestGuessLabels : []

    // Web Detection sometimes returns material/object descriptions instead of brand names
    // (e.g. "Plastic", "Glass bottle", "Ceramic decanter", "Liquid", "Product").
    // Only trust a bestGuessLabel if it looks like an actual spirit/brand name.
    const GENERIC_TOKENS = new Set([
      'plastic','glass','ceramic','bottle','liquid','product','object','container',
      'decanter','vase','jar','cup','jug','flask','vessel','pitcher','carafe',
      'red','blue','green','black','white','brown','crystal','wood','wooden',
      'metal','metallic','unknown','item','thing','material','surface','texture',
      'pattern','design','art','craft','handmade','decorative','ornamental',
      'drinkware','barware','glassware','tableware','stopper','cork',
    ])
    const isUsableGuess = (s: string) => {
      const words = s.trim().toLowerCase().split(/\s+/)
      // Reject if every word is a generic material/object/colour token
      if (words.every(w => GENERIC_TOKENS.has(w))) return false
      // Single short word with no brand character
      if (words.length === 1 && s.length <= 5) return false
      return true
    }

    const validGuess = guesses.find(isUsableGuess) ?? null

    // If Google's Web Detection identified the bottle directly, use that as the
    // primary name — it's far more reliable than garbled OCR for unique bottles
    // like Crystal Head Vodka (no flat label) or Clase Azul (ceramic bottle).
    const effectiveName = validGuess ?? bottleName

    const lookupKey = effectiveName.toLowerCase().replace(/\s+/g, ' ').trim()

    // ── 1. Check cache ────────────────────────────────────────────────────────
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: cached } = await supabase
      .from('spirits_cache')
      .select('*')
      .eq('lookup_key', lookupKey)
      .maybeSingle()

    if (cached) {
      // Bump hit count and last_hit_at asynchronously (don't await)
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

    // ── 2. Call Claude ────────────────────────────────────────────────────────
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return jsonError('AI lookup not configured', 503)
    }

    const validGuesses = guesses.filter(isUsableGuess)
    const prompt = buildPrompt(effectiveName, labels, entities, validGuesses)

    const claudeResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeResponse.ok) {
      const err = await claudeResponse.text()
      console.error('Claude API error:', claudeResponse.status, err)
      return jsonError(`AI lookup failed: ${claudeResponse.status}: ${err}`, 502)
    }

    const claudeData = await claudeResponse.json()
    const rawText = claudeData?.content?.[0]?.text ?? ''

    // Extract JSON from Claude's response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('Claude response had no JSON:', rawText)
      return jsonError('AI returned unrecognised format', 502)
    }

    let profile: SpiritProfile
    try {
      profile = JSON.parse(jsonMatch[0]) as SpiritProfile
    } catch (e) {
      console.error('Failed to parse Claude JSON:', jsonMatch[0])
      return jsonError('AI returned invalid JSON', 502)
    }

    // Normalise — fill any gaps with safe defaults
    profile = normaliseProfile(profile, effectiveName)

    const claudeConfidence = typeof (profile as any).confidence === 'number'
      ? (profile as any).confidence
      : 0.75

    // ── 3. Save to cache — only if confidence is high enough ─────────────────
    // Low-confidence results are returned to the client but NOT cached, so a
    // better scan of the same bottle will trigger a fresh Claude lookup rather
    // than serving the uncertain result forever.
    if (claudeConfidence >= 0.7) {
      const row = profileToRow(profile, lookupKey)
      await supabase.from('spirits_cache').upsert(row, { onConflict: 'lookup_key' })
    } else {
      console.log(`Low confidence (${claudeConfidence}) — skipping cache for: ${lookupKey}`)
    }

    return new Response(
      JSON.stringify({ profile, source: 'claude', confidence: claudeConfidence }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('spirit-lookup error:', error)
    return jsonError((error as Error).message || 'Internal server error', 500)
  }
})

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

// ── Prompt ─────────────────────────────────────────────────────────────────────

function buildPrompt(bottleName: string, visionLabels: string[] = [], webEntities: string[] = [], bestGuessLabels: string[] = []): string {
  const labelsSection = visionLabels.length > 0
    ? `\nVisual labels detected by Google Vision (bottle imagery, shape, colour, packaging): ${visionLabels.join(', ')}`
    : ''

  const webSection = bestGuessLabels.length > 0 || webEntities.length > 0
    ? `\nGoogle Web Detection results:` +
      (bestGuessLabels.length > 0 ? `\n  Best guess: ${bestGuessLabels.join(', ')}` : '') +
      (webEntities.length > 0 ? `\n  Matched web entities: ${webEntities.join(', ')}` : '')
    : ''

  return `You are a spirits database. Given a bottle name and optional visual context, return a JSON object with the spirit's profile.

Bottle name (from OCR or Web Detection): "${bottleName}"${labelsSection}${webSection}

Identification priority:
1. If Google Web Detection "Best guess" is present, treat it as the authoritative bottle name — use it directly.
2. If Web Detection "Matched web entities" are present, use the top-scoring entity to confirm or supplement the name.
3. Use visual labels to resolve any remaining ambiguity (e.g. skull + crystal + vodka = Crystal Head Vodka; ceramic + hand-painted + agave = Clase Azul Tequila).
4. If the bottle name is "unknown bottle" or OCR noise (repeated characters, gibberish), rely entirely on Web Detection and visual labels.

Return ONLY a JSON object (no markdown, no explanation) in this exact shape:
{
  "id": "slug-from-name",
  "name": "Full Official Bottle Name",
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
  "tastingNotes": "2-3 sentence description of aroma, palate, and finish.",
  "origin": "Country of origin",
  "searchTerms": ["common name", "abbreviation", "alternate spelling"],
  "confidence": 0.95
}

Rules:
- Use real, accurate data for well-known bottles
- For unknown bottles, make a reasonable estimate based on the spirit type and brand
- flavorProfile should have 3-5 items, each 1-3 words
- tastingNotes should be 2-3 sentences, professional tasting note style
- priceTier: budget = under $20, mid-range = $20-40, premium = $40-80, ultra-premium = $80+
- searchTerms should include lowercase common references
- id should be lowercase kebab-case from the name
- confidence: 0.0-1.0. Use 0.9+ for well-known bottles you are certain about. Use 0.5-0.7 for bottles you are guessing from limited info. Use below 0.5 if you cannot reliably identify the bottle — in that case still return your best guess but set confidence low.`
}

// ── Normalise ──────────────────────────────────────────────────────────────────

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
    tastingNotes: p.tastingNotes || 'A distinctive spirit with its own character. Explore neat first.',
    origin: p.origin || 'International',
    searchTerms: Array.isArray(p.searchTerms) ? p.searchTerms : [name.toLowerCase()],
  }
}

// ── Row conversion ─────────────────────────────────────────────────────────────

function profileToRow(p: SpiritProfile, lookupKey: string): Record<string, unknown> {
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
    confidence: 0.85,
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
