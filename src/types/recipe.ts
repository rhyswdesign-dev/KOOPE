/**
 * Recipe Types with Enhanced Metadata for Personalization
 */

import { Spirit, FlavorProfile } from './userProfile';

export interface Recipe {
  // Core Identity
  id: string;
  title: string;
  name?: string; // Alias for title (for compatibility with RecipeCard)
  description: string;
  createdAt: Date;
  updatedAt: Date;

  // Recipe Content
  ingredients: Ingredient[];
  instructions: string[];
  garnish?: string;
  glassware?: Glassware;

  // Categorization
  category: RecipeCategory;
  difficulty: Difficulty;
  time?: string; // Formatted time string for display (e.g., "5 min")
  recipeType: 'cocktail' | 'mocktail' | 'spirit-forward' | 'highball' | 'sour' | 'other';

  // Personalization Metadata
  baseSpirit?: Spirit; // Primary spirit (vodka, gin, rum, etc.)
  spiritsUsed: Spirit[]; // All spirits in the recipe
  flavorProfiles: FlavorProfile[]; // Flavor characteristics
  abv: number; // Alcohol by volume percentage (0-100)
  complexity: number; // 0-1 scale (simple to complex)

  // Preparation Details
  preparationTime: number; // minutes
  servings: number;
  tools: BarTool[];

  // Media & Sources
  image?: string; // Alias for imageUrl (for compatibility with RecipeCard)
  imageUrl?: string;
  sourceUrl?: string;
  videoUrl?: string;

  // Tags & Classification
  tags: string[];
  occasion?: Occasion[]; // When to serve (brunch, dinner party, etc.)
  season?: Season[]; // Best seasons for this drink
  timeOfDay?: TimeOfDay[]; // Morning, afternoon, evening

  // User Data
  createdBy?: string; // User ID
  isPublic: boolean;
  likes?: number;
  saves?: number;

  // Subscription Gating
  requiresPro?: boolean; // Requires KOOPE PRO subscription to view

  // Batch & Scaling (KOOPE+ hosting features)
  batchMultiplier?: number; // Default multiplier for batch mode (e.g., 4 for punch bowls)
  batchInstructions?: string[]; // Batch-specific prep steps (differs from single-serve)
  ratios?: RecipeRatio[]; // Structured ratios for scaling and remix engine
  ratioEstimated?: boolean; // True when amounts were inferred from template defaults
  ratioProfile?: any; // Stored ratio metadata for balance editing
  ratioEditorState?: any; // Last slider state from guided balance editor

  // Flavor Intelligence (KOOPE+ Taste Match, PRO Taste Graph)
  flavorVector?: FlavorVector; // Numeric intensity per flavor (0-1 scale, computed)
  ingredientCount?: number; // Total ingredient count (for KOOPE+ "5 or fewer" filter)
  sugarLevel?: 'none' | 'low' | 'medium' | 'high'; // For KOOPE+ low-sugar filter

  // Nutrition (optional)
  nutrition?: NutritionInfo;

  // Historical Context (for classic cocktails)
  history?: CocktailHistory;
}

export interface RecipeRatio {
  ingredientIndex: number; // Index into ingredients[]
  parts: number; // Ratio in parts (e.g., 2 parts spirit, 1 part citrus)
}

export type FlavorVector = Record<FlavorProfile, number>; // 0-1 intensity per flavor

// Supporting Types

export interface Ingredient {
  name: string;
  amount: string;
  unit?: string;
  notes?: string;
  category?: IngredientCategory; // For grouping (spirits, mixers, garnish)
}

export type IngredientCategory = 'spirit' | 'liqueur' | 'mixer' | 'citrus' | 'syrup' | 'bitters' | 'garnish' | 'other';

export type RecipeCategory =
  | 'classic'        // Classic cocktails (Old Fashioned, Manhattan, etc.)
  | 'modern'         // Modern creations
  | 'tiki'           // Tiki cocktails
  | 'sour'           // Sour family
  | 'stirred'        // Stirred cocktails
  | 'shaken'         // Shaken cocktails
  | 'built'          // Built in glass
  | 'blended'        // Blended drinks
  | 'shot'           // Shots
  | 'punch'          // Punches
  | 'mocktail'       // Non-alcoholic
  | 'educational';   // For learning modules

