/**
 * Barcode Service
 * Resolves a UPC/EAN barcode into a Spirit.
 *
 * Called only from the silent, always-on barcode decode running underneath the
 * one scan screen (scanner spec A.0) — the user never asks for a barcode scan
 * and never learns one happened.
 *
 * Resolution is a RACE, not a waterfall (spec A.3):
 *
 *   tier 1 (first-party, indexed key lookups, ~150–300ms)
 *     · bottle_barcode_mappings via get_barcode_winner  — user-corrected truth
 *     · spirits_cache (`barcode_<code>`)                — previously resolved
 *   tier 2 (public grocery APIs — Open Food Facts / UPCitemdb / LCBO)
 *
 * All of it is dispatched in parallel on the same tick. The moment tier 1
 * answers, tier 2 is aborted and we return — the project's own tables are the
 * primary source now, not a correction sink downstream of the fast path.
 */

import { SPIRITS_DATABASE } from '../data/spiritsDatabase';
import type { Spirit } from '../data/spiritsDatabase';
import { log } from '../lib/logger';
import { supabase } from '../lib/supabase';

const OPFF_API = 'https://world.openfoodfacts.org/api/v2/product';
const UPCITEMDB_API = 'https://api.upcitemdb.com/prod/trial/lookup';
const LCBO_API = 'https://platform.lcbo.com/catalog/v1/products';
const LOOKUP_TIMEOUT_MS = 6000;
const SPIRIT_KEYWORDS = [
  'whiskey',
  'whisky',
  'bourbon',
  'scotch',
  'rye',
  'vodka',
  'gin',
  'rum',
  'tequila',
  'mezcal',
  'brandy',
  'cognac',
  'liqueur',
  'liquor',
  'spirit',
  'alcohol',
  'distilled',
];
const NON_SPIRIT_HINTS = [
  'soda',
  'juice',
  'syrup',
  'mixer',
  'mix',
  'snack',
  'sauce',
  'marinade',
  'candy',
  'energy drink',
  'water',
  'tea',
  'coffee',
];

/** Which racer produced the answer — telemetry only, never surfaced in UI. */
export type BarcodeResolutionSource = 'community' | 'cache' | 'public';

export interface BarcodeResult {
  spirit: Spirit | null;
  productName: string | null; // Raw product name from OPFF, for pre-filling ManualBottleEntry
  productBrand: string | null;
  status: 'matched' | 'not_found' | 'invalid_barcode' | 'network_error';
  barcode: string | null;
  /** Set when `spirit` is non-null. Feeds scan telemetry's resolutionSource. */
  source?: BarcodeResolutionSource;
}

interface ProductCandidate {
  name: string | null;
  brand: string | null;
  category: string | null;
  source: 'open_food_facts' | 'upcitemdb' | 'lcbo';
}

interface CandidateLookupResult {
  candidate: ProductCandidate | null;
  networkError: boolean;
}

export class BarcodeService {
  private static lookupCache = new Map<string, BarcodeResult>();

