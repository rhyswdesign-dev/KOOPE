import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../lib/supabase';
import { log } from '../lib/logger';

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes?: Array<{
    text: string;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
}

interface VisionAnalyzeResponse {
  text: string[];
  confidence: number;
  textBounds?: Array<{
    text: string;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
}

export class OCRService {

  /**
   * Capture an image from camera or gallery — no OCR.
   * Use this when you want to show the image to the user before extracting text.
   */
  static async captureImage(source: 'camera' | 'gallery'): Promise<{ imageUri: string } | null> {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) throw new Error('Camera permission required');
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.9,
          base64: false,
        });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) throw new Error('Media library permission required');
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: false,
          quality: 0.9,
          base64: false,
        });
      }

      if (result.canceled) return null;
      return { imageUri: result.assets[0].uri };
    } catch (error: any) {
      log.error('OCRService', 'captureImage error', error);
      return null;
    }
  }

  /**
   * Pick an image from gallery and extract text using OCR
   */
  static async pickImageAndExtractText(): Promise<{ text: string; imageUri: string } | null> {
    const captured = await this.captureImage('gallery');
    if (!captured) return null;
    const text = await this.extractTextFromImage(captured.imageUri);
    return { text, imageUri: captured.imageUri };
  }

  /**
   * Take a photo with camera and extract text using OCR
   */
  static async takePhotoAndExtractText(): Promise<{ text: string; imageUri: string } | null> {
    const captured = await this.captureImage('camera');
    if (!captured) return null;
    const text = await this.extractTextFromImage(captured.imageUri);
    return { text, imageUri: captured.imageUri };
  }

  /**
   * Extract text from an image URI.
   * Routes through the vision-analyze Supabase edge function so no client-side
   * API key is needed. Falls back to dev mock when not authenticated.
   */
  static async extractTextFromImage(imageUri: string): Promise<string> {
    try {
      const data = await this.invokeVisionAnalyze(imageUri);
      const rawText: string = Array.isArray(data.text) ? (data.text[0] ?? '') : '';

      if (!rawText.trim()) {
        return 'No readable text found in the image. Try a clearer photo with better lighting.';
      }

      return this.cleanExtractedText(rawText);
    } catch (error: any) {
      log.error('OCRService', 'OCR processing error', error);
      return 'Unable to process the image. Please try again or enter the recipe manually.';
    }
  }

  /**
   * Detect a likely recipe text block and return normalized region coordinates (0-1).
   * This is used to smart-initialize the crop selection in menu scans.
   */
  static async detectRecipeRegion(
    imageUri: string,
    imageWidth: number,
    imageHeight: number
  ): Promise<SelectionBox | null> {
    try {
      const data = await this.invokeVisionAnalyze(imageUri);
      const bounds = Array.isArray(data.textBounds) ? data.textBounds : [];
      if (!bounds.length || !imageWidth || !imageHeight) return null;

      const filtered = bounds.filter((b) => {
        const t = String(b.text || '').trim();
        const area = Math.max(0, b.bounds.width) * Math.max(0, b.bounds.height);
        if (!t || t.length < 2) return false;
        if (area < 36) return false;
        if (/^[^a-zA-Z]+$/.test(t)) return false;
        return true;
      });
      if (!filtered.length) return null;

      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = 0;
      let maxY = 0;

      filtered.forEach((b) => {
        const x0 = b.bounds.x;
        const y0 = b.bounds.y;
        const x1 = b.bounds.x + b.bounds.width;
        const y1 = b.bounds.y + b.bounds.height;
        if (x0 < minX) minX = x0;
        if (y0 < minY) minY = y0;
        if (x1 > maxX) maxX = x1;
        if (y1 > maxY) maxY = y1;
      });

      const padX = Math.max(12, (maxX - minX) * 0.08);
      const padY = Math.max(12, (maxY - minY) * 0.10);

      minX = Math.max(0, minX - padX);
      minY = Math.max(0, minY - padY);
      maxX = Math.min(imageWidth, maxX + padX);
      maxY = Math.min(imageHeight, maxY + padY);

      const w = Math.max(1, maxX - minX);
      const h = Math.max(1, maxY - minY);

      return {
        x: minX / imageWidth,
        y: minY / imageHeight,
        w: w / imageWidth,
        h: h / imageHeight,
      };
    } catch (error: any) {
      log.warn('OCRService', 'Recipe region detection failed', error);
      return null;
    }
  }

  private static async invokeVisionAnalyze(imageUri: string): Promise<VisionAnalyzeResponse> {
    const optimized = await this.optimizeImageForOCR(imageUri);
    const base64 = await this.imageToBase64(optimized.uri);

    const { data, error } = await supabase.functions.invoke('vision-analyze', {
      body: { imageBase64: base64 },
    });

    if (error || !data) {
      log.warn('OCRService', 'vision-analyze edge function failed', error);
      throw new Error('Could not read the image. Please check your connection and try again.');
    }

    return data as VisionAnalyzeResponse;
  }

  /**
   * Optimize image for better OCR results
   */
  private static async optimizeImageForOCR(imageUri: string) {
    try {
      return await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
    } catch (error) {
      log.error('OCRService', 'Image optimization error', error);
      return { uri: imageUri };
    }
  }

  /**
   * Convert image URI to base64 string
   */
  private static async imageToBase64(imageUri: string): Promise<string> {
    // manipulateAsync with base64: true is the most reliable path in Expo
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [],
      { base64: true, compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
    );
    if (!result.base64) throw new Error('base64 conversion returned empty');
    return result.base64;
  }

  /**
   * Clean extracted text for better recipe processing
   */
  private static cleanExtractedText(rawText: string): string {
    const cleaned = rawText
      // Normalise line breaks first
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      // Collapse only horizontal whitespace (spaces/tabs), not newlines
      .replace(/[^\S\n]+/g, ' ')
      // Fix common OCR measurement mistakes
      .replace(/(\d+)\s*\|\s*/g, '$1 1/')
      .replace(/(\d+)\s*o\s*z/gi, '$1 oz')
      .replace(/(\d+)\s*c\s*u\s*p/gi, '$1 cup')
      .replace(/t\s*b\s*s\s*p/gi, 'tbsp')
      .replace(/t\s*s\s*p/gi, 'tsp');

    // ── Pass 1: strip & filter individual lines ──────────────────────────────
    const lines = cleaned.split('\n').map(line => {
      // Strip inline price prefix: "$18.00/2 oz Hennessy" → "Hennessy"
      return line.replace(/^[\$£€]\d[\d.,]*(?:\/\d+\s*\w+)?\s*/g, '').trim();
    }).filter(line => {
      const t = line.trim();
      if (t.length === 0) return true;            // keep blank lines (para breaks)
      if (t.length <= 2) return false;            // "2", "@", "ON"
      if (/^[^a-zA-Z]+$/.test(t)) return false;  // no letters: "80", "#3"
      if (/^[A-Z]\d+$/.test(t)) return false;    // barcode: "F2", "T4"
      if (/^[\$£€][\d.,]+(?:\/\d+\s*\w+)?$/.test(t)) return false; // price line
      if (/^[\$£€]?\d+[\d.,]*\s*[\/|]\s*\d+\s*(oz|ml|cl)$/i.test(t)) return false;
      // All-caps menu headers: "ABOUT MENU DR", "COCKTAILS", "ABOUT US"
      // — short lines (≤6 words) that are entirely uppercase letters/spaces
      if (/^[A-Z][A-Z\s]{2,}$/.test(t) && t.split(/\s+/).length <= 6) return false;
      return true;
    });

    // ── Pass 2: rejoin soft line breaks from column/layout OCR ──────────────
    // When Vision reads a rotated or multi-column menu it splits mid-sentence:
    //   "coconut"          ← ends with a plain word, no terminal punctuation
    //   "rum, salt, ..."   ← continuation starts lowercase
    // Join those back so "coconut rum, salt, ..." is one line.
    const rejoined: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const curr = lines[i];
      const next = lines[i + 1];

      // If curr is a non-empty line that ends without sentence-ending punctuation
      // AND next starts with a lowercase letter (i.e. it's a continuation fragment),
      // join them with a space.
      const currTrimmed = curr.trim();
      const nextTrimmed = next?.trim() ?? '';

      const currEndsAbruptly =
        currTrimmed.length > 0 &&
        !/[.!?:;]$/.test(currTrimmed) &&
        nextTrimmed.length > 0 &&
        /^[a-z]/.test(nextTrimmed);

      if (currEndsAbruptly) {
        rejoined.push(currTrimmed + ' ' + nextTrimmed);
        i++; // skip next — it's been merged
      } else {
        rejoined.push(curr);
      }
    }

    return rejoined
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Test OCR functionality with a sample
   */
  static async testOCR(): Promise<string> {
    log.info('OCRService', 'Testing OCR with mock data');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return `Classic Old Fashioned

2 oz bourbon whiskey
1/4 oz simple syrup
2 dashes Angostura bitters
Orange peel for garnish

Instructions:
1. Add whiskey, simple syrup, and bitters to mixing glass
2. Fill with ice and stir for 30 seconds
3. Strain over large ice cube in rocks glass
4. Express orange oils over drink and garnish`;
  }
}

type SelectionBox = {
  x: number;
  y: number;
  w: number;
  h: number;
};