export type Difficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type Glassware =
  | 'rocks'          // Old fashioned glass
  | 'highball'       // Collins/highball glass
  | 'coupe'          // Coupe glass
  | 'martini'        // Martini/cocktail glass
  | 'nick-and-nora'  // Nick & Nora glass
  | 'wine'           // Wine glass
  | 'champagne'      // Champagne flute
  | 'hurricane'      // Hurricane glass
  | 'tiki-mug'       // Tiki mug
  | 'shot'           // Shot glass
  | 'mug'            // Mug (for hot drinks)
  | 'punch-bowl'     // Punch bowl
  | 'other';

export type BarTool =
  | 'jigger'
  | 'shaker'         // Boston or cobbler
  | 'barspoon'
  | 'strainer'       // Hawthorne strainer
  | 'fine-strainer'  // Fine mesh strainer
  | 'muddler'
  | 'citrus-press'
  | 'peeler'         // For citrus peels
  | 'knife'
  | 'grater'         // For nutmeg, etc.
  | 'blender'
  | 'torch'          // For flaming garnishes
  | 'none';

export type Occasion =
  | 'everyday'
  | 'brunch'
  | 'dinner-party'
  | 'date-night'
  | 'celebration'
  | 'holiday'
  | 'game-day'
  | 'outdoor'
  | 'formal';

export type Season = 'spring' | 'summer' | 'fall' | 'winter' | 'year-round';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'late-night' | 'any';

export interface NutritionInfo {
  calories?: number;
  sugar?: number; // grams
  carbs?: number; // grams
}

export interface CocktailHistory {
  era?: string; // e.g., "Pre-Prohibition", "Golden Age", "Tiki Renaissance", "Modern Classic"
  year?: number; // Year of creation (e.g., 1915)
  yearEstimate?: string; // If exact year unknown (e.g., "Early 1900s", "1920s")
  origin?: string; // Location where created (e.g., "New York", "Havana, Cuba")
  creator?: string; // Bartender/person who created it
  establishment?: string; // Bar/hotel where created
  story?: string; // Main historical narrative (2-3 paragraphs)
  notableFigures?: string[]; // Famous people associated with the drink
  culturalContext?: string; // Historical/cultural significance
  evolution?: string; // How the recipe changed over time
  trivia?: string[]; // Fun facts ("Did You Know?")
}

// Recipe with user-specific data (for displaying in feeds)
export interface RecipeWithUserData extends Recipe {
  isSaved: boolean;
  isFavorite: boolean;
  userRating?: number; // 1-5 stars
  userFeedback?: 'loved' | 'liked' | 'disliked' | 'skipped';
  recommendationScore?: number; // 0-100, calculated based on user preferences
  tasteMatchPercent?: number; // 0-100, how well this recipe matches user's taste profile
}

// Recipe filters for personalized queries
export interface RecipeFilters {
  spirits?: Spirit[];
  flavorProfiles?: FlavorProfile[];
  difficulty?: Difficulty[];
  abvRange?: { min: number; max: number };
  category?: RecipeCategory[];
  occasion?: Occasion[];
  season?: Season[];
  timeOfDay?: TimeOfDay[];
  preparationTimeMax?: number; // minutes
  requiredTools?: BarTool[];
  excludeRecipeIds?: string[]; // For filtering out disliked recipes
  // KOOPE+ advanced filters
  maxIngredients?: number; // e.g., 5 for "5 or fewer" filter
  sugarLevel?: ('none' | 'low')[]; // Low-sugar filter
  recipeType?: ('spirit-forward' | 'cocktail' | 'mocktail' | 'highball' | 'sour' | 'other')[]; // Spirit-forward filter
}

function getIngredientName(ingredient: Ingredient | string | null | undefined): string {
  if (!ingredient) return '';
  if (typeof ingredient === 'string') return ingredient.toLowerCase();
  if (typeof ingredient.name === 'string') return ingredient.name.toLowerCase();
  return '';
}

