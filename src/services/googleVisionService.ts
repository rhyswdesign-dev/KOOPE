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
  webEntities?: string[];
  bestGuessLabels?: string[];
  /** Base64 JPEG of the cropped label — generated during analyzeImage and
   *  kept in the result so it can be forwarded to spirit-lookup for Claude Vision
   *  without a second encode/crop pass. Never sent to the client bundle. */
  imageBase64?: string;
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

// ── Spirit-signal tokens — at least one must appear in Vision labels for a
//    result to be treated as a bottle scan. Prevents "Plastic", "Glass Bottle",
//    random objects, and shelf tags from ever reaching Claude.
const SPIRIT_SIGNALS = new Set([
  'bottle', 'alcohol', 'alcoholic beverage', 'spirits', 'liquor', 'distilled beverage',
  'wine bottle', 'beer bottle', 'spirit', 'beverage', 'drink', 'drinking',
  'vodka', 'gin', 'rum', 'whiskey', 'whisky', 'bourbon', 'scotch',
  'tequila', 'mezcal', 'brandy', 'cognac', 'liqueur', 'champagne', 'wine',
  'distilled', 'fermented', 'agave', 'barrel', 'cask', 'proof', 'abv',
])

export class GoogleVisionService {
  /**
   * Stage 2 gate — checks whether Vision labels contain at least one spirit signal.
   * Returns false for photos of plastic objects, random shelf items, hands, etc.
   */
  static isSpiritImage(result: VisionResult): boolean {
    const labelsLower = result.labels.map(l => l.toLowerCase())
    // Check labels
    if (labelsLower.some(l => SPIRIT_SIGNALS.has(l))) return true
    // Also check if any label *contains* a spirit signal word (e.g. "alcoholic drink")
    if (labelsLower.some(l => [...SPIRIT_SIGNALS].some(s => l.includes(s)))) return true
    // Check OCR text as a last resort — ABV pattern is a definitive bottle indicator
    const fullText = (result.text?.[0] || '').toLowerCase()
    if (/\d+(\.\d+)?\s*%\s*(abv|alc|vol|proof)/i.test(fullText)) return true
    return false
  }

  /**
   * Stage 3 gate — checks whether a Web Detection guess looks like a spirit brand,
   * not a material/object description ("Plastic", "Glass Bottle", "Ceramic").
   */
  static isUsableWebDetection(result: VisionResult): boolean {
    const GENERIC = new Set([
      'plastic','glass','ceramic','bottle','liquid','product','object','container',
      'decanter','vase','jar','cup','vessel','red','blue','green','black','white',
      'brown','crystal','wood','metal','unknown','item','thing','material',
      'surface','texture','pattern','design','art','craft','handmade','decorative',
      'glassware','barware','drinkware','stopper','cork','tableware',
    ])
    const guesses = result.bestGuessLabels ?? []
    const entities = result.webEntities ?? []
    const candidates = [...guesses, ...entities]
    return candidates.some(s => {
      const words = s.trim().toLowerCase().split(/\s+/)
      return !words.every(w => GENERIC.has(w))
    })
  }

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

