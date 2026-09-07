/**
 * AI Recipe Generation Service
 * Generates custom cocktail recipes based on user inventory and difficulty level.
 * All AI calls route through the ai-proxy Edge Function — the OpenAI key
 * never touches the client bundle.
 */

import { supabase } from '../lib/supabase';
import type { Cocktail } from '../types/supabase';
import type { UserInventoryItem } from '../types/database';
import { log } from '../lib/logger';
import { sendAIMessage, getAIUsageStatus, AIProxyRequestError } from './aiProxyService';

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

/**
 * Build prompt for specific difficulty level with spirit, preparation method, and flavor profile
 */
function buildPromptForDifficulty(
  difficulty: 'beginner' | 'intermediate' | 'expert',
  inventory: UserInventoryItem[],
  selectedSpirit: string,
  selectedPreparationMethod: string,
  selectedFlavorProfile: string,
): string {
  const inventoryList = inventory.map((item) => item.item_name).join(', ');

  const basePrompt = `You are a professional mixologist creating personalized cocktail recipes.

User's available ingredients: ${inventoryList}

CRITICAL CONSTRAINTS:
- You MUST use ONLY the ingredients listed above. Do not suggest any additional ingredients.
- Base spirit MUST be: ${selectedSpirit}
- Preparation method MUST be: ${selectedPreparationMethod}
- Flavor profile MUST match: ${selectedFlavorProfile}
- The recipe MUST be makeable with ONLY the ingredients in their inventory

FLAVOR PAIRING — before picking a structure or ratio, reason about which of
the available ingredients actually taste good together, the way a culinary
flavor-pairing reference (e.g. The Flavor Bible) would — not just whether
they're all technically "usable." Home bars increasingly hold non-classic,
kitchen-pantry ingredients (a nut syrup, a baking spice, a chocolate liqueur,
a fruit preserve) alongside spirits, and those need real pairing judgment,
not just a ratio applied blindly.
- Look for what actually connects two ingredients: a shared aromatic family
  (stone fruit, warm baking spice, citrus, nutty/roasted, floral), a
  complementary contrast (rich + bright acid, sweet + bitter, fat + citrus),
  or a "bridge" ingredient that links two otherwise-unrelated flavors
  (e.g. orange or vanilla bridging cinnamon and chocolate; honey or
  orange blossom bridging pistachio and citrus).
- You are NOT required to use every ingredient on the list, or even every
  ingredient the user checked. If two selected ingredients would clash
  (competing dominant aromatics, a flavor that overwhelms rather than
  supports, no plausible bridge between them), leave one out rather than
  forcing an unpleasant combination in service of using more ingredients.
- If nothing in the list pairs well together at all, say so plainly in the
  "tips" field and generate the least-bad option — do not pretend a bad
  pairing works.
- In the "tips" field, name the specific flavor logic you used (e.g.
  "Cinnamon and orange share warm citrus-forward notes that let the
  pistachio's nuttiness come through without the drink turning muddled").
  This is the recipe's justification, not just a serving suggestion.

COCKTAIL STRUCTURE — pick the classic family that best fits the requested
method and flavor profile below, and build the recipe from ITS ratio as a
starting point, not from scratch. Adjust proportionally for the ingredients
actually available, but stay recognizably within the chosen structure's
shape. State which structure you used in the "tips" field.

- THE SOUR (shake, sour/refreshing/tropical): 2 parts base spirit : 0.75 part
  citrus : 0.75 part sweetener. Shaken hard, strained. This ratio is the
  reason a Whiskey Sour or Daiquiri tastes "correct" — respect it before
  deviating.
- THE OLD FASHIONED / SPIRIT-FORWARD STIRRED (stir, spirit-forward/bitter):
  2 oz base spirit : 0.25-0.5 oz sweetener : 2-3 dashes bitters, built or
  stirred over ice, minimal dilution, citrus oil expressed over the top.
- THE MARTINI-STYLE STIRRED (stir, spirit-forward): 2-2.5 oz base spirit :
  0.5-1 oz modifier (vermouth/aromatized wine/liqueur), stirred with ice,
  strained up. Optional dash of bitters.
- THE HIGHBALL (build, refreshing): 1.5-2 oz base spirit topped with 3-4 oz
  of a long mixer (soda, tonic, ginger beer), built directly over ice, barely
  stirred so it stays carbonated.
- THE FIZZ (shake, refreshing/sour): built like a Sour (2:0.75:0.75) but
  shaken without ice, strained, then topped with 2-3 oz soda water for
  effervescence.
- THE DAISY (shake, sweet/tropical): like a Sour but the sweetener is a
  liqueur or grenadine instead of syrup, often served over crushed ice.

If none of these fit cleanly (e.g. an unusual ingredient combination), you
may deviate — but default to one of the above rather than inventing a ratio
from nothing.

BALANCING RULES:
- Bitter liqueurs (Campari, Aperol, Cynar): Use sparingly (0.25-0.75 oz max). MUST balance with sweet component (syrup/liqueur).
  EXCEPTION: Aperol Spritz-style drinks can use 3 oz Aperol if heavily diluted with Prosecco/Champagne + soda water.
- Strong spirits (mezcal, scotch, rum >80 proof): Use standard pour (1.5-2 oz) but balance with citrus or sweet.
- Citrus juice: Fresh lime/lemon should be 0.5-1 oz to avoid overpowering.
- Simple syrup: Start at 0.5 oz, adjust based on other sweet components.
- Bitters: 2-3 dashes maximum unless recipe specifically calls for more.
- Egg white: Only use with shaken drinks, never with stirred or built drinks.
- All-sweet ingredient sets (e.g. multiple dessert syrups/liqueurs, no citrus
  or bitters available among the selected ingredients): this is common with
  non-classic pantry ingredients (nut syrups, chocolate liqueurs, spiced
  syrups) and has no acid or bitterness to cut it, so it WILL taste flat or
  cloying if poured like a normal cocktail. Keep total pour noticeably
  smaller than usual (spirit stays standard, but each sweet component drops
  to 0.25-0.5 oz, not the usual 0.5-1 oz), lean on ice dilution to thin it
  out, and pick ONE of the sweet ingredients to lead while the others stay
  at accent quantities (a few dashes/teaspoon) rather than treating all of
  them as equal pours. Note the lack of acid/bitterness in "tips" so the
  drinker knows to expect a dessert-style sipper, not a balanced sour.
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
  "ingredients": [
    { "name": "Vodka", "amount": "2", "unit": "oz" },
    { "name": "Simple Syrup", "amount": "0.5", "unit": "oz" },
    { "name": "Lime Juice", "amount": "1", "unit": "oz" },
    { "name": "Bitters", "amount": "2", "unit": "dashes" }
  ],
  "instructions": "Add all ingredients to shaker with ice. Shake for 10-12 seconds. Fine-strain into chilled coupe glass.",
  "glass_type": "Coupe Glass",
  "garnish": "Lime wheel",
  "category": "refreshing",
  "tips": "Bartender tip: Use fresh citrus juice for best results. Beginners should practice with cheaper ingredients first."
}

"ingredients" MUST be a JSON array of objects, each with "name", "amount",
and "unit" as separate fields — NOT one combined string. "amount" is the
number only (e.g. "0.5", "2"), never the unit or ingredient name.
IMPORTANT: List ingredients in this order: Liquor → Syrup → Juice → Bitters
Category options: classic, modern, refreshing, spirit-forward, tropical, brunch
`;

  return basePrompt + difficultyInstructions[difficulty] + jsonInstructions;
}