  /**
   * Resolve a UPC/EAN barcode. See the file header for the race layout.
   * Returns { spirit, productName, productBrand, status } — spirit is null if
   * nothing resolved it with adequate confidence.
   */
  static async lookupBarcode(barcode: string): Promise<BarcodeResult> {
    const normalizedBarcode = BarcodeService.normalizeBarcode(barcode);
    if (!normalizedBarcode || !BarcodeService.isSupportedBarcode(normalizedBarcode)) {
      return {
        spirit: null,
        productName: null,
        productBrand: null,
        status: 'invalid_barcode',
        barcode: normalizedBarcode,
      };
    }

    const cached = BarcodeService.lookupCache.get(normalizedBarcode);
    if (cached) {
      return cached;
    }

    const publicApiAbort = new AbortController();

    try {
      const variants = BarcodeService.getBarcodeVariants(normalizedBarcode);

      // Dispatch every racer on the same tick. The public-API leg is started
      // first so it is genuinely in flight while tier 1 resolves; it is
      // abandoned (and aborted) the moment tier 1 answers.
      const publicApis = BarcodeService.fetchCandidates(variants, publicApiAbort.signal);
      publicApis.catch(() => {}); // abandoned-branch guard, real handling below

      const firstParty = await BarcodeService.resolveFirstParty(normalizedBarcode, variants);

      if (firstParty) {
        publicApiAbort.abort();
        log.info('BarcodeService', 'Barcode resolved first-party', {
          barcode: normalizedBarcode,
          source: firstParty.source,
          name: firstParty.spirit.name,
        });
        const result: BarcodeResult = {
          spirit: firstParty.spirit,
          productName: firstParty.spirit.name,
          productBrand: firstParty.spirit.brand,
          status: 'matched',
          barcode: normalizedBarcode,
          source: firstParty.source,
        };
        BarcodeService.lookupCache.set(normalizedBarcode, result);
        return result;
      }

      const { candidates, hasAnyNetworkError, allRequestsFailed } = await publicApis;

      if (candidates.length === 0) {
        const status: BarcodeResult['status'] =
          hasAnyNetworkError && allRequestsFailed ? 'network_error' : 'not_found';
        log.info('BarcodeService', 'Barcode lookup returned no candidates', {
          barcode: normalizedBarcode,
          status,
        });
        const result: BarcodeResult = {
          spirit: null,
          productName: null,
          productBrand: null,
          status,
          barcode: normalizedBarcode,
        };
        BarcodeService.lookupCache.set(normalizedBarcode, result);
        return result;
      }

      const spirit = BarcodeService.matchBestSpirit(candidates);
      const bestCandidate = BarcodeService.pickBestPrefillCandidate(candidates);
      const productName = spirit?.name || bestCandidate?.name || bestCandidate?.brand || null;
      const productBrand = spirit?.brand || bestCandidate?.brand || null;
      const status: BarcodeResult['status'] = spirit ? 'matched' : 'not_found';

      log.info('BarcodeService', 'Barcode lookup complete', {
        barcode: normalizedBarcode,
        productName,
        productBrand,
        status,
        matched: !!spirit,
        sources: [...new Set(candidates.map((c) => c.source))],
      });

      const result: BarcodeResult = {
        spirit,
        productName,
        productBrand,
        status,
        barcode: normalizedBarcode,
        ...(spirit ? { source: 'public' as const } : {}),
      };
      BarcodeService.lookupCache.set(normalizedBarcode, result);

      // Persist matched barcode → spirit to spirits_cache for future AI vision lookups
      if (spirit) {
        BarcodeService.persistBarcodeCacheEntry(normalizedBarcode, spirit).catch(() => {});
      }

      return result;
    } catch (error: any) {
      publicApiAbort.abort();
      if (error?.name === 'AbortError') {
        log.info('BarcodeService', 'Barcode lookup timed out', { barcode: normalizedBarcode });
      } else {
        log.error('BarcodeService', 'Error looking up barcode', error);
      }
      return {
        spirit: null,
        productName: null,
        productBrand: null,
        status: 'network_error',
        barcode: normalizedBarcode,
      };
    }
  }

  /**
   * Match a product name + brand string against the local spirits database.
   * Checks searchTerms and brand name.
   */
  static matchSpirit(productName: string, brand: string): Spirit | null {
    return BarcodeService.matchBestSpirit([
      {
        name: productName || null,
        brand: brand || null,
        category: null,
        source: 'open_food_facts',
      },
    ]);
  }

