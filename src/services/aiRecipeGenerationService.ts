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
  selectedSpirit: string;
  selectedPreparationMethod: string;
  selectedFlavorProfile: string;
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
 * Build prompt for specific difficulty level with spirit, preparation method, and flavor profile
 */
function buildPromptForDifficulty(
  difficulty: 'beginner' | 'intermediate' | 'expert',
  inventory: UserInventoryItem[],
  selectedSpirit: string,
  selectedPreparationMethod: string,
  selectedFlavorProfile: string
): string {
  const inventoryList = inventory
    .map(item => item.item_name)
    .join(', ');

  const basePrompt = `You are a professional mixologist creating personalized cocktail recipes.

User's available ingredients: ${inventoryList}

CRITICAL CONSTRAINTS:
- You MUST use ONLY the ingredients listed above. Do not suggest any additional ingredients.
- Base spirit MUST be: ${selectedSpirit}
- Preparation method MUST be: ${selectedPreparationMethod}
- Flavor profile MUST match: ${selectedFlavorProfile}
- The recipe MUST be makeable with ONLY the ingredients in their inventory

BALANCING RULES:
- Bitter liqueurs (Campari, Aperol, Cynar): Use sparingly (0.25-0.75 oz max). MUST balance with sweet component (syrup/liqueur).
  EXCEPTION: Aperol Spritz-style drinks can use 3 oz Aperol if heavily diluted with Prosecco/Champagne + soda water.
- Strong spirits (mezcal, scotch, rum >80 proof): Use standard pour (1.5-2 oz) but balance with citrus or sweet.
- Citrus juice: Fresh lime/lemon should be 0.5-1 oz to avoid overpowering.
- Simple syrup: Start at 0.5 oz, adjust based on other sweet components.
- Bitters: 2-3 dashes maximum unless recipe specifically calls for more.
- Egg white: Only use with shaken drinks, never with stirred or built drinks.
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
- IMPORTANT: List ingredients in this order: Liquor → Syrup → Juice → Bitters
- Include bartender tip: "Beginners should use the cheapest ingredients first, just in case of a mistake"

Focus on: Classic flavor combinations, easy execution, confidence-building`,

    intermediate: `Generate 1 intermediate-level cocktail recipe.

Requirements:
- Use 4-6 ingredients from the list above
- Can include multiple techniques: muddle, shake, double-strain
- May use flavored syrups or bitters if available
- More refined presentation and technique
- Proper terminology (e.g., "fine-strain", "expressed oils")
- Preparation time: 5-10 minutes
- IMPORTANT: List ingredients in this order: Liquor → Syrup → Juice → Bitters

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
- IMPORTANT: List ingredients in this order: Liquor → Syrup → Juice → Bitters

Focus on: Innovation, complexity, restaurant-quality presentation`,
  };

  const jsonInstructions = `
Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "name": "Recipe Name",
  "ingredients": "2 oz vodka, 0.5 oz simple syrup, 1 oz lime juice, 2 dashes bitters",
  "instructions": "Add all ingredients to shaker with ice. Shake for 10-12 seconds. Fine-strain into chilled coupe glass.",
  "glass_type": "Coupe Glass",
  "garnish": "Lime wheel",
  "category": "refreshing",
  "tips": "Bartender tip: Use fresh citrus juice for best results. Beginners should practice with cheaper ingredients first."
}

IMPORTANT: List ingredients in this order: Liquor → Syrup → Juice → Bitters
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
  inventory: UserInventoryItem[],
  selectedSpirit: string,
  selectedPreparationMethod: string,
  selectedFlavorProfile: string
): Omit<GeneratedRecipe, 'id' | 'is_ai_generated' | 'generated_by_user_id' | 'difficulty_level' | 'generation_prompt' | 'inventory_snapshot' | 'ai_model' | 'generation_timestamp'> {
  // Use first few ingredients from inventory to create realistic mock recipe
  const ingredientNames = inventory.slice(0, 6).map(i => i.item_name).join(', ');

  // Customize instructions based on preparation method
  const methodInstructions = {
    shake: 'Shake vigorously with ice for 10-12 seconds. Strain into glass.',
    stir: 'Stir gently with ice for 20-30 seconds. Strain into glass.',
    build: 'Build directly in glass over ice. Stir gently to combine.',
    muddle: 'Muddle ingredients in glass. Add ice and remaining ingredients. Stir well.',
    blend: 'Blend all ingredients with ice until smooth. Pour into glass.',
  };

  const mockRecipes = {
    beginner: {
      name: `${selectedFlavorProfile.charAt(0).toUpperCase() + selectedFlavorProfile.slice(1)} ${selectedSpirit.charAt(0).toUpperCase() + selectedSpirit.slice(1)} ${selectedPreparationMethod.charAt(0).toUpperCase() + selectedPreparationMethod.slice(1)}`,
      ingredients: `2 oz ${selectedSpirit}, 1 oz lime juice, 0.5 oz simple syrup, soda water`,
      instructions: `${methodInstructions[selectedPreparationMethod as keyof typeof methodInstructions]} Garnish with lime wheel. Tip: Beginners should use the cheapest ingredients first, just in case of a mistake.`,
      category: selectedFlavorProfile,
      glass_type: 'Highball Glass',
      garnish: 'Lime wheel',
      tips: 'Beginners should use the cheapest ingredients first, just in case of a mistake.',
    },
    intermediate: {
      name: `${selectedFlavorProfile.charAt(0).toUpperCase() + selectedFlavorProfile.slice(1)} ${selectedSpirit.charAt(0).toUpperCase() + selectedSpirit.slice(1)} Garden`,
      ingredients: `2 oz ${selectedSpirit}, 0.75 oz lemon juice, 0.5 oz simple syrup, fresh herbs, 1 dash bitters`,
      instructions: `Add ${selectedSpirit}, lemon juice, simple syrup, herbs, and bitters. ${methodInstructions[selectedPreparationMethod as keyof typeof methodInstructions]} Express citrus oils over drink.`,
      category: selectedFlavorProfile,
      glass_type: 'Coupe Glass',
      garnish: 'Fresh herb sprig and citrus twist',
      tips: 'Double-straining removes small herb particles for a cleaner presentation.',
    },
    expert: {
      name: `Elevated ${selectedSpirit.charAt(0).toUpperCase() + selectedSpirit.slice(1)} ${selectedFlavorProfile.charAt(0).toUpperCase() + selectedFlavorProfile.slice(1)}`,
      ingredients: `2 oz ${selectedSpirit}, 0.75 oz lime juice, 0.5 oz house syrup, 0.25 oz liqueur, 2 dashes bitters`,
      instructions: `Combine ${selectedSpirit}, lime juice, house syrup, liqueur, and bitters. ${methodInstructions[selectedPreparationMethod as keyof typeof methodInstructions]} Top with additional crushed ice. Express citrus oils and add garnish.`,
      category: selectedFlavorProfile,
      glass_type: 'Rocks Glass',
      garnish: 'Luxurious garnish with edible flower',
      tips: 'Using crushed ice creates better dilution and a more refreshing texture.',
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
  const { userId, userInventory, difficultyLevel, isPremium, selectedSpirit, selectedPreparationMethod, selectedFlavorProfile } = params;

  try {
    log.info('aiRecipeGenerationService', 'Generating recipe', {
      userId,
      difficulty: difficultyLevel,
      inventorySize: userInventory.length,
      isPremium,
      spirit: selectedSpirit,
      preparationMethod: selectedPreparationMethod,
      flavorProfile: selectedFlavorProfile,
    });

    // Build prompt with spirit, preparation method, and flavor profile
    const prompt = buildPromptForDifficulty(difficultyLevel, userInventory, selectedSpirit, selectedPreparationMethod, selectedFlavorProfile);

    let recipeData;

    // Development mode: use mock data
    if (isDevelopmentMode()) {
      log.info('aiRecipeGenerationService', 'Using mock recipe (dev mode)');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API delay
      recipeData = getMockRecipeForDifficulty(difficultyLevel, userInventory, selectedSpirit, selectedPreparationMethod, selectedFlavorProfile);
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
    // Generate UUID compatible with React Native
    const uuid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const generatedRecipe: GeneratedRecipe = {
      id: uuid,
      ...recipeData,
      is_ai_generated: true,
      generated_by_user_id: userId,
      difficulty_level: difficultyLevel,
      generation_prompt: prompt,
      inventory_snapshot: userInventory,
      ai_model: isDevelopmentMode() ? 'mock' : 'gpt-4o',
      generation_timestamp: new Date().toISOString(),
    };

    // Save to Supabase (skip for development mode mock recipes)
    if (!isDevelopmentMode()) {
      await saveGeneratedRecipe(generatedRecipe);

      // Increment rate limit for free users (only for real AI generations)
      if (!isPremium) {
        await incrementRateLimit(userId);
      }
    }

    log.info('aiRecipeGenerationService', 'Recipe generated successfully', {
      recipeName: generatedRecipe.name,
      isDev: isDevelopmentMode(),
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