/**
 * Extract the outermost {...} object from a string, ignoring any prose
 * before/after it. Scans for the first '{' and walks forward tracking
 * brace depth (respecting strings, so a '{' or '}' inside a quoted value
 * doesn't throw off the count) until it finds the matching close brace.
 * Returns null if no balanced object is found.
 */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = start; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

/**
 * Parse and validate AI response. Models occasionally wrap the JSON in
 * markdown fences that aren't at the very start of the string, add a
 * preamble ("Here's your recipe:"), or leave a trailing comma — none of
 * which are malicious, just noise around a perfectly good object. Rather
 * than fail the whole generation (and, for a rate-limited feature, the
 * user's daily attempt) on cosmetic noise, extract the JSON object
 * wherever it sits and repair the most common formatting slips before
 * giving up.
 */
function parseAIResponse(
  response: string,
): Omit<
  GeneratedRecipe,
  | 'id'
  | 'is_ai_generated'
  | 'generated_by_user_id'
  | 'difficulty_level'
  | 'generation_prompt'
  | 'inventory_snapshot'
  | 'ai_model'
  | 'generation_timestamp'
> {
  const raw = response.trim();
  const extracted = extractJsonObject(raw);

  if (!extracted) {
    log.error('aiRecipeGenerationService', 'No JSON object found in AI response', { raw });
    throw new Error('Failed to parse recipe. Please try again.');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(extracted);
  } catch {
    // One common repair: a trailing comma before a closing brace/bracket.
    try {
      parsed = JSON.parse(extracted.replace(/,(\s*[}\]])/g, '$1'));
    } catch (error) {
      log.error('aiRecipeGenerationService', 'Failed to parse AI response', error, { extracted });
      throw new Error('Failed to parse recipe. Please try again.');
    }
  }

  if (!parsed.name || !parsed.ingredients || !parsed.instructions) {
    log.error('aiRecipeGenerationService', 'AI response missing required fields', { parsed });
    throw new Error('Failed to parse recipe. Please try again.');
  }

  const structuredIngredients = normalizeIngredients(parsed.ingredients);
  const ingredientsText = structuredIngredients
    .map((ing) => [ing.amount, ing.unit, ing.name].filter(Boolean).join(' ').trim())
    .join(', ');

  return {
    name: parsed.name,
    // Legacy comma-separated text — still what the `ingredients` column
    // stores and what any code not yet reading `ingredients_structured`
    // expects (e.g. RecipeEditorScreen's plain-text field).
    ingredients: ingredientsText,
    ingredients_structured: structuredIngredients,
    instructions: parsed.instructions,
    category: parsed.category || 'modern',
    glass_type: parsed.glass_type || 'Rocks Glass',
    garnish: parsed.garnish || 'None',
    image_url: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Normalize whatever shape the AI actually returned for "ingredients" into
 * a consistent {name, amount, unit}[] — the prompt asks for a structured
 * array, but models don't always comply, and falling back to the old
 * single-string shape (rather than throwing) means an off-format response
 * still produces a usable recipe instead of burning the user's generation.
 */
function normalizeIngredients(raw: unknown): { name: string; amount: string; unit?: string }[] {
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') {
          // A plain string in the array (e.g. "2 oz vodka") — split off a
          // leading "<amount> <unit>" if present, keep the rest as name.
          const match = item.match(/^([\d./]+)\s*([a-zA-Z]+)?\s+(.+)$/);
          return match
            ? { amount: match[1], unit: match[2] || undefined, name: match[3].trim() }
            : { name: item.trim(), amount: '' };
        }
        return {
          name: String(item?.name ?? '').trim(),
          amount: String(item?.amount ?? '').trim(),
          unit: item?.unit ? String(item.unit).trim() : undefined,
        };
      })
      .filter((ing) => ing.name);
  }

  if (typeof raw === 'string') {
    // The old single-string format — split on commas and, per item, try to
    // separate a leading amount/unit from the ingredient name.
    return raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const match = part.match(/^([\d./]+)\s*([a-zA-Z]+)?\s+(.+)$/);
        return match
          ? { amount: match[1], unit: match[2] || undefined, name: match[3].trim() }
          : { name: part, amount: '' };
      });
  }

  return [];
}