// Helper function to calculate ABV for a recipe
export function calculateRecipeABV(ingredients: Ingredient[]): number {
  // Simplified ABV calculation
  // In reality, this would need spirit ABV data and total volume calculations
  let totalAlcohol = 0;
  let totalVolume = 0;

  ingredients.forEach(ingredient => {
    const name = getIngredientName(ingredient);
    const amount = parseFloat((ingredient as any)?.amount) || 0;

    // Estimate ABV based on ingredient type
    let ingredientABV = 0;
    if (name.includes('vodka') || name.includes('gin') || name.includes('rum') ||
        name.includes('whiskey') || name.includes('tequila') || name.includes('brandy')) {
      ingredientABV = 40; // Standard spirits
    } else if (name.includes('liqueur') || name.includes('vermouth') || name.includes('aperol')) {
      ingredientABV = 20; // Liqueurs and fortified wines
    } else if (name.includes('wine') || name.includes('champagne')) {
      ingredientABV = 12; // Wine
    } else if (name.includes('beer')) {
      ingredientABV = 5; // Beer
    }

    totalAlcohol += amount * (ingredientABV / 100);
    totalVolume += amount;
  });

  if (totalVolume === 0) return 0;
  return (totalAlcohol / totalVolume) * 100;
}

// Helper function to determine difficulty based on recipe characteristics
export function calculateDifficulty(recipe: Partial<Recipe>): Difficulty {
  let score = 0;

  // More ingredients = harder
  if (recipe.ingredients && recipe.ingredients.length > 5) score += 1;
  if (recipe.ingredients && recipe.ingredients.length > 8) score += 1;

  // More steps = harder
  if (recipe.instructions && recipe.instructions.length > 5) score += 1;

  // Complex tools = harder
  const complexTools = ['fine-strainer', 'torch', 'blender'];
  if (recipe.tools?.some(tool => complexTools.includes(tool))) score += 1;

  // High complexity rating
  if (recipe.complexity && recipe.complexity > 0.7) score += 1;

  if (score <= 1) return 'beginner';
  if (score <= 2) return 'intermediate';
  if (score <= 4) return 'advanced';
  return 'expert';
}

// Helper function to extract primary spirit from ingredients
export function extractBaseSpirit(ingredients: Ingredient[]): Spirit | undefined {
  const spiritKeywords: { [key in Spirit]?: string[] } = {
    vodka: ['vodka'],
    gin: ['gin'],
    rum: ['rum'],
    tequila: ['tequila', 'mezcal'],
    whiskey: ['whiskey', 'whisky', 'bourbon', 'rye', 'scotch'],
    brandy: ['brandy', 'cognac', 'armagnac'],
    liqueurs: ['liqueur', 'cordial'],
  };

  // Look for the first spirit ingredient
  for (const ingredient of ingredients) {
    const name = getIngredientName(ingredient);

    for (const [spirit, keywords] of Object.entries(spiritKeywords)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        return spirit as Spirit;
      }
    }
  }

  return undefined;
}

// Helper function to extract all spirits from ingredients
export function extractAllSpirits(ingredients: Ingredient[]): Spirit[] {
  const spiritKeywords: { [key in Spirit]?: string[] } = {
    vodka: ['vodka'],
    gin: ['gin'],
    rum: ['rum'],
    tequila: ['tequila', 'mezcal'],
    whiskey: ['whiskey', 'whisky', 'bourbon', 'rye', 'scotch'],
    brandy: ['brandy', 'cognac', 'armagnac'],
    liqueurs: ['liqueur', 'cordial', 'triple sec', 'amaretto', 'bailey'],
  };

  const foundSpirits = new Set<Spirit>();

  for (const ingredient of ingredients) {
    const name = getIngredientName(ingredient);

    for (const [spirit, keywords] of Object.entries(spiritKeywords)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        foundSpirits.add(spirit as Spirit);
      }
    }
  }

  return Array.from(foundSpirits);
}

