/**
 * Barcode Service
 * Handles UPC/EAN barcode lookups for bottle identification.
 * Uses Open Food Facts API — free, no API key required, zero cost.
 *
 * Free tier users get barcode scanning instead of Google Vision (which costs money).
 * This service does the product lookup from a scanned barcode number.
 */

import { SPIRITS_DATABASE } from '../data/spiritsDatabase';
import type { Spirit } from '../data/spiritsDatabase';
import { log } from '../lib/logger';

const OPFF_API = 'https://world.openfoodfacts.org/api/v2/product';
const UPCITEMDB_API = 'https://api.upcitemdb.com/prod/trial/lookup';
const LOOKUP_TIMEOUT_MS = 6000;
const SPIRIT_KEYWORDS = [
  'whiskey', 'whisky', 'bourbon', 'scotch', 'rye',
  'vodka', 'gin', 'rum', 'tequila', 'mezcal', 'brandy', 'cognac',
  'liqueur', 'liquor', 'spirit', 'alcohol', 'distilled',
];
const NON_SPIRIT_HINTS = [
  'soda', 'juice', 'syrup', 'mixer', 'mix', 'snack', 'sauce',
  'marinade', 'candy', 'energy drink', 'water', 'tea', 'coffee',
];

export interface BarcodeResult {
  spirit: Spirit | null;
  productName: string | null; // Raw product name from OPFF, for pre-filling ManualBottleEntry
  productBrand: string | null;
  status: 'matched' | 'not_found' | 'invalid_barcode' | 'network_error';
  barcode: string | null;
}

interface ProductCandidate {
  name: string | null;
  brand: string | null;
  category: string | null;
  source: 'open_food_facts' | 'upcitemdb';
}

interface CandidateLookupResult {
  candidate: ProductCandidate | null;
  networkError: boolean;
}

export class BarcodeService {
  private static lookupCache = new Map<string, BarcodeResult>();

  /**
   * Look up a UPC/EAN barcode value.
   * 1. Calls Open Food Facts (free, no key) to get product name + brand.
   * 2. Tries to match against local spirits database.
   * Returns { spirit, productName, productBrand, status } — spirit is null if not matched locally.
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

    try {
      const variants = BarcodeService.getBarcodeVariants(normalizedBarcode);
      const { candidates, hasAnyNetworkError, allRequestsFailed } = await BarcodeService.fetchCandidates(variants);

      if (candidates.length === 0) {
        const status: BarcodeResult['status'] = hasAnyNetworkError && allRequestsFailed ? 'network_error' : 'not_found';
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
      const productName = bestCandidate.name || bestCandidate.brand || null;
      const productBrand = bestCandidate.brand || null;
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
      };
      BarcodeService.lookupCache.set(normalizedBarcode, result);
      return result;
    } catch (error: any) {
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
    return BarcodeService.matchBestSpirit([{
      name: productName || null,
      brand: brand || null,
      category: null,
      source: 'open_food_facts',
    }]);
  }

  private static async fetchCandidates(barcodes: string[]): Promise<{
    candidates: ProductCandidate[];
    hasAnyNetworkError: boolean;
    allRequestsFailed: boolean;
  }> {
    const allCandidates: ProductCandidate[] = [];
    let totalRequests = 0;
    let failedNetworkRequests = 0;

    for (const code of barcodes) {
      const [opffCandidate, upcItemDbCandidate] = await Promise.all([
        BarcodeService.lookupOpenFoodFacts(code),
        BarcodeService.lookupUpcItemDb(code),
      ]);

      totalRequests += 2;
      if (opffCandidate.networkError) failedNetworkRequests += 1;
      if (upcItemDbCandidate.networkError) failedNetworkRequests += 1;
      if (opffCandidate.candidate) allCandidates.push(opffCandidate.candidate);
      if (upcItemDbCandidate.candidate) allCandidates.push(upcItemDbCandidate.candidate);
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

  private static async lookupOpenFoodFacts(barcode: string): Promise<CandidateLookupResult> {
    const { data, networkError } = await BarcodeService.fetchJsonWithTimeout(
      `${OPFF_API}/${barcode}?fields=product_name,product_name_en,brands,categories`
    );

    if (!data || data.status !== 1 || !data.product) return { candidate: null, networkError };

    const product = data.product as Record<string, unknown>;
    const rawName = (product.product_name as string | undefined) ||
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

  private static async lookupUpcItemDb(barcode: string): Promise<CandidateLookupResult> {
    const { data, networkError } = await BarcodeService.fetchJsonWithTimeout(`${UPCITEMDB_API}?upc=${barcode}`);
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      return { candidate: null, networkError };
    }

    const item = data.items[0] as Record<string, unknown>;
    const name = (item.title as string | undefined) || null;
    const brand = (item.brand as string | undefined) || null;
    const category = ((item.category as string | undefined) || (item.description as string | undefined) || null);

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

  private static async fetchJsonWithTimeout(url: string): Promise<{ data: any | null; networkError: boolean }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) return { data: null, networkError: false };
      return { data: await response.json(), networkError: false };
    } catch {
      return { data: null, networkError: true };
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
      const combined = `${candidate.name || ''} ${candidate.brand || ''} ${candidate.category || ''}`.toLowerCase();
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

  private static scoreSpiritMatch(spirit: Spirit, normalizedText: string, isLikelySpirit: boolean): number {
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
      normalizedText.includes(BarcodeService.normalizeText(hint))
    );
    if (hasNonSpiritHint) return false;

    return SPIRIT_KEYWORDS.some((keyword) =>
      normalizedText.includes(BarcodeService.normalizeText(keyword))
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
