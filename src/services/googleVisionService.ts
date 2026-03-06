/**
 * Google Cloud Vision API Service
 * Provides real image analysis for spirit bottle recognition
 */

import * as FileSystem from 'expo-file-system';
import { log } from '../lib/logger';
import { findSpirit, SPIRITS_DATABASE, type Spirit } from '../data/spiritsDatabase';

// You'll need to set this in your environment variables or .env file
const GOOGLE_CLOUD_VISION_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || '';

interface VisionAPIResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description: string;
      locale?: string;
    }>;
    labelAnnotations?: Array<{
      description: string;
      score: number;
    }>;
    error?: {
      code: number;
      message: string;
    };
  }>;
}

export interface VisionResult {
  labels: string[];
  text?: string[];
  confidence: number;
}

export class GoogleVisionService {
  private static API_ENDPOINT = 'https://vision.googleapis.com/v1/images:annotate';

  static isConfigured(): boolean {
    return Boolean(GOOGLE_CLOUD_VISION_API_KEY && GOOGLE_CLOUD_VISION_API_KEY.trim().length > 0);
  }

  /**
   * Analyzes an image using Google Cloud Vision API
   * @param imageUri - Local file URI of the image to analyze
   * @returns Vision analysis results including labels, text, and confidence
   */
  static async analyzeImage(imageUri: string): Promise<VisionResult> {
    try {
      log.info('GoogleVisionService', 'Starting image analysis', { imageUri });

      // Check if API key is configured
      if (!GoogleVisionService.isConfigured()) {
        throw new Error('GOOGLE_VISION_NOT_CONFIGURED');
      }

      // Convert image to base64
      const base64Image = await this.convertImageToBase64(imageUri);

      // Make API request
      const response = await fetch(`${this.API_ENDPOINT}?key=${GOOGLE_CLOUD_VISION_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                  maxResults: 10,
                },
                {
                  type: 'LABEL_DETECTION',
                  maxResults: 10,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Vision API error: ${response.status} ${response.statusText}`);
      }

      const data: VisionAPIResponse = await response.json();

      // Check for API errors
      if (data.responses[0]?.error) {
        const error = data.responses[0].error;
        throw new Error(`Vision API returned error: ${error.code} - ${error.message}`);
      }

      // Parse and return results
      return this.parseVisionAPIResponse(data);
    } catch (error) {
      log.error('GoogleVisionService', 'Error analyzing image', error);

      throw error;
    }
  }

  /**
   * Converts a local image URI to base64 string
   */
  private static async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64' as any,
      });
      return base64;
    } catch (error) {
      log.error('GoogleVisionService', 'Error converting image to base64', error);
      throw new Error('Failed to read image file');
    }
  }

  /**
   * Parses the Google Vision API response into our simplified format
   */
  private static parseVisionAPIResponse(data: VisionAPIResponse): VisionResult {
    const response = data.responses[0];

    // Extract text from OCR
    const textAnnotations = response.textAnnotations || [];
    const detectedText = textAnnotations.map(annotation => annotation.description);

    // Extract labels
    const labelAnnotations = response.labelAnnotations || [];
    const labels = labelAnnotations.map(label => label.description.toLowerCase());

    // Calculate average confidence from label scores
    const avgConfidence = labelAnnotations.length > 0
      ? labelAnnotations.reduce((sum, label) => sum + label.score, 0) / labelAnnotations.length
      : 0;

    log.info('GoogleVisionService', 'Parsed vision results', {
      textCount: detectedText.length,
      labelCount: labels.length,
      confidence: avgConfidence,
    });

    return {
      labels,
      text: detectedText,
      confidence: avgConfidence,
    };
  }

  /**
   * Fallback analysis when API is not available
   * Uses a simple mock based on image characteristics
   */
  private static async fallbackAnalysis(imageUri: string): Promise<VisionResult> {
    log.info('GoogleVisionService', 'Using fallback analysis');

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simple hash-based mock for demonstration
    const hash = imageUri.length % 5;

    const mockResults: VisionResult[] = [
      {
        labels: ['bottle', 'vodka', 'alcohol', 'spirits', 'clear liquid'],
        text: ['TITO\'S', 'HANDMADE', 'VODKA', '40% ALC/VOL', 'DISTILLED', 'AUSTIN TEXAS'],
        confidence: 0.85,
      },
      {
        labels: ['gin', 'bottle', 'spirits', 'cucumber', 'scottish'],
        text: ['HENDRICK\'S', 'GIN', 'DISTILLED', '44% ALC/VOL', 'SCOTLAND', 'CUCUMBER', 'ROSE'],
        confidence: 0.92,
      },
      {
        labels: ['whiskey', 'bourbon', 'american', 'barrel'],
        text: ['BUFFALO', 'TRACE', 'KENTUCKY', 'STRAIGHT BOURBON', 'WHISKEY', '45% ALC/VOL'],
        confidence: 0.78,
      },
      {
        labels: ['rum', 'white rum', 'caribbean', 'bacardi'],
        text: ['BACARDI', 'SUPERIOR', 'WHITE RUM', '40% ALC/VOL', 'PUERTO RICO'],
        confidence: 0.81,
      },
      {
        labels: ['bottle', 'glass', 'liquid', 'container'],
        text: ['PREMIUM', 'SPIRIT', 'ALCOHOL'],
        confidence: 0.45,
      },
    ];

    return mockResults[hash];
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

    // Extract potential brand names from text
    // Try to find spirits by searching for brand names in the text
    const textWords = allText.split(/\s+/).filter(word => word.length > 2);

    // Try exact brand matches first
    for (const word of textWords) {
      const spirit = findSpirit(word);
      if (spirit) {
        log.info('GoogleVisionService', 'Bottle matched from text', {
          brand: spirit.brand,
          name: spirit.name,
        });
        return spirit;
      }
    }

    // Try multi-word brand names
    for (let i = 0; i < textWords.length - 1; i++) {
      const twoWords = `${textWords[i]} ${textWords[i + 1]}`;
      const spirit = findSpirit(twoWords);
      if (spirit) {
        log.info('GoogleVisionService', 'Bottle matched from multi-word text', {
          brand: spirit.brand,
          name: spirit.name,
        });
        return spirit;
      }
    }

    // Try label-based matching
    const labelWords = allLabels.split(/\s+/).filter(word => word.length > 2);
    for (const word of labelWords) {
      const spirit = findSpirit(word);
      if (spirit) {
        log.info('GoogleVisionService', 'Bottle matched from label', {
          brand: spirit.brand,
          name: spirit.name,
        });
        return spirit;
      }
    }

    // Score-based fuzzy match across full OCR text for more resilient matching.
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
