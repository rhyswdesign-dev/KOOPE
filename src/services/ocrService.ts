import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { log } from '../lib/logger';

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes?: Array<{
    text: string;
    bounds: { x: number; y: number; width: number; height: number };
  }>;
}

export class OCRService {

  /**
   * Pick an image from gallery and extract text using OCR
   */
  static async pickImageAndExtractText(): Promise<{ text: string; imageUri: string } | null> {
    let imageUri = '';
    try {
      // Request permission to access media library
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Permission to access camera roll is required!');
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (result.canceled) {
        return null;
      }

      imageUri = result.assets[0].uri;

      // Extract text from the selected image
      const extractedText = await this.extractTextFromImage(imageUri);

      return {
        text: extractedText,
        imageUri: imageUri
      };

    } catch (error: any) {
      log.error('OCRService', 'Error picking image and extracting text', error);

      // Return a helpful response instead of throwing
      return {
        text: 'Unable to process the selected image. Please try a different image or enter the recipe manually.',
        imageUri: imageUri
      };
    }
  }

  /**
   * Take a photo with camera and extract text using OCR
   */
  static async takePhotoAndExtractText(): Promise<{ text: string; imageUri: string } | null> {
    let imageUri = '';
    try {
      // Request permission to use camera
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        throw new Error('Permission to use camera is required!');
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (result.canceled) {
        return null;
      }

      imageUri = result.assets[0].uri;

      // Extract text from the captured photo
      const extractedText = await this.extractTextFromImage(imageUri);

      return {
        text: extractedText,
        imageUri: imageUri
      };

    } catch (error: any) {
      log.error('OCRService', 'Error taking photo and extracting text', error);

      // Return a helpful response instead of throwing
      return {
        text: 'Unable to process the captured photo. Please try taking another photo with better lighting or enter the recipe manually.',
        imageUri: imageUri
      };
    }
  }

  /**
   * Extract text from image using Google Cloud Vision API
   */
  private static async extractTextFromImage(imageUri: string): Promise<string> {
    try {
      // First, optimize the image for better OCR results
      const optimizedImage = await this.optimizeImageForOCR(imageUri);

      // Check if we have a Google Cloud Vision API key
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY;
      const isDevelopmentMode = !apiKey || apiKey === 'your-google-cloud-api-key-here';

      if (isDevelopmentMode) {
        // Development mode - return mock OCR result
        log.warn('OCRService', 'Development mode: Using mock OCR response', {
          hint: 'Set EXPO_PUBLIC_GOOGLE_CLOUD_API_KEY in .env file'
        });
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay

        return this.getMockOCRText();
      }

      log.info('OCRService', 'Using real Google Cloud Vision API for OCR');

      // Convert image to base64 for API
      const base64Image = await this.imageToBase64(optimizedImage.uri);

      // Call Google Cloud Vision API
      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
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
                    maxResults: 1,
                  },
                ],
              },
            ],
          }),
        }
      );

      const result = await response.json();

      if (result.responses && result.responses[0]) {
        const response = result.responses[0];

        // Check for errors in the response
        if (response.error) {
          log.error('OCRService', 'Google Vision API error', response.error);
          throw new Error(`Vision API error: ${response.error.message}`);
        }

        // Check if text was detected
        if (response.textAnnotations && response.textAnnotations.length > 0) {
          // Get the full text from the first annotation (contains all detected text)
          const extractedText = response.textAnnotations[0].description;

          // Clean up the text for better recipe processing
          return this.cleanExtractedText(extractedText);
        } else {
          // No text detected - return a helpful message instead of throwing error
          log.warn('OCRService', 'No text detected in image');
          return 'No readable text found in the image. Please try with a clearer image or different angle.';
        }
      } else {
        // No valid response - return fallback message instead of throwing
        log.warn('OCRService', 'Invalid or empty response from OCR service');
        return 'Unable to process the image. The OCR service may be temporarily unavailable. Please try again or enter the recipe manually.';
      }

    } catch (error: any) {
      log.error('OCRService', 'OCR processing error', error);

      // If it's a "no text detected" scenario, return helpful guidance instead of throwing
      if (error.message && error.message.includes('No text detected')) {
        return 'No readable text found in the image. Please try:\n• Taking a clearer photo\n• Better lighting\n• Different angle\n• Closer to the text';
      }

      // For other errors, provide fallback
      log.info('OCRService', 'OCR failed, returning fallback message');
      return 'Unable to process image at the moment. You can manually enter the recipe details instead.';
    }
  }

  /**
   * Optimize image for better OCR results
   */
  private static async optimizeImageForOCR(imageUri: string) {
    try {
      return await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { resize: { width: 1024 } }, // Resize to optimal width for OCR
          // Add contrast and sharpness if needed
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
    } catch (error) {
      log.error('OCRService', 'Image optimization error', error);
      // Return original if optimization fails
      return { uri: imageUri };
    }
  }

  /**
   * Convert image to base64
   */
  private static async imageToBase64(imageUri: string): Promise<string> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      log.error('OCRService', 'Base64 conversion error', error);
      throw new Error('Failed to convert image to base64');
    }
  }

  /**
   * Clean extracted text for better recipe processing
   */
  private static cleanExtractedText(rawText: string): string {
    return rawText
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Fix common OCR mistakes for recipe measurements
      .replace(/(\d+)\s*\|\s*/g, '$1 1/') // Fix "2 |" to "2 1/"
      .replace(/(\d+)\s*l\s*/gi, '$1 ')    // Fix "2l" to "2 "
      .replace(/(\d+)\s*o\s*z/gi, '$1 oz') // Fix "2 o z" to "2 oz"
      .replace(/(\d+)\s*c\s*u\s*p/gi, '$1 cup') // Fix spacing in "cup"
      .replace(/t\s*b\s*s\s*p/gi, 'tbsp')  // Fix "t b s p" to "tbsp"
      .replace(/t\s*s\s*p/gi, 'tsp')       // Fix "t s p" to "tsp"
      // Clean up line breaks
      .replace(/\n+/g, '\n')
      .trim();
  }

  /**
   * Get mock OCR text for development mode
   */
  private static getMockOCRText(): string {
    const mockRecipes = [
      `Classic Old Fashioned

2 oz bourbon whiskey
1/4 oz simple syrup
2 dashes Angostura bitters
Orange peel for garnish

Instructions:
1. Add whiskey, simple syrup, and bitters to mixing glass
2. Fill with ice and stir for 30 seconds
3. Strain over large ice cube in rocks glass
4. Express orange oils over drink and garnish`,

      `Moscow Mule

2 oz vodka
4 oz ginger beer
1/2 oz fresh lime juice
Lime wheel for garnish
Copper mug

Mix vodka and lime juice in copper mug
Fill with ice
Top with ginger beer
Stir gently and garnish with lime wheel`,

      `Margarita Recipe

2 oz silver tequila
1 oz fresh lime juice
3/4 oz triple sec
Salt for rim
Lime wheel

Rim glass with salt
Shake all ingredients with ice
Strain into rocks glass over ice
Garnish with lime wheel`
    ];

    // Return a random mock recipe
    return mockRecipes[Math.floor(Math.random() * mockRecipes.length)];
  }

  /**
   * Test OCR functionality with a sample
   */
  static async testOCR(): Promise<string> {
    // In development, return mock text
    log.info('OCRService', 'Testing OCR with mock data');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return this.getMockOCRText();
  }
}