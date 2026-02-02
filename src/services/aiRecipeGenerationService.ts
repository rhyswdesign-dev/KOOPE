/**
 * AI Recipe Generation Service
 * Generates custom cocktail recipes based on user inventory and difficulty level
 */

import OpenAI from 'openai';
import { supabase } from '../lib/supabase';
import type { Cocktail } from '../types/supabase';
import type { UserInventoryItem } from '../types/database';
import { log } from '../lib/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RATE_LIMIT_KEY = '@AI_RECIPE_RATE_LIMIT';
const FREE_TIER_DAILY_LIMIT = 1;

export interface AIRecipeGenerationParams {
  userId: string;
  userInventory: UserInventoryItem[];
  difficultyLevel: 'beginner' | 'intermediate' | 'expert';
  isPremium: boolean;
}

export interface GeneratedRecipe extends Cocktail {
  is_ai_generated: boolean;
  generated_by_user_id: string;
  difficulty_level: 'beginner' | 'intermediate' | 'expert';
  generation_prompt: string;
  inventory_snapshot: any[];
  ai_model: string;
  generation_timestamp: string;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true, // Required for React Native
});

/**
 * Check if API key is valid
 */
function isValidApiKey(apiKey: string | undefined): boolean {
  if (!apiKey) return false;
  if (apiKey === 'your-openai-api-key-here') return false;
  if (apiKey === 'dev-key') return false;
  if (!apiKey.startsWith('sk-')) return false;
  if (apiKey.length < 40) return false;
  return true;
}

/**
 * Check if we're in development mode (no valid API key)
 */
function isDevelopmentMode(): boolean {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  return !isValidApiKey(apiKey);
}

/**
 * Build prompt for specific difficulty level
 */
function buildPromptForDifficulty(
  difficulty: 'beginner' | 'intermediate' | 'expert',
  inventory: UserInventoryItem[]
): string {
  const inventoryList = inventory
    .map(item => item.item_name)
    .join(', ');

  const basePrompt = `You are a professional mixologist creating cocktail recipes.

User's available ingredients: ${inventoryList}

CRITICAL: You MUST use ONLY the ingredients listed above. Do not suggest any additional ingredients.
`;

  const difficultyInstructions = {
    beginner: `Generate 1 beginner-friendly cocktail recipe.

Requirements:
- Use maximum 4 ingredients from the list above
- Simple techniques only: stir, shake, or build
- No advanced infusions or preparations
- Use simple syrup if sweetener needed
- Clear, step-by-step instructions
- Standard glassware (rocks glass, highball, coupe)
- Preparation time: under 5 minutes
- Perfect for someone making their first cocktail

Focus on: Classic flavor combinations, easy execution, confidence-building`,

    intermediate: `Generate 1 intermediate-level cocktail recipe.

Requirements:
- Use 4-6 ingredients from the list above
- Can include multiple techniques: muddle, shake, double-strain
- May use flavored syrups or bitters if available
- More refined presentation and technique
- Proper terminology (e.g., "fine-strain", "expressed oils")
- Preparation time: 5-10 minutes

Focus on: Well-balanced flavors, proper technique, impressive presentation`,

    expert: `Generate 1 expert-level cocktail showcasing advanced mixology.

Requirements:
- Use 5+ ingredients from the list above
- Advanced techniques encouraged:
  * Quick infusions (e.g., "muddle pineapple with rum, let sit 5 minutes, strain")
  * House-made syrups (if base ingredients available)
  * Layering, smoking, or fat-washing techniques
  * Complex flavor balancing (sweet, sour, bitter, aromatic)
- Specialty glassware and garnishes
- Multiple preparation steps
- Preparation time: 10-20 minutes

Focus on: Innovation, complexity, restaurant-quality presentation`,
  };

  const jsonInstructions = `
Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "name": "Recipe Name",
  "ingredients": "2 oz vodka, 1 oz lime juice, 0.5 oz simple syrup, 4 mint leaves",
  "instructions": "Muddle mint with simple syrup. Add vodka and lime juice. Shake with ice for 10 seconds. Fine-strain into chilled coupe glass.",
  "glass_type": "Coupe Glass",
  "garnish": "Mint sprig",
  "category": "refreshing"
}

Category options: classic, modern, refreshing, spirit-forward, tropical, brunch
`;

  return basePrompt + difficultyInstructions[difficulty] + jsonInstructions;
}

/**
 * Parse and validate AI response
 */
