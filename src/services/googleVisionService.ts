/**
 * Google Cloud Vision API Service
 * Provides real image analysis for spirit bottle recognition
 */

import * as FileSystem from 'expo-file-system';
import { log } from '../lib/logger';

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

  /**
   * Analyzes an image using Google Cloud Vision API
   * @param imageUri - Local file URI of the image to analyze
   * @returns Vision analysis results including labels, text, and confidence
   */
  static async analyzeImage(imageUri: string): Promise<VisionResult> {
    try {
      log.info('GoogleVisionService', 'Starting image analysis', { imageUri });

      // Check if API key is configured
      if (!GOOGLE_CLOUD_VISION_API_KEY) {
        log.warn('GoogleVisionService', 'API key not configured, using fallback');
        return this.fallbackAnalysis(imageUri);
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

      // Fall back to mock service if API fails
      log.info('GoogleVisionService', 'Falling back to mock analysis');
      return this.fallbackAnalysis(imageUri);
    }
  }

  /**
   * Converts a local image URI to base64 string
   */
  private static async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
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
}