  /**
   * Tier 2 of the race — the three public grocery-UPC APIs.
   *
   * Every API × every barcode variant fires on one tick. This used to walk the
   * variants sequentially (`for` + `await`), which turned a 2-variant UPC-A
   * lookup into two serial 6-second timeout windows.
   */
  private static async fetchCandidates(
    barcodes: string[],
    signal?: AbortSignal,
  ): Promise<{
    candidates: ProductCandidate[];
    hasAnyNetworkError: boolean;
    allRequestsFailed: boolean;
  }> {
    const results = (
      await Promise.all(
        barcodes.map((code) =>
          Promise.all([
            BarcodeService.lookupOpenFoodFacts(code, signal),
            BarcodeService.lookupUpcItemDb(code, signal),
            BarcodeService.lookupLCBO(code, signal),
          ]),
        ),
      )
    ).flat();

    const allCandidates: ProductCandidate[] = [];
    const totalRequests = results.length;
    let failedNetworkRequests = 0;

    for (const result of results) {
      if (result.networkError) failedNetworkRequests += 1;
      if (result.candidate) allCandidates.push(result.candidate);
    }

    // Keep unique names first to avoid duplicate scoring from equivalent sources.
    const seen = new Set<string>();
    const unique = allCandidates.filter((c) => {
      const key = `${BarcodeService.normalizeText(c.name || '')}|${BarcodeService.normalizeText(c.brand || '')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return {
      candidates: unique,
      hasAnyNetworkError: failedNetworkRequests > 0,
      allRequestsFailed: totalRequests > 0 && failedNetworkRequests === totalRequests,
    };
  }

  private static async lookupOpenFoodFacts(
    barcode: string,
    signal?: AbortSignal,
  ): Promise<CandidateLookupResult> {
    const { data, networkError } = await BarcodeService.fetchJsonWithTimeout(
      `${OPFF_API}/${barcode}?fields=product_name,product_name_en,brands,categories`,
      signal,
    );

    if (!data || data.status !== 1 || !data.product) return { candidate: null, networkError };

    const product = data.product as Record<string, unknown>;
    const rawName =
      (product.product_name as string | undefined) ||
      (product.product_name_en as string | undefined) ||
      null;
    const brands = (product.brands as string | undefined) || '';
    const brand = brands.split(',')[0]?.trim() || null;
    const category = (product.categories as string | undefined) || null;

    if (!rawName && !brand) return { candidate: null, networkError };

    return {
      candidate: {
        name: rawName,
        brand,
        category,
        source: 'open_food_facts',
      },
      networkError,
    };
  }

  private static async lookupUpcItemDb(
    barcode: string,
    signal?: AbortSignal,
  ): Promise<CandidateLookupResult> {
    const { data, networkError } = await BarcodeService.fetchJsonWithTimeout(
      `${UPCITEMDB_API}?upc=${barcode}`,
      signal,
    );
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      return { candidate: null, networkError };
    }

    const item = data.items[0] as Record<string, unknown>;
    const name = (item.title as string | undefined) || null;
    const brand = (item.brand as string | undefined) || null;
    const category =
      (item.category as string | undefined) || (item.description as string | undefined) || null;

    if (!name && !brand) return { candidate: null, networkError };

    return {
      candidate: {
        name,
        brand,
        category,
        source: 'upcitemdb',
      },
      networkError,
    };
  }

  /**
   * LCBO open data product catalog — ~15,000 SKUs, barcode-mapped, free.
   * Queried by UPC; returns product name and category when found.
   */
  private static async lookupLCBO(
    barcode: string,
    signal?: AbortSignal,
  ): Promise<CandidateLookupResult> {
    const { data, networkError } = await BarcodeService.fetchJsonWithTimeout(
      `${LCBO_API}?filter[upc_code]=${barcode}&fields[products]=name,brand,primary_category`,
      signal,
    );

    if (!data || !Array.isArray(data.data) || data.data.length === 0) {
      return { candidate: null, networkError };
    }

    const attrs = (data.data[0] as any)?.attributes as Record<string, unknown> | undefined;
    if (!attrs) return { candidate: null, networkError };

    const name = (attrs.name as string | undefined) || null;
    const brand = (attrs.brand as string | undefined) || null;
    const category = (attrs.primary_category as string | undefined) || null;

    if (!name && !brand) return { candidate: null, networkError };

    return {
      candidate: { name, brand, category, source: 'lcbo' },
      networkError,
    };
  }

  /**
   * Persist a successful barcode → spirit match to spirits_cache so future
   * AI vision lookups for the same bottle benefit immediately.
   * Uses `barcode_XXXX` as lookup_key to avoid any schema migration.
   *
   * Column names must match supabase/migrations/018_spirits_cache.sql exactly
   * (name/brand, not spirit_name/spirit_brand/spirit_id) — a prior version of
   * this upsert used non-existent columns and was silently failing.
   */
  private static async persistBarcodeCacheEntry(barcode: string, spirit: Spirit): Promise<void> {
    try {
      const lookupKey = `barcode_${barcode}`;
      await supabase.from('spirits_cache').upsert(
        {
          lookup_key: lookupKey,
          name: spirit.name,
          brand: spirit.brand,
          spirit_type: spirit.type,
          abv: spirit.abv,
          origin: spirit.origin,
          price_tier: spirit.priceTier,
          price_usd_min: spirit.priceEstimate?.USD?.min ?? null,
          price_usd_max: spirit.priceEstimate?.USD?.max ?? null,
          price_cad_min: spirit.priceEstimate?.CAD?.min ?? null,
          price_cad_max: spirit.priceEstimate?.CAD?.max ?? null,
          price_gbp_min: spirit.priceEstimate?.GBP?.min ?? null,
          price_gbp_max: spirit.priceEstimate?.GBP?.max ?? null,
          flavor_profile: spirit.flavorProfile,
          tasting_notes: spirit.tastingNotes,
          search_terms: spirit.searchTerms,
          confidence: 1.0,
          source: 'barcode',
        },
        { onConflict: 'lookup_key', ignoreDuplicates: true },
      );
    } catch {
      // Non-fatal — cache write failure does not affect the user
    }
  }

  /**
   * Tier 1 of the race — the project's own tables, both queried in parallel.
   *
   * Both legs are one indexed Postgres round trip, so they land within tens of
   * milliseconds of each other; taking the literal first responder would let a
   * stale `spirits_cache` row (written from a *heuristic* public-API match)
   * outrank a `bottle_barcode_mappings` row that real users voted into place.
   * So: both run concurrently, the corrected table wins ties. The race that
   * matters for latency is tier 1 vs. the public APIs, and that one is real.
   */
  private static async resolveFirstParty(
    barcode: string,
    variants: string[],
  ): Promise<{ spirit: Spirit; source: BarcodeResolutionSource } | null> {
    const [communityWinnerId, cachedSpirit] = await Promise.all([
      BarcodeService.getCommunityWinner(barcode),
      BarcodeService.lookupSpiritsCache(variants),
    ]);

    if (communityWinnerId) {
      const communitySpirit = await BarcodeService.resolveCommunityWinner(communityWinnerId);
      if (communitySpirit) return { spirit: communitySpirit, source: 'community' };
    }

    return cachedSpirit ? { spirit: cachedSpirit, source: 'cache' } : null;
  }

  /**
   * Look this barcode up in `spirits_cache`, where every previously resolved
   * barcode is written under a `barcode_<code>` lookup key (see
   * persistBarcodeCacheEntry). A hit skips the public APIs entirely — this is
   * the compounding half of the flywheel in spec A.5.
   */
  private static async lookupSpiritsCache(variants: string[]): Promise<Spirit | null> {
    try {
      const { data, error } = await supabase
        .from('spirits_cache')
        .select('*')
        .in(
          'lookup_key',
          variants.map((v) => `barcode_${v}`),
        )
        .limit(1)
        .maybeSingle();
      if (error || !data) return null;
      return BarcodeService.rowToSpirit(data, data.id);
    } catch {
      return null;
    }
  }

  /**
   * Check the community weighted-vote table for a known-correct bottle for
   * this barcode (populated by scan corrections — see scanCorrectionService).
   * Returns a bottle id (local slug or spirits_cache UUID) or null.
   */
  private static async getCommunityWinner(barcode: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('get_barcode_winner', { p_barcode: barcode });
      if (error || !data) return null;
      return data as string;
    } catch {
      return null;
    }
  }

  /**
   * Resolve a community-winner bottle id to a full Spirit — checks the local
   * database first (most bottle ids are local slugs), then spirits_cache
   * (populated for AI-identified bottles, keyed by UUID).
   */
  private static async resolveCommunityWinner(bottleId: string): Promise<Spirit | null> {
    const local = SPIRITS_DATABASE.find((s) => s.id === bottleId);
    if (local) return local;

    try {
      const { data, error } = await supabase
        .from('spirits_cache')
        .select('*')
        .eq('id', bottleId)
        .maybeSingle();
      if (error || !data) return null;

      return BarcodeService.rowToSpirit(data, bottleId);
    } catch {
      return null;
    }
  }

  /** Map a `spirits_cache` row onto the Spirit shape the app renders. */
  private static rowToSpirit(row: any, id: string): Spirit {
    return {
      id,
      name: row.name,
      brand: row.brand,
      type: row.spirit_type,
      abv: row.abv ?? 40,
      priceTier: row.price_tier ?? 'mid-range',
      priceEstimate: {
        USD: { min: row.price_usd_min ?? 20, max: row.price_usd_max ?? 35 },
        CAD: { min: row.price_cad_min ?? 28, max: row.price_cad_max ?? 45 },
        GBP: { min: row.price_gbp_min ?? 18, max: row.price_gbp_max ?? 30 },
      },
      flavorProfile: row.flavor_profile ?? [],
      tastingNotes: row.tasting_notes ?? '',
      origin: row.origin ?? '',
      searchTerms: row.search_terms ?? [],
    } as Spirit;
  }

  /**
   * `externalSignal` is the race's cancel handle: once tier 1 has answered,
   * these requests are dead weight. A cancelled request is NOT a network error
   * — reporting it as one would flip a perfectly good first-party hit into a
   * bogus "network_error" status downstream.
   *
   * RN's AbortSignal doesn't reliably implement addEventListener across
   * versions, so mid-flight cancellation is best-effort; when it's missing we
   * still short-circuit before the fetch and simply let the abandoned request
   * run to its own timeout, which is exactly today's behaviour.
   */
  private static async fetchJsonWithTimeout(
    url: string,
    externalSignal?: AbortSignal,
  ): Promise<{ data: any | null; networkError: boolean }> {
    if (externalSignal?.aborted) return { data: null, networkError: false };

    const controller = new AbortController();
    const abort = () => controller.abort();
    const timeout = setTimeout(abort, LOOKUP_TIMEOUT_MS);
    const canListen = typeof externalSignal?.addEventListener === 'function';
    if (canListen) externalSignal!.addEventListener('abort', abort);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return { data: null, networkError: false };
      return { data: await response.json(), networkError: false };
    } catch {
      return { data: null, networkError: !externalSignal?.aborted };
    } finally {
      clearTimeout(timeout);
      if (canListen) externalSignal!.removeEventListener('abort', abort);
    }
  }

  private static getBarcodeVariants(raw: string): string[] {
    const barcode = BarcodeService.normalizeBarcode(raw) || raw.trim();
    const variants = new Set<string>([barcode]);

    // UPC-A (12) <-> EAN-13 (13 with leading 0) normalization.
    if (barcode.length === 12) variants.add(`0${barcode}`);
    if (barcode.length === 13 && barcode.startsWith('0')) variants.add(barcode.slice(1));

    return Array.from(variants);
  }

  private static normalizeBarcode(raw: string): string {
    return raw.replace(/\D/g, '');
  }

  private static isSupportedBarcode(barcode: string): boolean {
    return barcode.length === 8 || barcode.length === 12 || barcode.length === 13;
  }

  private static pickBestPrefillCandidate(candidates: ProductCandidate[]): ProductCandidate {
    let best = candidates[0];
    let bestScore = -1;

    for (const candidate of candidates) {
      const combined = `${candidate.name || ''} ${candidate.brand || ''} ${candidate.category || ''}`;
      const normalized = BarcodeService.normalizeText(combined);
      const likelySpirit = BarcodeService.isLikelySpiritProduct(normalized);

      let score = 0;
      if (candidate.name) score += 3;
      if (candidate.brand) score += 3;
      if (candidate.category) score += 1;
      if (likelySpirit) score += 2;
      if (candidate.source === 'open_food_facts') score += 1;

      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    return best;
  }

  private static matchBestSpirit(candidates: ProductCandidate[]): Spirit | null {
    let bestSpirit: Spirit | null = null;
    let bestScore = -1;

    for (const candidate of candidates) {
      const combined =
        `${candidate.name || ''} ${candidate.brand || ''} ${candidate.category || ''}`.toLowerCase();
      const normalizedCombined = BarcodeService.normalizeText(combined);
      const isLikelySpirit = BarcodeService.isLikelySpiritProduct(normalizedCombined);

      for (const spirit of SPIRITS_DATABASE) {
        const score = BarcodeService.scoreSpiritMatch(spirit, normalizedCombined, isLikelySpirit);
        if (score > bestScore) {
          bestScore = score;
          bestSpirit = spirit;
        }
      }
    }

    // Threshold prevents accidental matches on noisy product metadata.
    return bestScore >= 5 ? bestSpirit : null;
  }

  private static scoreSpiritMatch(
    spirit: Spirit,
    normalizedText: string,
    isLikelySpirit: boolean,
  ): number {
    const normalizedBrand = BarcodeService.normalizeText(spirit.brand);
    const normalizedName = BarcodeService.normalizeText(spirit.name);
    const normalizedType = BarcodeService.normalizeText(spirit.type);

    let score = 0;

    if (normalizedBrand && normalizedText.includes(normalizedBrand)) score += 6;
    if (normalizedName && normalizedText.includes(normalizedName)) score += 5;
    if (normalizedType && normalizedText.includes(normalizedType)) score += 2;

    for (const term of spirit.searchTerms) {
      const normalizedTerm = BarcodeService.normalizeText(term);
      if (normalizedTerm && normalizedText.includes(normalizedTerm)) score += 3;
    }

    if (!isLikelySpirit) score -= 3;
    return score;
  }

  private static isLikelySpiritProduct(normalizedText: string): boolean {
    if (!normalizedText) return false;

    const hasNonSpiritHint = NON_SPIRIT_HINTS.some((hint) =>
      normalizedText.includes(BarcodeService.normalizeText(hint)),
    );
    if (hasNonSpiritHint) return false;

    return SPIRIT_KEYWORDS.some((keyword) =>
      normalizedText.includes(BarcodeService.normalizeText(keyword)),
    );
  }

  private static normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