function parseAIResponse(response: string): Omit<GeneratedRecipe, 'id' | 'is_ai_generated' | 'generated_by_user_id' | 'difficulty_level' | 'generation_prompt' | 'inventory_snapshot' | 'ai_model' | 'generation_timestamp'> {
  try {
    // Remove markdown code blocks if present
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/```\n?/g, '');
    }

    const parsed = JSON.parse(cleanResponse);

    // Validate required fields
    if (!parsed.name || !parsed.ingredients || !parsed.instructions) {
      throw new Error('Missing required fields in AI response');
    }

    return {
      name: parsed.name,
      ingredients: parsed.ingredients,
      instructions: parsed.instructions,
      category: parsed.category || 'modern',
      glass_type: parsed.glass_type || 'Rocks Glass',
      garnish: parsed.garnish || 'None',
      image_url: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } catch (error) {
    log.error('aiRecipeGenerationService', 'Failed to parse AI response', error);
    throw new Error('Failed to parse recipe. Please try again.');
  }
}

/**
 * Get mock recipe for development mode
 */
function getMockRecipeForDifficulty(
  difficulty: 'beginner' | 'intermediate' | 'expert',
  inventory: UserInventoryItem[]
): Omit<GeneratedRecipe, 'id' | 'is_ai_generated' | 'generated_by_user_id' | 'difficulty_level' | 'generation_prompt' | 'inventory_snapshot' | 'ai_model' | 'generation_timestamp'> {
  const mockRecipes = {
    beginner: {
      name: 'Simple Refresher',
      ingredients: '2 oz vodka, 1 oz lime juice, 0.5 oz simple syrup, soda water',
      instructions: 'Fill glass with ice. Add vodka, lime juice, and simple syrup. Stir well. Top with soda water. Garnish with lime wheel.',
      category: 'refreshing',
      glass_type: 'Highball Glass',
      garnish: 'Lime wheel',
    },
    intermediate: {
      name: 'Citrus Garden',
      ingredients: '2 oz gin, 0.75 oz lemon juice, 0.5 oz simple syrup, 3 basil leaves, 1 dash orange bitters',
      instructions: 'Muddle basil with simple syrup. Add gin, lemon juice, and bitters. Shake vigorously with ice for 15 seconds. Double-strain into chilled coupe. Express lemon oils over drink.',
      category: 'modern',
      glass_type: 'Coupe Glass',
      garnish: 'Basil leaf and lemon twist',
    },
    expert: {
      name: 'Elevated Infusion',
      ingredients: '2 oz rum infused with fresh pineapple (30 min), 0.75 oz lime juice, 0.5 oz orgeat syrup, 0.25 oz orange curaçao, 2 dashes Angostura bitters',
      instructions: 'Infusion: Muddle 1/4 cup fresh pineapple with 2 oz rum, let sit 30 minutes, fine-strain. Cocktail: Combine infused rum, lime juice, orgeat, curaçao, and bitters. Shake hard with crushed ice. Dirty dump into rocks glass. Top with additional crushed ice. Express lime oils.',
      category: 'tropical',
      glass_type: 'Rocks Glass',
      garnish: 'Pineapple wedge, mint sprig, and edible flower',
    },
  };

  return {
    ...mockRecipes[difficulty],
    image_url: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Check rate limit for user
 * Free users: 1 recipe per day
 * Premium users: unlimited
 */
export async function checkRateLimit(
  userId: string,
  isPremium: boolean
): Promise<{ canGenerate: boolean; remaining: number }> {
  try {
    if (isPremium) {
      return { canGenerate: true, remaining: -1 }; // Unlimited
    }

    const key = `${RATE_LIMIT_KEY}_${userId}`;
    const stored = await AsyncStorage.getItem(key);

    if (!stored) {
      return { canGenerate: true, remaining: FREE_TIER_DAILY_LIMIT };
    }

    const data = JSON.parse(stored);
    const today = new Date().toDateString();

    // Reset if it's a new day
    if (data.date !== today) {
      await AsyncStorage.removeItem(key);
      return { canGenerate: true, remaining: FREE_TIER_DAILY_LIMIT };
    }

    // Check if limit reached
    if (data.count >= FREE_TIER_DAILY_LIMIT) {
      return { canGenerate: false, remaining: 0 };
    }

    return { canGenerate: true, remaining: FREE_TIER_DAILY_LIMIT - data.count };
  } catch (error) {
    log.error('aiRecipeGenerationService', 'Error checking rate limit', error);
    // Allow generation on error
    return { canGenerate: true, remaining: 1 };
  }
}

/**
 * Increment rate limit counter
 */
async function incrementRateLimit(userId: string): Promise<void> {
  try {
    const key = `${RATE_LIMIT_KEY}_${userId}`;
    const today = new Date().toDateString();
    const stored = await AsyncStorage.getItem(key);

    if (!stored) {
      await AsyncStorage.setItem(key, JSON.stringify({ date: today, count: 1 }));
    } else {
      const data = JSON.parse(stored);
      if (data.date === today) {
        data.count += 1;
        await AsyncStorage.setItem(key, JSON.stringify(data));
      } else {
        await AsyncStorage.setItem(key, JSON.stringify({ date: today, count: 1 }));
      }
    }
  } catch (error) {
    log.error('aiRecipeGenerationService', 'Error incrementing rate limit', error);
  }
}

/**
 * Main function: Generate recipe from user inventory
 */
export async function generateRecipeFromInventory(
  params: AIRecipeGenerationParams
): Promise<GeneratedRecipe> {
  const { userId, userInventory, difficultyLevel, isPremium } = params;

  try {
    log.info('aiRecipeGenerationService', 'Generating recipe', {
      userId,
      difficulty: difficultyLevel,
      inventorySize: userInventory.length,
      isPremium,
    });

    // Build prompt
    const prompt = buildPromptForDifficulty(difficultyLevel, userInventory);

    let recipeData;

    // Development mode: use mock data
    if (isDevelopmentMode()) {
      log.info('aiRecipeGenerationService', 'Using mock recipe (dev mode)');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
      recipeData = getMockRecipeForDifficulty(difficultyLevel, userInventory);
    } else {
      // Production mode: call OpenAI API
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert mixologist who creates cocktail recipes. You ALWAYS respond with valid JSON only, no additional text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from AI');
      }

      recipeData = parseAIResponse(response);
    }

    // Create full recipe object
    const generatedRecipe: GeneratedRecipe = {
      id: crypto.randomUUID(),
      ...recipeData,
      is_ai_generated: true,
      generated_by_user_id: userId,
      difficulty_level: difficultyLevel,
      generation_prompt: prompt,
      inventory_snapshot: userInventory,
      ai_model: isDevelopmentMode() ? 'mock' : 'gpt-4o',
      generation_timestamp: new Date().toISOString(),
    };

    // Save to Supabase
    await saveGeneratedRecipe(generatedRecipe);

    // Increment rate limit for free users
    if (!isPremium) {
      await incrementRateLimit(userId);
    }

    log.info('aiRecipeGenerationService', 'Recipe generated successfully', {
      recipeName: generatedRecipe.name,
    });

    return generatedRecipe;
  } catch (error: any) {
    log.error('aiRecipeGenerationService', 'Failed to generate recipe', error);

    // Handle specific errors
    if (error.message?.includes('quota') || error.status === 429) {
      throw new Error('AI service is currently busy. Please try again in a few moments.');
    }

    if (error.message?.includes('API key')) {
      throw new Error('Recipe generation is temporarily unavailable. Please try again later.');
    }

    throw new Error('Failed to generate recipe. Please check your ingredients and try again.');
  }
}

/**
 * Save generated recipe to Supabase
 */
export async function saveGeneratedRecipe(recipe: GeneratedRecipe): Promise<void> {
  try {
    const { error } = await supabase.from('cocktails').insert({
      id: recipe.id,
      name: recipe.name,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      category: recipe.category,
      glass_type: recipe.glass_type,
      garnish: recipe.garnish,
      image_url: recipe.image_url,
      is_ai_generated: recipe.is_ai_generated,
      generated_by_user_id: recipe.generated_by_user_id,
      difficulty_level: recipe.difficulty_level,
      generation_prompt: recipe.generation_prompt,
      inventory_snapshot: recipe.inventory_snapshot,
      ai_model: recipe.ai_model,
      generation_timestamp: recipe.generation_timestamp,
      created_at: recipe.created_at,
      updated_at: recipe.updated_at,
    });

    if (error) {
      log.error('aiRecipeGenerationService', 'Failed to save recipe to Supabase', error);
      throw error;
    }

    log.info('aiRecipeGenerationService', 'Recipe saved to Supabase');
  } catch (error) {
    log.error('aiRecipeGenerationService', 'Error saving recipe', error);
    throw new Error('Failed to save recipe. Please try again.');
  }
}

/**
 * Get user's previously generated AI recipes
 */
export async function getUserGeneratedRecipes(userId: string): Promise<GeneratedRecipe[]> {
  try {
    const { data, error } = await supabase
      .from('cocktails')
      .select('*')
      .eq('is_ai_generated', true)
      .eq('generated_by_user_id', userId)
      .order('generation_timestamp', { ascending: false });

    if (error) {
      log.error('aiRecipeGenerationService', 'Failed to fetch AI recipes', error);
      return [];
    }

    return (data || []) as GeneratedRecipe[];
  } catch (error) {
    log.error('aiRecipeGenerationService', 'Error fetching AI recipes', error);
    return [];
  }
}
