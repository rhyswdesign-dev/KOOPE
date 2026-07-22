/**
 * Shared bottle-matching scoring logic — server-side port of the "Layer 2"
 * OCR/label scoring algorithm in src/services/googleVisionService.ts
 * (GoogleVisionService.matchBottle). Kept in its own module so both the
 * bottle-recognize edge function (and, if ever needed, another function)
 * can score OCR text against the spirits_catalog table without duplicating
 * the threshold/gating logic in two places.
 *
 * Deliberately does NOT port the client's "Layer 1" Web Detection scoring —
 * bottle-recognize only requests TEXT_DETECTION + LABEL_DETECTION from
 * Google Vision (see supabase/functions/spirit-lookup/index.ts's own
 * documented rationale: Web Detection reliably misidentifies uncommon
 * bottles as the most famous brand in that category, so Claude reading the
 * label directly — the fallback path here — is preferred over it anyway).
 */

export interface CatalogRow {
  id: string
  name: string
  brand: string
  spirit_type: string
  abv: number
  price_tier: string
  price_usd_min: number | null
  price_usd_max: number | null
  price_cad_min: number | null
  price_cad_max: number | null
  price_gbp_min: number | null
  price_gbp_max: number | null
  flavor_profile: string[]
  tasting_notes: string
  origin: string
  search_terms: string[]
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Ported from GoogleVisionService.isSpiritImage (src/services/googleVisionService.ts) —
// at least one of these must appear in Vision labels/OCR for a photo to be
// treated as a bottle scan at all. Prevents plastic objects, shelf tags, and
// random items from ever reaching the catalog match or Claude.
const SPIRIT_SIGNALS = new Set([
  'bottle', 'alcohol', 'alcoholic beverage', 'spirits', 'liquor', 'distilled beverage',
  'wine bottle', 'beer bottle', 'spirit', 'beverage', 'drink', 'drinking',
  'vodka', 'gin', 'rum', 'whiskey', 'whisky', 'bourbon', 'scotch',
  'tequila', 'mezcal', 'brandy', 'cognac', 'liqueur', 'champagne', 'wine',
  'distilled', 'fermented', 'agave', 'barrel', 'cask', 'proof', 'abv',
])

/**
 * Stage 2 gate — does this even look like a spirit bottle? Checked before
 * any catalog/Claude work so a non-bottle photo doesn't spend that cost.
 */
export function isSpiritImage(labels: string[], ocrText: string): boolean {
  const labelsLower = labels.map((l) => l.toLowerCase())
  if (labelsLower.some((l) => SPIRIT_SIGNALS.has(l))) return true
  if (labelsLower.some((l) => [...SPIRIT_SIGNALS].some((s) => l.includes(s)))) return true
  if (/\d+(\.\d+)?\s*%\s*(abv|alc|vol|proof)/i.test(ocrText.toLowerCase())) return true
  return false
}

/**
 * Score OCR text + labels against the known catalog. Returns the matched row
 * or null if nothing clears the high-confidence gate (in which case the
 * caller should fall through to Claude).
 */
export function matchSpiritFromCatalog(
  ocrText: string,
  labels: string[],
  visionConfidence: number,
  catalog: CatalogRow[]
): CatalogRow | null {
  // Low confidence check — mirrors the client's Layer 2 gate.
  if (visionConfidence < 0.3) return null

  const normalizedText = ocrText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
  const allLabels = labels.join(' ').toLowerCase()

  let bestRow: CatalogRow | null = null
  let bestScore = 0
  let secondBestRow: CatalogRow | null = null
  let secondBestScore = 0
  let bestBrandScore = 0
  let bestNameScore = 0
  let bestMultiWordTermHits = 0

  for (const row of catalog) {
    const brand = normalizeForMatch(row.brand)
    const name = normalizeForMatch(row.name)
    const type = row.spirit_type.toLowerCase()
    let score = 0
    let brandScore = 0
    let nameScore = 0
    let multiWordTermHits = 0

    if (brand && normalizedText.includes(brand)) { brandScore = 8; score += 8 }
    if (name && normalizedText.includes(name)) { nameScore = 6; score += 6 }
    if (allLabels.includes(type)) score += 2

    for (const term of row.search_terms || []) {
      const normalizedTerm = normalizeForMatch(term)
      if (normalizedTerm.length < 3) continue
      if (normalizedText.includes(normalizedTerm)) {
        if (normalizedTerm.trim().split(/\s+/).length >= 2) multiWordTermHits++
        score += 4
      }
    }

    if (score > bestScore) {
      secondBestScore = bestScore
      secondBestRow = bestRow
      bestScore = score
      bestRow = row
      bestBrandScore = brandScore
      bestNameScore = nameScore
      bestMultiWordTermHits = multiWordTermHits
    } else if (score > secondBestScore) {
      secondBestScore = score
      secondBestRow = row
    }
  }

  // High-confidence gate: brand must appear in OCR AND at least one of:
  // the product name appears verbatim, or a multi-word search term matches.
  const isHighConfidence = bestBrandScore > 0 && (bestNameScore > 0 || bestMultiWordTermHits > 0)

  if (!bestRow || bestScore < 14 || !isHighConfidence) return null

  // Variant ambiguity check — same brand, close scores, can't confidently
  // pick a variant (e.g. Green vs Yellow Chartreuse). Defer to Claude.
  if (
    secondBestRow &&
    secondBestScore >= 14 &&
    normalizeForMatch(bestRow.brand) === normalizeForMatch(secondBestRow.brand) &&
    bestScore - secondBestScore <= 4
  ) {
    return null
  }

  return bestRow
}