/**
 * Check rate limit via the proxy — keeps the same return shape so callers
 * don't need to change.
 */
export async function checkRateLimit(
  _userId: string,
  _isPremium: boolean,
): Promise<{ canGenerate: boolean; remaining: number; dailyLimit: number }> {
  try {
    const status = await getAIUsageStatus('recipe_generation');
    return {
      canGenerate: status.canSend,
      remaining: status.dailyLimit - status.dailyUsage,
      dailyLimit: status.dailyLimit,
    };
  } catch {
    return { canGenerate: true, remaining: 1, dailyLimit: 1 };
  }
}

/**
 * Main function: Generate recipe from user inventory
 */
export async function generateRecipeFromInventory(
  params: AIRecipeGenerationParams,
): Promise<GeneratedRecipe> {
  const {
    userId,
    userInventory,
    difficultyLevel,
    isPremium,
    selectedSpirit,
    selectedPreparationMethod,
    selectedFlavorProfile,
  } = params;

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

    const prompt = buildPromptForDifficulty(
      difficultyLevel,
      userInventory,
      selectedSpirit,
      selectedPreparationMethod,
      selectedFlavorProfile,
    );

    // Route through the server-side proxy (handles auth, tier, rate limits)
    const result = await sendAIMessage(
      'recipe_generation',
      [{ role: 'user', content: prompt }],
      'You are an expert mixologist who creates cocktail recipes. You ALWAYS respond with valid JSON only, no additional text.',
    );

    if (!result.content) throw new Error('No response from AI');

    const recipeData = parseAIResponse(result.content);

    const uuid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const generatedRecipe: GeneratedRecipe = {
      id: uuid,
      ...recipeData,
      is_ai_generated: true,
      generated_by_user_id: userId,
      difficulty_level: difficultyLevel,
      generation_prompt: prompt,
      inventory_snapshot: userInventory,
      ai_model: result.model || 'gpt-4o',
      generation_timestamp: new Date().toISOString(),
    };

    await saveGeneratedRecipe(generatedRecipe);

    log.info('aiRecipeGenerationService', 'Recipe generated successfully', {
      recipeName: generatedRecipe.name,
    });
    return generatedRecipe;
  } catch (error: any) {
    log.error('aiRecipeGenerationService', 'Failed to generate recipe', error);

    if (error instanceof AIProxyRequestError) {
      if (error.isRateLimited) throw new Error('Daily recipe limit reached. Upgrade for more!');
      if (error.isTierBlocked) throw new Error('Recipe generation requires a higher tier.');
      if (error.isAuthError) throw new Error('Session expired. Please sign in again.');
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
      ingredients_structured: recipe.ingredients_structured ?? null,
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