// Helper to determine flavor profiles from ingredients
export function extractFlavorProfiles(ingredients: Ingredient[]): FlavorProfile[] {
  const flavorKeywords: { [key in FlavorProfile]?: string[] } = {
    citrus: ['lemon', 'lime', 'orange', 'grapefruit', 'citrus'],
    herbal: ['basil', 'mint', 'rosemary', 'thyme', 'sage', 'herbal'],
    bitter: ['campari', 'aperol', 'fernet', 'bitter', 'amaro'],
    sweet: ['sugar', 'syrup', 'honey', 'sweet', 'liqueur'],
    smoky: ['mezcal', 'scotch', 'smoke', 'charred'],
    floral: ['elderflower', 'lavender', 'rose', 'hibiscus', 'floral'],
    spiced: ['cinnamon', 'ginger', 'nutmeg', 'clove', 'spice'],
  };

  const foundProfiles = new Set<FlavorProfile>();

  for (const ingredient of ingredients) {
    const name = getIngredientName(ingredient);

    for (const [profile, keywords] of Object.entries(flavorKeywords)) {
      if (keywords.some(keyword => name.includes(keyword))) {
        foundProfiles.add(profile as FlavorProfile);
      }
    }
  }

  return Array.from(foundProfiles);
}

/**
 * Compute a numeric flavor vector for a recipe.
 * Each flavor gets an intensity score (0-1) based on how many
 * matching ingredients appear relative to total ingredient count.
 * Used for Taste Match % calculation in KOOPE+.
 */
export function computeFlavorVector(ingredients: Ingredient[]): FlavorVector {
  const allFlavors: FlavorProfile[] = ['citrus', 'herbal', 'bitter', 'sweet', 'smoky', 'floral', 'spiced'];

  const flavorKeywords: { [key in FlavorProfile]: string[] } = {
    citrus: ['lemon', 'lime', 'orange', 'grapefruit', 'citrus', 'yuzu', 'kumquat'],
    herbal: ['basil', 'mint', 'rosemary', 'thyme', 'sage', 'herbal', 'absinthe', 'chartreuse'],
    bitter: ['campari', 'aperol', 'fernet', 'bitter', 'amaro', 'angostura', 'gentian'],
    sweet: ['sugar', 'syrup', 'honey', 'sweet', 'liqueur', 'agave', 'grenadine', 'maraschino'],
    smoky: ['mezcal', 'scotch', 'smoke', 'charred', 'lapsang', 'islay'],
    floral: ['elderflower', 'lavender', 'rose', 'hibiscus', 'floral', 'violet', 'chamomile'],
    spiced: ['cinnamon', 'ginger', 'nutmeg', 'clove', 'spice', 'allspice', 'cardamom', 'pepper'],
  };

  const vector = {} as FlavorVector;
  const totalIngredients = Math.max(1, ingredients.length);

  for (const flavor of allFlavors) {
    const keywords = flavorKeywords[flavor];
    let matchCount = 0;

    for (const ingredient of ingredients) {
      const name = getIngredientName(ingredient);
      if (keywords.some(keyword => name.includes(keyword))) {
        matchCount++;
      }
    }

    // Intensity = ratio of matching ingredients, scaled so 1 match in 3-ingredient drink
    // scores higher than 1 match in 10-ingredient drink
    vector[flavor] = Math.min(1, (matchCount / totalIngredients) * 3);
  }

  return vector;
}

/**
 * Compute ingredient count for a recipe.
 * Used for the KOOPE+ "5 or fewer ingredients" filter.
 */
export function getIngredientCount(recipe: Recipe): number {
  return recipe.ingredientCount ?? recipe.ingredients.length;
}

/**
 * Estimate sugar level from ingredients.
 * Used for the KOOPE+ low-sugar filter.
 */
export function estimateSugarLevel(ingredients: Ingredient[]): 'none' | 'low' | 'medium' | 'high' {
  const sweetKeywords = ['sugar', 'syrup', 'honey', 'agave', 'grenadine', 'liqueur', 'sweet', 'juice', 'cola', 'soda'];

  let sweetCount = 0;
  for (const ingredient of ingredients) {
    const name = getIngredientName(ingredient);
    if (sweetKeywords.some(keyword => name.includes(keyword))) {
      sweetCount++;
    }
  }

  if (sweetCount === 0) return 'none';
  if (sweetCount === 1) return 'low';
  if (sweetCount === 2) return 'medium';
  return 'high';
}
