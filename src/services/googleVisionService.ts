/**
 * Google Cloud Vision API Service
 * Provides real image analysis for spirit bottle recognition.
 * API calls are proxied through the vision-analyze edge function so the
 * Google Cloud Vision API key never touches the client bundle.
 */

import * as ImageManipulator from 'expo-image-manipulator';
import { log } from '../lib/logger';
import { findSpirit, SPIRITS_DATABASE, type Spirit } from '../data/spiritsDatabase';
import { supabase } from '../lib/supabase';

export interface VisionResult {
  labels: string[];
  text?: string[];
  confidence: number;
}

const DEMO_BOTTLE_RESULTS: Record<string, VisionResult> = {
  bacardi: {
    labels: ['bottle', 'rum', 'white rum', 'alcohol', 'spirits', 'bacardi'],
    text: ['BACARDI', 'SUPERIOR', 'WHITE RUM', '40% ALC/VOL', 'PUERTO RICO'],
    confidence: 0.93,
  },
  hendricks: {
    labels: ['bottle', 'gin', 'spirits', 'cucumber', 'scottish'],
    text: ['HENDRICK\'S', 'GIN', 'DISTILLED', '44% ALC/VOL', 'SCOTLAND', 'CUCUMBER', 'ROSE'],
    confidence: 0.92,
  },
  woodford: {
    labels: ['bottle', 'bourbon', 'whiskey', 'barrel', 'american'],
    text: ['WOODFORD', 'RESERVE', 'KENTUCKY', 'STRAIGHT', 'BOURBON', '45.2% ALC/VOL'],
    confidence: 0.9,
  },
  johnnie: {
    labels: ['bottle', 'scotch', 'whiskey', 'spirits', 'smoky'],
    text: ['JOHNNIE', 'WALKER', 'BLACK LABEL', 'BLENDED SCOTCH WHISKY', '40% ALC/VOL'],
    confidence: 0.91,
  },
  donJulio: {
    labels: ['bottle', 'tequila', 'agave', 'spirits', 'mexican'],
    text: ['DON JULIO', 'BLANCO', 'TEQUILA', '100% DE AGAVE', '40% ALC/VOL'],
    confidence: 0.92,
  },
};

function chooseDemoBottleResult(imageUri: string): VisionResult {
  const normalizedUri = imageUri.toLowerCase();
  const keywordMap: Array<{ patterns: string[]; key: keyof typeof DEMO_BOTTLE_RESULTS }> = [
    { patterns: ['bacardi', 'rum'], key: 'bacardi' },
    { patterns: ['hendrick', 'gin'], key: 'hendricks' },
    { patterns: ['woodford', 'bourbon'], key: 'woodford' },
    { patterns: ['johnnie', 'scotch', 'whisky', 'whiskey'], key: 'johnnie' },
    { patterns: ['donjulio', 'don-julio', 'tequila', 'agave'], key: 'donJulio' },
  ];

  const keywordMatch = keywordMap.find((entry) =>
    entry.patterns.some((pattern) => normalizedUri.includes(pattern))
  );
  if (keywordMatch) {
    return DEMO_BOTTLE_RESULTS[keywordMatch.key];
  }

  const demoKeys = Object.keys(DEMO_BOTTLE_RESULTS) as Array<keyof typeof DEMO_BOTTLE_RESULTS>;
  const hash = normalizedUri.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return DEMO_BOTTLE_RESULTS[demoKeys[hash % demoKeys.length]];
}