      // Attach the already-generated base64 to the result so the scan flow can
      // forward it to spirit-lookup without a second encode pass.
      return { ...(data as VisionResult), imageBase64: base64Image };
    } catch (error) {
      log.error('GoogleVisionService', 'Error analyzing image', error);
      if (__DEV__) {
        return this.fallbackAnalysis(imageUri);
      }
      throw error;
    }
  }

  /**
   * Consolidated bottle recognition — calls the `bottle-recognize` edge
   * function, which does Google Vision + local-catalog matching + (on a
   * catalog miss) the Claude Vision fallback in ONE server-side round trip,
   * instead of the client chaining analyzeImage() -> matchBottle() ->
   * lookupBottleProfile() across two separate edge function calls.
   * Bottle scan type only — recipe/ingredient scans still use analyzeImage().
   */
  static async recognizeBottle(imageUri: string): Promise<{ spirit: Spirit | null; confidence: number; source: string; isSpiritImage: boolean }> {
    try {
      const base64Image = await this.convertImageToBase64(imageUri);

      const { data, error } = await supabase.functions.invoke('bottle-recognize', {
        body: { imageBase64: base64Image },
      });

      if (error) {
        log.warn('GoogleVisionService', 'bottle-recognize call failed', error);
        return { spirit: null, confidence: 0, source: 'error', isSpiritImage: true };
      }

      if (data?.isSpiritImage === false) {
        return { spirit: null, confidence: 0, source: 'none', isSpiritImage: false };
      }

      if (!data?.profile) {
        log.warn('GoogleVisionService', 'bottle-recognize returned no profile', error);
        return { spirit: null, confidence: 0, source: 'error', isSpiritImage: true };
      }

      const p = data.profile;
      const confidence = typeof data.confidence === 'number' ? data.confidence : 0.85;
      log.info('GoogleVisionService', 'bottle-recognize resolved', {
        name: p.name,
        source: data.source,
        confidence,
      });

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

      return { spirit, confidence, source: data.source ?? 'bottle-recognize', isSpiritImage: true };
    } catch (err) {
      log.error('GoogleVisionService', 'recognizeBottle error', err);
      return { spirit: null, confidence: 0, source: 'error', isSpiritImage: true };
    }
  }

  private static async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      // Stage 8 — centre-crop to 60% width / 70% height before sending to Vision.
      // The bottle label is almost always centred in frame. Cropping eliminates
      // background bottles, shelf tags, and other bottles that sit at the edges,
      // which are the primary cause of OCR reading the wrong label.
      const meta = await ImageManipulator.manipulateAsync(imageUri, [], { base64: false });
      const { width, height } = meta;

      const cropW = Math.round(width * 0.6);
      const cropH = Math.round(height * 0.7);
      const originX = Math.round((width - cropW) / 2);
      const originY = Math.round((height - cropH) / 2);

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: { originX, originY, width: cropW, height: cropH } }],
        { base64: true, compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );
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
      // Map Vision's generic labels to ingredient categories.
      // Vision won't return "clove" for a bowl of cloves — it returns "spice", "seed", "food" etc.
      const LABEL_FALLBACKS: Array<{ signals: string[]; name: string; category: string }> = [
        { signals: ['spice', 'seed', 'seasoning', 'condiment', 'five-spice powder', 'masala', 'powder'], name: 'Spice', category: 'spices' },
        { signals: ['citrus', 'citrus fruit'], name: 'Citrus', category: 'citrus' },
        { signals: ['herb', 'plant', 'leaf', 'foliage', 'grass'], name: 'Herb', category: 'herbs' },
        { signals: ['berry', 'stone fruit', 'tropical fruit'], name: 'Fruit', category: 'fruits' },
        { signals: ['vegetable', 'root vegetable', 'allium'], name: 'Vegetable', category: 'vegetables' },
        { signals: ['fruit', 'food', 'produce', 'ingredient'], name: 'Fruit', category: 'fruits' },
      ];

      // Also check OCR text for spice/herb names Vision missed as labels
      const TEXT_SIGNALS: Array<{ patterns: RegExp; name: string; category: string }> = [
        { patterns: /\b(cloves?|cinnamon|cardamom|nutmeg|allspice|star anise|cumin|coriander|turmeric|pepper|peppercorn)\b/i, name: 'Spice', category: 'spices' },
        { patterns: /\b(lavender|chamomile|tarragon|dill|chive|oregano|marjoram|bay leaf)\b/i, name: 'Herb', category: 'herbs' },
        { patterns: /\b(lemon|lime|orange|grapefruit|yuzu)\b/i, name: 'Citrus', category: 'citrus' },
      ];

      for (const { patterns, name, category } of TEXT_SIGNALS) {
        if (patterns.test(allText)) {
          return [{ name, category: category.charAt(0).toUpperCase() + category.slice(1), confidence: result.confidence }];
        }
      }

      for (const { signals, name, category } of LABEL_FALLBACKS) {
        if (signals.some(s => allLabels.includes(s))) {
          return [{ name, category: category.charAt(0).toUpperCase() + category.slice(1), confidence: result.confidence }];
        }
      }

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
    // Bare spirit-category words are too generic to be a useful bottle name — filtering
    // them prevents "TEQUILA" / "GIN" / "LIQUEUR" from becoming the cache key and
    // poisoning the spirits_cache for every bottle of that type.
    const NOISE = /^(\d+(\.\d+)?(%|CL|ML|L)?|ALC|ABV|VOL|PROOF|DISTILLED|BOTTLED|PRODUCED|EST\.|SINCE|DEPUIS|DESDE|LIMITED|EDITION|IMPORTED|CONTAINS|PRODUCT|WARNING|GOVERNMENT|DRINK|RESPONSIBLY|www\.|©|100%|DE AGAVE|AGAVE|AGAVE AZUL|100% DE AGAVE|100% AGAVE|BLUE AGAVE|PURO AGAVE|PRODUCT OF|PRODUIT DE|PRODUCTO DE|ELABORADO DE|IMPORTADO|SINGLE MALT|SCOTCH WHISKY|BLENDED SCOTCH|RESERVA|RESERVA EXCLUSIVA|GRAN RESERVA|AGED \d+ YEARS?|HECHO EN MEXICO|JALISCO|SAN LUIS DEL RIO|OAXACA|GIN|VODKA|RUM|WHISKEY|WHISKY|BOURBON|SCOTCH|TEQUILA|MEZCAL|COGNAC|BRANDY|LIQUEUR|AMARO|BITTER|APERITIVO|VERMOUTH|REPOSADO|BLANCO|ANEJO|AÑEJO|SILVER|GOLD|PLATINUM)$/i;
    const SPIRIT_TYPES = /\b(amaro|gin|vodka|rum|whiskey|whisky|bourbon|scotch|tequila|mezcal|cognac|brandy|liqueur|bitter|aperitivo|vermouth)\b/i;

    const scored = lines
      // Strip leading punctuation/dashes before NOISE test (catches "-SINCE/DEPUIS 18Y." etc.)
      .map(l => l.replace(/^[-–—*/]+\s*/, '').trim())
      .filter(l => l.length >= 3)
      .filter(l => !NOISE.test(l))
      .filter(l => l.length <= 50)
      .map((l, index) => {
        let score = 0;
        // Lines earlier in the block are more likely to be the main label
        // (Vision returns text top-to-bottom, left-to-right)
        score += Math.max(0, 5 - index * 0.5);
        // Prefer lines that are mostly uppercase (label text)
        const upperRatio = (l.match(/[A-Z]/g) || []).length / l.replace(/\s/g, '').length;
        if (upperRatio > 0.7) score += 3;
        // Prefer medium-length lines
        if (l.length >= 5 && l.length <= 25) score += 2;
        // Boost lines containing spirit-type words — but only +2, not +4,
        // so position still matters (prevents background bottle text winning)
        if (SPIRIT_TYPES.test(l)) score += 2;
        return { line: l, score };
      })
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) return null;

    // Use the single highest-scoring line as the name anchor.
    // If it doesn't contain a spirit type but the second line does, append it.
    const best = scored[0].line;
    const second = scored[1]?.line;
    const name = (!SPIRIT_TYPES.test(best) && second && SPIRIT_TYPES.test(second))
      ? `${best} ${second}`
      : best;
    return name.slice(0, 80);
  }

  /**
   * Call the spirit-lookup edge function (cache → Claude Vision → Claude text fallback).
   * Passes imageBase64 when available so Claude reads the label directly rather than
   * guessing from OCR noise. This handles any bottle in the world.
   *
   * NOTE: webEntities and bestGuessLabels are intentionally NOT forwarded to the edge
   * function. Google Web Detection misidentifies uncommon bottles as the most famous
   * brand in that category (Sierra Tequila → Jose Cuervo). Claude reading the actual
   * label is always more accurate.
   */
  static async lookupBottleProfile(
    bottleName: string,
    visionResult?: VisionResult,
    imageBase64?: string,
  ): Promise<{ spirit: Spirit | null; confidence: number }> {
    try {
      const { data, error } = await supabase.functions.invoke('spirit-lookup', {
        body: {
          bottleName,
          // Pass the cropped label image so Claude Vision reads it directly.
          // When present, the edge function uses claude-sonnet-4-6 with vision
          // instead of the text-only Haiku fallback.
          imageBase64: imageBase64 ?? null,
          // Vision label detections give Claude shape/colour/category context
          // (e.g. "skull bottle", "ceramic", "agave") — useful for decorative bottles.
          visionLabels: visionResult?.labels ?? [],
        },
      });

      if (error || !data?.profile) {
        log.warn('GoogleVisionService', 'spirit-lookup returned no profile — hard fail', error);
        // Do NOT build a fallback from OCR fragments. A confident wrong answer
        // is worse than no answer. Return null so SmartScanScreen routes to
        // the library search screen instead.
        return { spirit: null, confidence: 0 };
      }

      const p = data.profile;
      const confidence = typeof data.confidence === 'number' ? data.confidence : 0.85;
      log.info('GoogleVisionService', 'spirit-lookup resolved', {
        name: p.name,
        source: data.source,
        confidence,
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

      return { spirit, confidence };
    } catch (err) {
      log.error('GoogleVisionService', 'lookupBottleProfile error', err);
      return { spirit: null, confidence: 0 };
    }
  }

  /**
   * Match a bottle to the spirits database.
   * Checks Web Detection results first (most reliable for label-less/decorative
   * bottles), then falls back to OCR text + label scoring.
   */
  static matchBottle(result: VisionResult): Spirit | null {
    const allText = (result.text || []).join(' ').toUpperCase();
    const allLabels = result.labels.join(' ').toLowerCase();
    const normalizedText = allText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

    log.info('GoogleVisionService', 'Matching bottle to database', {
      textLength: allText.length,
      labelsCount: result.labels.length,
      webEntities: result.webEntities?.length ?? 0,
      bestGuessLabels: result.bestGuessLabels?.length ?? 0,
    });

    // ── Layer 1: Web Detection direct match ───────────────────────────────────
    // Google's Web Detection returns the actual product name (e.g. "Clase Azul
    // Mezcal San Luis Potosí") — far more reliable than OCR for decorative bottles.
    // Score every spirit against bestGuessLabels and webEntities first.
    const GENERIC_TOKENS = new Set([
      'plastic','glass','ceramic','bottle','liquid','product','object','container',
      'decanter','vase','jar','cup','vessel','red','blue','green','black','white',
      'brown','crystal','wood','metal','unknown','item','thing','material','surface',
      'texture','pattern','design','art','craft','handmade','decorative','glassware',
    ])
    const isUsableWebResult = (s: string) => {
      const words = s.trim().toLowerCase().split(/\s+/)
      return !words.every(w => GENERIC_TOKENS.has(w))
    }

    const webCandidates = [
      ...(result.bestGuessLabels ?? []),
      ...(result.webEntities ?? []),
    ].filter(isUsableWebResult)

    const normalizeWeb = (s: string) =>
      s.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

    if (webCandidates.length > 0) {
      const webText = webCandidates.join(' ').toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
      let webBest: Spirit | null = null
      let webBestScore = 0
      for (const spirit of SPIRITS_DATABASE) {
        const brand = normalizeWeb(spirit.brand)
        const name = normalizeWeb(spirit.name)
        let score = 0
        if (brand && webText.includes(brand)) score += 10
        if (name && webText.includes(name)) score += 8
        for (const term of spirit.searchTerms) {
          const t = normalizeWeb(term)
          if (t.length >= 3 && webText.includes(t)) score += 5
        }
        if (score > webBestScore) { webBestScore = score; webBest = spirit }
      }
      if (webBest && webBestScore >= 12) {
        // Cross-validate against OCR: if the label has meaningful text, the
        // Web Detection match must share at least one significant word with it.
        // This prevents Vision returning "Johnnie Walker" for a Rum-Bar bottle.
        // (For label-less/decorative bottles the OCR is empty so we always trust Web Detection.)
        // Generic category words appear in every bottle's OCR and many searchTerms —
        // they must not count as brand-confirming overlap (e.g. "liqueur" matching
        // Chartreuse OCR to Drambuie's searchTerms, or "tequila" to Jose Cuervo).
        const GENERIC_SPIRIT_WORDS = new Set([
          'liqueur','whisky','whiskey','bourbon','scotch','vodka','gin','rum',
          'tequila','mezcal','cognac','brandy','spirit','spirits','amaro','bitter',
          'aperitivo','vermouth','reposado','blanco','anejo','silver','gold',
          'premium','reserve','aged','single','malt','blended','special','edition',
        ])
        const ocrWords = normalizedText.split(/\s+/)
          .filter(w => w.length >= 4)
          .filter(w => !GENERIC_SPIRIT_WORDS.has(w))
        if (ocrWords.length >= 3) {
          const candidateWords = new Set(
            [webBest.brand, webBest.name, ...webBest.searchTerms]
              .join(' ').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
              .filter(w => w.length >= 4)
              .filter(w => !GENERIC_SPIRIT_WORDS.has(w))
          )
          const hasOcrOverlap = ocrWords.some(w => candidateWords.has(w))
          if (!hasOcrOverlap) {
            log.warn('GoogleVisionService', 'Web Detection contradicts OCR — skipping Layer 1', {
              webCandidate: webBest.name,
              webScore: webBestScore,
              webCandidates,
            })
            // Fall through to Layer 2 (OCR scoring)
          } else {
            log.info('GoogleVisionService', 'Bottle matched via Web Detection (OCR confirmed)', {
              brand: webBest.brand,
              name: webBest.name,
              score: webBestScore,
            })
            return webBest
          }
        } else {
          // No meaningful OCR — label-less bottle (Clase Azul, Crystal Head etc.)
          // Trust Web Detection entirely.
          log.info('GoogleVisionService', 'Bottle matched via Web Detection (no OCR to contradict)', {
            brand: webBest.brand,
            name: webBest.name,
            score: webBestScore,
          })
          return webBest
        }
      }
    }

    // ── Layer 2: OCR text + label scoring ─────────────────────────────────────
    // Low confidence check — skip OCR scoring if Vision wasn't confident enough
    if (result.confidence < 0.3) {
      log.warn('GoogleVisionService', 'Confidence too low for bottle matching', {
        confidence: result.confidence,
      });
      return null;
    }

    // Helper: strip accents + non-alphanumeric so "Patrón" matches "patron" in OCR
    const normalizeForMatch = (s: string) =>
      s.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Score every spirit against the full OCR text and labels.
    let bestSpirit: Spirit | null = null;
    let bestScore = 0;
    let secondBestSpirit: Spirit | null = null;
    let secondBestScore = 0;
    // Track per-winner breakdown for the high-confidence gate below.
    let bestBrandScore = 0;
    let bestNameScore = 0;
    let bestMultiWordTermHits = 0;

    for (const spirit of SPIRITS_DATABASE) {
      const brand = normalizeForMatch(spirit.brand);
      const name = normalizeForMatch(spirit.name);
      const type = spirit.type.toLowerCase();
      let score = 0;
      let brandScore = 0;
      let nameScore = 0;
      let multiWordTermHits = 0;

      if (brand && normalizedText.includes(brand)) { brandScore = 8; score += 8; }
      if (name && normalizedText.includes(name)) { nameScore = 6; score += 6; }
      if (allLabels.includes(type)) score += 2;

      for (const term of spirit.searchTerms) {
        const normalizedTerm = normalizeForMatch(term);
        if (normalizedTerm.length < 3) continue;
        if (normalizedText.includes(normalizedTerm)) {
          // Multi-word terms (2+ words) are meaningful product descriptors.
          // Single-word terms (e.g. "foursquare") can appear as distillery
          // attribution text on an unrelated bottle — don't count them toward
          // the high-confidence gate.
          if (normalizedTerm.trim().split(/\s+/).length >= 2) multiWordTermHits++;
          score += 4;
        }
      }

      if (score > bestScore) {
        secondBestScore = bestScore;
        secondBestSpirit = bestSpirit;
        bestScore = score;
        bestSpirit = spirit;
        bestBrandScore = brandScore;
        bestNameScore = nameScore;
        bestMultiWordTermHits = multiWordTermHits;
      } else if (score > secondBestScore) {
        secondBestScore = score;
        secondBestSpirit = spirit;
      }
    }

    // High-confidence gate: brand must appear in OCR AND at least one of:
    //   (a) the product name appears verbatim as a substring, or
    //   (b) a multi-word search term matches.
    // This prevents a brand name that appears only as distillery attribution
    // text (e.g. "Distilled at Foursquare Rum Distillery" on a Doorly's label)
    // from producing a false DB match. Bottles that don't pass this gate fall
    // through to Claude Vision, which reads the label directly.
    const isHighConfidence =
      bestBrandScore > 0 && (bestNameScore > 0 || bestMultiWordTermHits > 0);

    if (bestSpirit && bestScore >= 14 && isHighConfidence) {
      // Variant ambiguity check: if the top two results share the same brand and
      // scores are within 4 points, we can't confidently pick a variant (e.g.
      // Green vs Yellow Chartreuse, Patrón Silver vs Reposado). Return null so
      // the edge function can use web entities to disambiguate.
      if (
        secondBestSpirit &&
        secondBestScore >= 14 &&
        normalizeForMatch(bestSpirit.brand) === normalizeForMatch(secondBestSpirit.brand) &&
        bestScore - secondBestScore <= 4
      ) {
        log.warn('GoogleVisionService', 'Variant ambiguity — deferring to edge function', {
          best: bestSpirit.name,
          second: secondBestSpirit.name,
          bestScore,
          secondBestScore,
        });
        return null;
      }

      log.info('GoogleVisionService', 'Bottle matched via OCR scoring', {
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
