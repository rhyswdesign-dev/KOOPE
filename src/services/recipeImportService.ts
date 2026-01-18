/**
 * Recipe Import Service
 * Extracts cocktail recipes from social media URLs using AI
 */

import { log } from '../lib/logger';

export type SocialPlatform = 'instagram' | 'pinterest' | 'twitter' | 'tiktok' | 'youtube' | 'other';

export interface ExtractedIngredient {
  name: string;
  amount: string;
  unit: string;
}

export interface ExtractedRecipe {
  name: string;
  description?: string;
  ingredients: ExtractedIngredient[];
  instructions: string[];
  image?: string;
  sourceUrl: string;
  sourcePlatform: SocialPlatform;
  garnish?: string;
  glassware?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  prepTime?: number;
}

// Platform detection patterns
const PLATFORM_PATTERNS: Record<SocialPlatform, RegExp[]> = {
  instagram: [
    /instagram\.com/i,
    /instagr\.am/i,
  ],
  pinterest: [
    /pinterest\.com/i,
    /pin\.it/i,
  ],
  twitter: [
    /twitter\.com/i,
    /x\.com/i,
  ],
  tiktok: [
    /tiktok\.com/i,
    /vm\.tiktok\.com/i,
  ],
  youtube: [
    /youtube\.com/i,
    /youtu\.be/i,
  ],
  other: [],
};

/**
 * Detect which social platform a URL is from
 */
export function detectPlatform(url: string): SocialPlatform {
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    if (platform === 'other') continue;
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return platform as SocialPlatform;
      }
    }
  }
  return 'other';
}

/**
 * Validate if a URL looks like it could contain a recipe
 */
export function isValidRecipeUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract text content from a shared URL
 * This is a placeholder - in production, you'd use a scraping service or API
 */
async function fetchContentFromUrl(url: string): Promise<string> {
  log.info('RecipeImportService', 'Fetching content from URL', { url });

  // For now, return the URL itself - the AI will work with the URL
  // In production, you might use:
  // - A serverless function to scrape the page
  // - A third-party API like Diffbot or similar
  // - Platform-specific APIs (Instagram Basic Display API, etc.)
  return url;
}

/**
 * Build the AI prompt for recipe extraction
 */
function buildExtractionPrompt(url: string, platform: SocialPlatform): string {
  return `You are a cocktail recipe extraction assistant. Extract the cocktail recipe from the following ${platform} URL.

URL: ${url}

Please extract and return a JSON object with the following structure:
{
  "name": "Name of the cocktail",
  "description": "Brief description of the cocktail",
  "ingredients": [
    { "name": "ingredient name", "amount": "2", "unit": "oz" }
  ],
  "instructions": [
    "Step 1...",
    "Step 2..."
  ],
  "garnish": "Garnish description if any",
  "glassware": "Type of glass",
  "difficulty": "Easy" | "Medium" | "Hard",
  "prepTime": 5
}

If you cannot access or parse the URL, provide your best guess based on the URL structure, or return a template with placeholder values that the user can fill in.

Important:
- All amounts should be in standard cocktail measurements (oz, ml, dashes, etc.)
- Instructions should be clear, numbered steps
- If difficulty is unclear, default to "Medium"
- prepTime is in minutes

Return ONLY the JSON object, no additional text.`;
}

/**
 * Parse AI response into ExtractedRecipe
 */
function parseAIResponse(response: string, url: string, platform: SocialPlatform): ExtractedRecipe {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      name: parsed.name || 'Imported Cocktail',
      description: parsed.description,
      ingredients: Array.isArray(parsed.ingredients)
        ? parsed.ingredients.map((ing: any) => ({
            name: ing.name || '',
            amount: String(ing.amount || ''),
            unit: ing.unit || '',
          }))
        : [],
      instructions: Array.isArray(parsed.instructions) ? parsed.instructions : [],
      garnish: parsed.garnish,
      glassware: parsed.glassware,
      difficulty: parsed.difficulty || 'Medium',
      prepTime: parsed.prepTime || 5,
      sourceUrl: url,
      sourcePlatform: platform,
      image: parsed.image,
    };
  } catch (error) {
    log.error('RecipeImportService', 'Failed to parse AI response', error as Error);

    // Return a template recipe that the user can fill in
    return {
      name: 'Imported Cocktail',
      description: 'Imported from ' + platform,
      ingredients: [
        { name: '', amount: '', unit: '' },
      ],
      instructions: [''],
      sourceUrl: url,
      sourcePlatform: platform,
      difficulty: 'Medium',
      prepTime: 5,
    };
  }
}

/**
 * Call AI service to extract recipe
 * This is a placeholder - connect to your preferred AI provider
 */
async function callAIService(prompt: string): Promise<string> {
  log.info('RecipeImportService', 'Calling AI service for extraction');

  // TODO: Replace with actual AI API call
  // Options:
  // 1. OpenAI API
  // 2. Anthropic Claude API
  // 3. Your own backend that proxies to an AI service

  // For now, return a mock response for testing
  // In production, this would be an actual API call

  // Example with fetch to a backend endpoint:
  // const response = await fetch('https://your-api.com/extract-recipe', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ prompt }),
  // });
  // return await response.text();

  // Mock response for development
  return JSON.stringify({
    name: 'Imported Cocktail',
    description: 'A delicious cocktail imported from social media',
    ingredients: [
      { name: 'Spirit', amount: '2', unit: 'oz' },
      { name: 'Mixer', amount: '1', unit: 'oz' },
      { name: 'Citrus', amount: '0.75', unit: 'oz' },
    ],
    instructions: [
      'Add all ingredients to a shaker with ice',
      'Shake vigorously for 10-15 seconds',
      'Strain into a chilled glass',
      'Garnish and serve',
    ],
    garnish: 'Citrus twist',
    glassware: 'Coupe',
    difficulty: 'Medium',
    prepTime: 5,
  });
}

/**
 * Main function to extract a recipe from a social media URL
 */
export async function extractRecipeFromUrl(url: string): Promise<ExtractedRecipe> {
  log.info('RecipeImportService', 'Starting recipe extraction', { url });

  if (!isValidRecipeUrl(url)) {
    throw new Error('Invalid URL provided');
  }

  const platform = detectPlatform(url);
  log.info('RecipeImportService', 'Detected platform', { platform });

  // Fetch content from URL (for future enhancement)
  await fetchContentFromUrl(url);

  // Build and send prompt to AI
  const prompt = buildExtractionPrompt(url, platform);
  const aiResponse = await callAIService(prompt);

  // Parse the response
  const recipe = parseAIResponse(aiResponse, url, platform);

  log.info('RecipeImportService', 'Recipe extracted successfully', {
    name: recipe.name,
    ingredientCount: recipe.ingredients.length,
  });

  return recipe;
}

/**
 * Get platform display name
 */
export function getPlatformDisplayName(platform: SocialPlatform): string {
  const names: Record<SocialPlatform, string> = {
    instagram: 'Instagram',
    pinterest: 'Pinterest',
    twitter: 'X (Twitter)',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    other: 'Web',
  };
  return names[platform];
}

/**
 * Get platform icon name (Ionicons)
 */
export function getPlatformIcon(platform: SocialPlatform): string {
  const icons: Record<SocialPlatform, string> = {
    instagram: 'logo-instagram',
    pinterest: 'logo-pinterest',
    twitter: 'logo-twitter',
    tiktok: 'musical-notes',
    youtube: 'logo-youtube',
    other: 'globe-outline',
  };
  return icons[platform];
}