export class GoogleVisionService {
  /**
   * Analyzes an image via the vision-analyze edge function.
   * The Google Cloud Vision API key is stored as a server-side secret and
   * never exposed in the client bundle.
   */
  static async analyzeImage(imageUri: string): Promise<VisionResult> {
    try {
      const base64Image = await this.convertImageToBase64(imageUri);

      const { data, error } = await supabase.functions.invoke('vision-analyze', {
        body: { imageBase64: base64Image },
      });

      if (error || !data) {
        log.warn('GoogleVisionService', 'Edge function failed', error);
        if (__DEV__) {
          return this.fallbackAnalysis(imageUri);
        }
        throw new Error('Vision analysis unavailable');
      }

      log.info('GoogleVisionService', 'Parsed vision results', {
        textCount: data.text?.length || 0,
        labelCount: data.labels?.length || 0,
        confidence: data.confidence,
      });

      return data as VisionResult;
    } catch (error) {
      log.error('GoogleVisionService', 'Error analyzing image', error);
      if (__DEV__) {
        return this.fallbackAnalysis(imageUri);
      }
      throw error;
    }
  }

  private static async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      const result = await ImageManipulator.manipulateAsync(imageUri, [], {
        base64: true,
      });
      if (!result.base64) throw new Error('No base64 data returned');
      return result.base64;
    } catch (error) {
      log.error('GoogleVisionService', 'Error converting image to base64', error);
      throw new Error('Failed to read image file');
    }
  }

  /**
   * Fallback analysis when API is not available
   * Uses a simple mock based on image characteristics
   */
  private static async fallbackAnalysis(imageUri: string): Promise<VisionResult> {
    log.info('GoogleVisionService', 'Using fallback analysis');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Demo mode should show believable, recognized bottle detail flows instead of
    // random unknown results. We use filename hints when available and otherwise
    // fall back to a deterministic curated set of sample bottles.
    return chooseDemoBottleResult(imageUri);
  }

  /**
   * Enhanced spirit matching algorithm
   * Analyzes OCR text and labels to identify the spirit
   */
  static matchSpirit(result: VisionResult): {
    name?: string;
    brand?: string;
    category?: string;
    subcategory?: string;
    abv?: number;
  } | null {
    const allText = (result.text || []).join(' ').toUpperCase();
    const allLabels = result.labels.join(' ').toLowerCase();

    log.info('GoogleVisionService', 'Matching spirit', {
      textLength: allText.length,
      labelsCount: result.labels.length,
    });

    // Low confidence check
    if (result.confidence < 0.4) {
      log.warn('GoogleVisionService', 'Confidence too low for matching', {
        confidence: result.confidence,
      });
      return null;
    }

    // Extract ABV if present
    const abvMatch = allText.match(/(\d+(?:\.\d+)?)\s*%?\s*(?:ALC|ABV|ALCOHOL)/i);
    const abv = abvMatch ? parseFloat(abvMatch[1]) : undefined;

    // Common brand patterns
    const brands = {
      vodka: ['TITO\'S', 'GREY GOOSE', 'BELVEDERE', 'ABSOLUT', 'KETEL ONE', 'STOLICHNAYA', 'SMIRNOFF', 'SKYY'],
      gin: ['HENDRICK\'S', 'TANQUERAY', 'BOMBAY', 'BEEFEATER', 'GORDON\'S', 'AVIATION', 'MONKEY 47'],
      whiskey: ['BUFFALO TRACE', 'MAKER\'S MARK', 'JAMESON', 'JACK DANIEL\'S', 'JOHNNIE WALKER', 'CROWN ROYAL', 'BULLEIT'],
      bourbon: ['BUFFALO TRACE', 'MAKER\'S MARK', 'WILD TURKEY', 'JIM BEAM', 'WOODFORD', 'FOUR ROSES'],
      rum: ['BACARDI', 'CAPTAIN MORGAN', 'HAVANA CLUB', 'APPLETON', 'MOUNT GAY', 'PLANTATION'],
      tequila: ['PATRON', 'DON JULIO', 'CASAMIGOS', 'HERRADURA', 'ESPOLON', '1800', 'HORNITOS'],
      mezcal: ['DEL MAGUEY', 'VIDA', 'ILEGAL', 'MONTELOBOS', 'SOMBRA'],
    };

    // Try to identify category and brand
    for (const [category, brandList] of Object.entries(brands)) {
      for (const brand of brandList) {
        if (allText.includes(brand)) {
          log.info('GoogleVisionService', 'Spirit matched', {
            brand,
            category,
            abv,
          });

          return {
            name: brand,
            brand: brand,
            category: category === 'bourbon' ? 'whiskey' : 'spirit',
            subcategory: category,
            abv,
          };
        }
      }
    }

    // If no specific brand matched, try to identify category from labels
    if (allLabels.includes('vodka')) {
      return { category: 'spirit', subcategory: 'vodka', abv };
    }
    if (allLabels.includes('gin')) {
      return { category: 'spirit', subcategory: 'gin', abv };
    }
    if (allLabels.includes('whiskey') || allLabels.includes('whisky') || allLabels.includes('bourbon')) {
      return { category: 'spirit', subcategory: 'whiskey', abv };
    }
    if (allLabels.includes('rum')) {
      return { category: 'spirit', subcategory: 'rum', abv };
    }
    if (allLabels.includes('tequila')) {
      return { category: 'spirit', subcategory: 'tequila', abv };
    }

    log.warn('GoogleVisionService', 'Could not match spirit from results');
    return null;
  }

  /**
   * Match ingredient from vision results
   * Identifies common cocktail ingredients from image analysis
   */
  static matchIngredient(result: VisionResult): {
    name: string;
    category: string;
    confidence: number;
  } | null {
    const matches = this.matchIngredients(result, 1);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * Match multiple ingredients from vision results.
   * Useful when one photo contains several items (e.g. lemon + mint + cucumber).
   */
  static matchIngredients(
    result: VisionResult,
    maxResults: number = 6
  ): Array<{
    name: string;
    category: string;
    confidence: number;
  }> {
    const allText = (result.text || []).join(' ').toLowerCase();
    const allLabels = result.labels.join(' ').toLowerCase();

    log.info('GoogleVisionService', 'Matching multiple ingredients', {
      textLength: allText.length,
      labelsCount: result.labels.length,
      confidence: result.confidence,
      maxResults,
    });

    if (result.confidence < 0.3) {
      log.warn('GoogleVisionService', 'Confidence too low for ingredient matching', {
        confidence: result.confidence,
      });
      return [];
    }

    const ingredients: Record<string, string[]> = {
      citrus: ['lemon', 'lime', 'orange', 'grapefruit', 'yuzu', 'bergamot'],
      herbs: ['mint', 'basil', 'rosemary', 'thyme', 'sage', 'cilantro', 'parsley'],
      fruits: ['strawberry', 'raspberry', 'blackberry', 'blueberry', 'cherry', 'pineapple', 'mango', 'watermelon', 'apple', 'pear', 'peach'],
      vegetables: ['cucumber', 'celery', 'tomato', 'pepper', 'jalapeño', 'ginger'],
      garnishes: ['olive', 'orange peel', 'lemon peel', 'lime wheel', 'mint sprig'],
      spices: ['cinnamon', 'nutmeg', 'clove', 'cardamom', 'vanilla'],
      sweeteners: ['sugar', 'honey', 'agave', 'syrup', 'simple syrup'],
    };

    const scoredMatches: Array<{ name: string; category: string; score: number }> = [];
    for (const [category, ingredientList] of Object.entries(ingredients)) {
      for (const ingredient of ingredientList) {
        let score = 0;
        if (allLabels.includes(ingredient)) score += 2;
        if (allText.includes(ingredient)) score += 1;
        if (score > 0) {
          scoredMatches.push({ name: ingredient, category, score });
        }
      }
    }

    const deduped = new Map<string, { name: string; category: string; score: number }>();
    for (const match of scoredMatches) {
      const key = match.name.toLowerCase();
      const existing = deduped.get(key);
      if (!existing || match.score > existing.score) {
        deduped.set(key, match);
      }
    }

    const topMatches = Array.from(deduped.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, maxResults));

    if (topMatches.length === 0) {
      if (allLabels.includes('fruit')) return [{ name: 'Fruit', category: 'Fruits', confidence: result.confidence }];
      if (allLabels.includes('herb') || allLabels.includes('plant')) return [{ name: 'Herb', category: 'Herbs', confidence: result.confidence }];
      if (allLabels.includes('vegetable')) return [{ name: 'Vegetable', category: 'Vegetables', confidence: result.confidence }];
      if (allLabels.includes('citrus')) return [{ name: 'Citrus', category: 'Citrus', confidence: result.confidence }];
      log.warn('GoogleVisionService', 'Could not match ingredients from results');
      return [];
    }

    return topMatches.map((match) => ({
      name: match.name.charAt(0).toUpperCase() + match.name.slice(1),
      category: match.category.charAt(0).toUpperCase() + match.category.slice(1),
      confidence: Math.min(0.99, result.confidence * (0.75 + 0.1 * match.score)),
    }));
  }

  /**
   * Detect what type of item was scanned
   * Returns: 'bottle' | 'recipe' | 'ingredient' | 'unknown'
   */
  static detectScanType(result: VisionResult): 'bottle' | 'recipe' | 'ingredient' | 'unknown' {
    const allText = (result.text || []).join(' ').toUpperCase();
    const allLabels = result.labels.join(' ').toLowerCase();

    log.info('GoogleVisionService', 'Detecting scan type', {
      labelsCount: result.labels.length,
      textLength: allText.length,
    });

    // Check for bottle indicators
    const bottleIndicators = [
      'bottle', 'alcohol', 'spirits', 'liquor', 'vodka', 'gin', 'rum',
      'whiskey', 'tequila', 'mezcal', 'brandy', 'cognac', 'liqueur',
      'abv', 'alc/vol', 'proof', 'distilled', 'barrel'
    ];

    // Check for recipe indicators
    const recipeIndicators = [
      'oz', 'ml', 'cup', 'tsp', 'tbsp', 'dash', 'splash',
      'ingredients', 'recipe', 'instructions', 'garnish',
      'shake', 'stir', 'strain', 'muddle', 'build'
    ];

    // Check for ingredient indicators
    const ingredientIndicators = [
      'lemon', 'lime', 'orange', 'mint', 'basil', 'cucumber',
      'fruit', 'herb', 'vegetable', 'citrus', 'berry'
    ];

    let bottleScore = 0;
    let recipeScore = 0;
    let ingredientScore = 0;

    // Score based on labels
    bottleIndicators.forEach(indicator => {
      if (allLabels.includes(indicator)) bottleScore += 2;
      if (allText.includes(indicator.toUpperCase())) bottleScore += 1;
    });

    recipeIndicators.forEach(indicator => {
      if (allLabels.includes(indicator)) recipeScore += 2;
      if (allText.includes(indicator.toUpperCase())) recipeScore += 1;
    });

    ingredientIndicators.forEach(indicator => {
      if (allLabels.includes(indicator)) ingredientScore += 2;
      if (allText.includes(indicator.toUpperCase())) ingredientScore += 1;
    });

    // Check for ABV pattern (strong bottle indicator)
    if (/\d+(?:\.\d+)?%?\s*(?:ALC|ABV|PROOF)/i.test(allText)) {
      bottleScore += 5;
    }

    // Check for measurements (strong recipe indicator)
    if (/\d+\s*(?:oz|ml|cup|tsp|tbsp)/i.test(allText)) {
      recipeScore += 5;
    }

    log.info('GoogleVisionService', 'Scan type scores', {
      bottle: bottleScore,
      recipe: recipeScore,
      ingredient: ingredientScore,
    });

    // Determine type based on highest score
    const maxScore = Math.max(bottleScore, recipeScore, ingredientScore);

    if (maxScore === 0) {
      return 'unknown';
    }

    if (bottleScore === maxScore) {
      return 'bottle';
    }

    if (recipeScore === maxScore) {
      return 'recipe';
    }

    return 'ingredient';
  }

  /**
   * Extract the most likely bottle name from OCR text.
   * Uses the full Vision text block (index 0) which contains newline-separated
   * lines, giving much cleaner results than the individual word tokens.
   */
  static extractBottleNameFromOCR(result: VisionResult): string | null {
    const textTokens = result.text || [];
    if (textTokens.length === 0) return null;

    // textAnnotations[0] from Vision is the full concatenated text block with
    // newlines between lines. Split it to get actual label lines.
    const fullBlock = textTokens[0] || '';
    const lines = fullBlock
      .split(/\n/)
      .map(l => l.trim())
      .filter(l => l.length >= 3);

    if (lines.length === 0) return null;

    // Score each line — higher = more likely to be the brand/product name
    const NOISE = /^(\d+(\.\d+)?(%|CL|ML|L)?|ALC|ABV|VOL|PROOF|DISTILLED|BOTTLED|PRODUCED|EST\.|SINCE|LIMITED|IMPORTED|CONTAINS|PRODUCT|WARNING|GOVERNMENT|DRINK|RESPONSIBLY|www\.|©)$/i;
    const scored = lines
      .filter(l => !NOISE.test(l))
      .filter(l => l.length <= 50)
      .map(l => {
        let score = 0;
        // Prefer lines that are mostly uppercase (label text)
        const upperRatio = (l.match(/[A-Z]/g) || []).length / l.replace(/\s/g, '').length;
        if (upperRatio > 0.7) score += 3;
        // Prefer medium-length lines (brand names are rarely 1 word of 3 chars)
        if (l.length >= 5 && l.length <= 25) score += 2;
        // Boost known spirit-type words
        if (/\b(amaro|gin|vodka|rum|whiskey|whisky|bourbon|scotch|tequila|mezcal|cognac|brandy|liqueur|bitter|aperitivo|vermouth)\b/i.test(l)) score += 4;
        return { line: l, score };
      })
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return lines[0].slice(0, 60);

    // Take the top 1-3 lines to form a name query
    const topLines = scored.slice(0, 3).map(s => s.line);
    return topLines.join(' ').slice(0, 80);
  }

  /**
   * Call the spirit-lookup edge function (cache → Claude fallback).
   * Converts the edge function response into a Spirit-compatible object.
   */
  static async lookupBottleProfile(bottleName: string, visionResult?: VisionResult): Promise<Spirit | null> {
    try {
      const { data, error } = await supabase.functions.invoke('spirit-lookup', {
        body: { bottleName },
      });

      if (error || !data?.profile) {
        log.warn('GoogleVisionService', 'spirit-lookup failed, using OCR fallback', error);
        // Build a minimal Spirit from what Vision already read so the user still
        // lands on a bottle detail screen rather than "Bottle Not Recognized".
        return visionResult ? this.buildFallbackSpirit(bottleName, visionResult) : null;
      }

      const p = data.profile;
      log.info('GoogleVisionService', 'spirit-lookup resolved', {
        name: p.name,
        source: data.source,
      });

      // Map to Spirit shape (compatible with BottleDetailScreen)
      const spirit: Spirit = {
        id: p.id || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: p.name,
        brand: p.brand,
        type: p.type as Spirit['type'],
        abv: p.abv ?? 40,
        priceTier: (p.priceTier ?? 'mid-range') as Spirit['priceTier'],
        priceEstimate: p.priceEstimate ?? {
          USD: { min: 20, max: 35 },
          CAD: { min: 28, max: 45 },
          GBP: { min: 18, max: 30 },
        },
        flavorProfile: p.flavorProfile ?? [],
        tastingNotes: p.tastingNotes ?? '',
        origin: p.origin ?? '',
        searchTerms: p.searchTerms ?? [],
      };

      return spirit;
    } catch (err) {
      log.error('GoogleVisionService', 'lookupBottleProfile error', err);
      return null;
    }
  }

  /**
   * Build a minimal Spirit profile from OCR text when the edge function is unavailable.
   * Infers spirit type from label text so the BottleDetailScreen shows correct info.
   */
  private static buildFallbackSpirit(bottleName: string, result: VisionResult): Spirit {
    const allText = (result.text?.[0] || '').toLowerCase();

    const TYPE_KEYWORDS: Array<{ keywords: string[]; type: Spirit['type'] }> = [
      { keywords: ['amaro', 'bitter', 'bitters'], type: 'liqueur' },
      { keywords: ['gin'], type: 'gin' },
      { keywords: ['vodka'], type: 'vodka' },
      { keywords: ['rum', 'rhum', 'ron'], type: 'rum' },
      { keywords: ['whiskey', 'whisky', 'bourbon', 'scotch', 'rye'], type: 'whiskey' },
      { keywords: ['tequila', 'mezcal', 'agave'], type: 'tequila' },
      { keywords: ['cognac', 'brandy', 'armagnac'], type: 'brandy' },
      { keywords: ['liqueur', 'liqueur'], type: 'liqueur' },
    ];

    let spiritType: Spirit['type'] = 'other';
    for (const { keywords, type } of TYPE_KEYWORDS) {
      if (keywords.some(k => allText.includes(k))) {
        spiritType = type;
        break;
      }
    }

    // Try to extract ABV from OCR text
    const abvMatch = allText.match(/(\d{1,2}(?:\.\d)?)\s*%/);
    const abv = abvMatch ? parseFloat(abvMatch[1]) : 38;

    const slug = bottleName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);

    return {
      id: `ocr-${slug}`,
      name: bottleName,
      brand: bottleName.split(' ')[0],
      type: spiritType,
      abv,
      priceTier: 'mid-range',
      priceEstimate: {
        USD: { min: 20, max: 40 },
        CAD: { min: 28, max: 52 },
        GBP: { min: 18, max: 35 },
      },
      flavorProfile: [],
      tastingNotes: '',
      origin: '',
      searchTerms: [bottleName.toLowerCase()],
    };
  }

  /**
   * Match a bottle to the spirits database
   * Returns detailed spirit information if found
   */
  static matchBottle(result: VisionResult): Spirit | null {
    const allText = (result.text || []).join(' ').toUpperCase();
    const allLabels = result.labels.join(' ').toLowerCase();
    const normalizedText = allText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

    log.info('GoogleVisionService', 'Matching bottle to database', {
      textLength: allText.length,
      labelsCount: result.labels.length,
    });

    // Low confidence check
    if (result.confidence < 0.3) {
      log.warn('GoogleVisionService', 'Confidence too low for bottle matching', {
        confidence: result.confidence,
      });
      return null;
    }

    // Score every spirit against the full OCR text and labels.
    // This is more reliable than early-return word loops which can latch onto
    // background bottles or generic words before reaching the main label text.
    let bestSpirit: Spirit | null = null;
    let bestScore = 0;
    for (const spirit of SPIRITS_DATABASE) {
      const brand = spirit.brand.toLowerCase();
      const name = spirit.name.toLowerCase();
      const type = spirit.type.toLowerCase();
      let score = 0;

      if (brand && normalizedText.includes(brand)) score += 8;
      if (name && normalizedText.includes(name)) score += 6;
      if (allLabels.includes(type)) score += 2;

      for (const term of spirit.searchTerms) {
        const normalizedTerm = term.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
        if (normalizedTerm.length < 3) continue;
        if (normalizedText.includes(normalizedTerm)) score += 3;
      }

      if (score > bestScore) {
        bestScore = score;
        bestSpirit = spirit;
      }
    }
    if (bestSpirit && bestScore >= 6) {
      log.info('GoogleVisionService', 'Bottle matched via fuzzy scoring', {
        brand: bestSpirit.brand,
        name: bestSpirit.name,
        score: bestScore,
      });
      return bestSpirit;
    }

    log.warn('GoogleVisionService', 'Could not match bottle to database');
    return null;
  }
}
