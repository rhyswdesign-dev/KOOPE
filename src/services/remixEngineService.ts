/**
 * Remix Engine — KOOPE PRO
 * Allows PRO users to:
 *   - Swap spirits while maintaining balance
 *   - Adjust sweetness/sourness/strength ratios
 *   - Get AI-assisted flavor correction suggestions
 *   - Create variations of existing recipes
 *
 * Core principle: cocktail balance follows ratio templates.
 *   - Sour: 2:1:3/4 (spirit : citrus : sweet)
 *   - Spirit-forward: 2:1 (spirit : modifier)
 *   - Highball: 1:3 (spirit : mixer)
 */

import { Recipe, Ingredient } from '../types/recipe';
import { Spirit } from '../types/userProfile';
import { FlavorVector, computeFlavorVector } from '../types/recipe';

// ============================================================================
// TYPES
// ============================================================================

export interface RemixResult {
  /** The remixed recipe */
  recipe: Recipe;
  /** What changed */
  changes: RemixChange[];
  /** New flavor vector after remix */
  flavorVector: FlavorVector;
  /** Balance assessment */
  balance: BalanceAssessment;
}

export interface RemixChange {
  type: 'swap' | 'adjust-ratio' | 'add' | 'remove';
  description: string;
  originalIngredient?: string;
  newIngredient?: string;
}

export interface BalanceAssessment {
  /** Overall balance score (0-100) */
  score: number;
  /** Is this recipe well-balanced? */
  isBalanced: boolean;
  /** Suggestions to improve balance */
  suggestions: string[];
  /** Ratio template this recipe follows */
  template: RatioTemplate | null;
}

export type RatioTemplate = 'sour' | 'spirit-forward' | 'highball' | 'tiki' | 'fizz' | 'custom';

/** Standard cocktail ratio templates */
const RATIO_TEMPLATES: Record<RatioTemplate, { spirit: number; citrus: number; sweet: number; mixer: number }> = {
  'sour':            { spirit: 2,   citrus: 0.75, sweet: 0.75, mixer: 0 },
  'spirit-forward':  { spirit: 2,   citrus: 0,    sweet: 0.25, mixer: 0.5 },
  'highball':        { spirit: 1.5, citrus: 0,    sweet: 0,    mixer: 4 },
  'tiki':            { spirit: 2,   citrus: 1,    sweet: 0.75, mixer: 1 },
  'fizz':            { spirit: 2,   citrus: 0.75, sweet: 0.75, mixer: 2 },
  'custom':          { spirit: 0,   citrus: 0,    sweet: 0,    mixer: 0 },
};

/** Spirit swap compatibility groups */
const SPIRIT_SWAP_GROUPS: Record<string, string[]> = {
  'whiskey':  ['bourbon', 'rye whiskey', 'scotch', 'irish whiskey', 'japanese whisky'],
  'rum':      ['white rum', 'dark rum', 'aged rum', 'spiced rum', 'cachaça'],
  'tequila':  ['tequila blanco', 'tequila reposado', 'mezcal'],
  'gin':      ['london dry gin', 'plymouth gin', 'old tom gin', 'genever'],
  'vodka':    ['vodka', 'potato vodka'],
  'brandy':   ['cognac', 'brandy', 'pisco', 'calvados', 'armagnac'],
};

/** Sweetener swap options */
const SWEETENER_SWAPS: Record<string, string[]> = {
  'simple syrup':     ['honey syrup', 'agave syrup', 'demerara syrup', 'maple syrup', 'rich simple syrup'],
  'honey syrup':      ['simple syrup', 'agave syrup'],
  'agave syrup':      ['simple syrup', 'honey syrup'],
  'grenadine':        ['raspberry syrup', 'pomegranate juice'],
  'triple sec':       ['cointreau', 'grand marnier', 'curaçao', 'orange liqueur'],
  'cointreau':        ['triple sec', 'grand marnier', 'orange liqueur'],
};

/** Citrus swap options */
const CITRUS_SWAPS: Record<string, string[]> = {
  'lime juice':       ['lemon juice'],
  'lemon juice':      ['lime juice'],
  'orange juice':     ['grapefruit juice', 'tangerine juice'],
  'grapefruit juice': ['orange juice'],
};

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Swap the base spirit in a recipe.
 * Adjusts modifiers to maintain balance with the new spirit.
 */
export function swapSpirit(
  recipe: Recipe,
  newSpirit: string,
  newSpiritType?: Spirit
): RemixResult {
  const remixed = deepCloneRecipe(recipe);
  const changes: RemixChange[] = [];

  // Find the primary spirit ingredient
  const spiritIndex = remixed.ingredients.findIndex(i =>
    i.category === 'spirit' || isSpirit(i.name)
  );

  if (spiritIndex === -1) {
    return {
      recipe: remixed,
      changes: [{ type: 'swap', description: 'No spirit found to swap' }],
      flavorVector: computeFlavorVector(remixed.ingredients),
      balance: assessBalance(remixed),
    };
  }

  const original = remixed.ingredients[spiritIndex].name;
  remixed.ingredients[spiritIndex] = {
    ...remixed.ingredients[spiritIndex],
    name: newSpirit,
  };

  if (newSpiritType) {
    remixed.baseSpirit = newSpiritType;
  }

  changes.push({
    type: 'swap',
    description: `Swapped ${original} for ${newSpirit}`,
    originalIngredient: original,
    newIngredient: newSpirit,
  });

  // Update title
  remixed.title = `${recipe.title} (${newSpirit} Remix)`;

  const flavorVector = computeFlavorVector(remixed.ingredients);
  const balance = assessBalance(remixed);

  return { recipe: remixed, changes, flavorVector, balance };
}

/**
 * Adjust the sweetness level of a recipe.
 * @param factor - 0.5 = half as sweet, 1.5 = 50% sweeter, etc.
 */
export function adjustSweetness(recipe: Recipe, factor: number): RemixResult {
  const remixed = deepCloneRecipe(recipe);
  const changes: RemixChange[] = [];

  for (let i = 0; i < remixed.ingredients.length; i++) {
    const ing = remixed.ingredients[i];
    if (isSweetener(ing.name)) {
      const adjusted = scaleAmount(ing.amount, factor);
      changes.push({
        type: 'adjust-ratio',
        description: `${factor > 1 ? 'Increased' : 'Decreased'} ${ing.name}: ${ing.amount} → ${adjusted}`,
        originalIngredient: `${ing.name} (${ing.amount})`,
        newIngredient: `${ing.name} (${adjusted})`,
      });
      remixed.ingredients[i] = { ...ing, amount: adjusted };
    }
  }

  if (changes.length === 0) {
    changes.push({ type: 'adjust-ratio', description: 'No sweeteners found to adjust' });
  }

  return {
    recipe: remixed,
    changes,
    flavorVector: computeFlavorVector(remixed.ingredients),
    balance: assessBalance(remixed),
  };
}

/**
 * Adjust the sourness/citrus level of a recipe.
 */
export function adjustSourness(recipe: Recipe, factor: number): RemixResult {
  const remixed = deepCloneRecipe(recipe);
  const changes: RemixChange[] = [];

  for (let i = 0; i < remixed.ingredients.length; i++) {
    const ing = remixed.ingredients[i];
    if (isCitrus(ing.name)) {
      const adjusted = scaleAmount(ing.amount, factor);
      changes.push({
        type: 'adjust-ratio',
        description: `${factor > 1 ? 'Increased' : 'Decreased'} ${ing.name}: ${ing.amount} → ${adjusted}`,
      });
      remixed.ingredients[i] = { ...ing, amount: adjusted };
    }
  }

  return {
    recipe: remixed,
    changes,
    flavorVector: computeFlavorVector(remixed.ingredients),
    balance: assessBalance(remixed),
  };
}

/**
 * Adjust the strength (spirit proportion) of a recipe.
 */
export function adjustStrength(recipe: Recipe, factor: number): RemixResult {
  const remixed = deepCloneRecipe(recipe);
  const changes: RemixChange[] = [];

  for (let i = 0; i < remixed.ingredients.length; i++) {
    const ing = remixed.ingredients[i];
    if (isSpirit(ing.name) || ing.category === 'spirit') {
      const adjusted = scaleAmount(ing.amount, factor);
      changes.push({
        type: 'adjust-ratio',
        description: `${factor > 1 ? 'Stronger' : 'Lighter'}: ${ing.name} ${ing.amount} → ${adjusted}`,
      });
      remixed.ingredients[i] = { ...ing, amount: adjusted };
    }
  }

  return {
    recipe: remixed,
    changes,
    flavorVector: computeFlavorVector(remixed.ingredients),
    balance: assessBalance(remixed),
  };
}

/**
 * Get swap suggestions for a specific ingredient.
 */
export function getSwapSuggestions(ingredientName: string): string[] {
  const lower = ingredientName.toLowerCase();

  // Check spirit groups
  for (const [, group] of Object.entries(SPIRIT_SWAP_GROUPS)) {
    if (group.some(s => lower.includes(s) || s.includes(lower))) {
      return group.filter(s => !lower.includes(s));
    }
  }

  // Check sweetener swaps
  for (const [key, swaps] of Object.entries(SWEETENER_SWAPS)) {
    if (lower.includes(key) || key.includes(lower)) {
      return swaps;
    }
  }

  // Check citrus swaps
  for (const [key, swaps] of Object.entries(CITRUS_SWAPS)) {
    if (lower.includes(key) || key.includes(lower)) {
      return swaps;
    }
  }

  return [];
}

/**
 * Assess the balance of a recipe based on ratio analysis.
 */
export function assessBalance(recipe: Recipe): BalanceAssessment {
  const categorized = categorizeIngredients(recipe.ingredients);
  const suggestions: string[] = [];

  // Detect ratio template
  const template = detectTemplate(recipe);

  if (!template || template === 'custom') {
    return {
      score: 70,
      isBalanced: true,
      suggestions: ['Custom recipe — balance depends on your taste'],
      template: 'custom',
    };
  }

  const ideal = RATIO_TEMPLATES[template];
  let score = 100;

  // Check spirit ratio
  if (ideal.spirit > 0 && categorized.spiritOz === 0) {
    score -= 30;
    suggestions.push('Missing base spirit');
  }

  // Check citrus ratio for sour-family
  if (ideal.citrus > 0) {
    const citrusRatio = categorized.spiritOz > 0
      ? categorized.citrusOz / categorized.spiritOz
      : 0;
    const idealRatio = ideal.citrus / ideal.spirit;

    if (Math.abs(citrusRatio - idealRatio) > 0.2) {
      score -= 15;
      if (citrusRatio < idealRatio) {
        suggestions.push('Could use more citrus for a balanced sour');
      } else {
        suggestions.push('A touch less citrus would improve balance');
      }
    }
  }

  // Check sweet ratio
  if (ideal.sweet > 0) {
    const sweetRatio = categorized.spiritOz > 0
      ? categorized.sweetOz / categorized.spiritOz
      : 0;
    const idealRatio = ideal.sweet / ideal.spirit;

    if (Math.abs(sweetRatio - idealRatio) > 0.2) {
      score -= 15;
      if (sweetRatio < idealRatio) {
        suggestions.push('Adding a bit more sweetener would improve balance');
      } else {
        suggestions.push('Slightly less sweetener for a drier profile');
      }
    }
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    isBalanced: score >= 70,
    suggestions,
    template,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function deepCloneRecipe(recipe: Recipe): Recipe {
  return {
    ...recipe,
    ingredients: recipe.ingredients.map(i => ({ ...i })),
    instructions: [...recipe.instructions],
    flavorProfiles: [...recipe.flavorProfiles],
    spiritsUsed: [...recipe.spiritsUsed],
    tags: [...recipe.tags],
  };
}

function isSpirit(name: string): boolean {
  const spirits = ['vodka', 'gin', 'rum', 'whiskey', 'bourbon', 'tequila', 'mezcal',
    'brandy', 'cognac', 'scotch', 'rye', 'pisco', 'cachaça'];
  const lower = name.toLowerCase();
  return spirits.some(s => lower.includes(s));
}

function isSweetener(name: string): boolean {
  const sweets = ['syrup', 'sugar', 'honey', 'agave', 'grenadine', 'orgeat',
    'triple sec', 'cointreau', 'grand marnier', 'liqueur', 'amaretto'];
  const lower = name.toLowerCase();
  return sweets.some(s => lower.includes(s));
}

function isCitrus(name: string): boolean {
  const citrus = ['lime juice', 'lemon juice', 'orange juice', 'grapefruit juice',
    'citrus', 'yuzu'];
  const lower = name.toLowerCase();
  return citrus.some(s => lower.includes(s));
}

function scaleAmount(amount: string, factor: number): string {
  const match = amount.match(/^([\d.\/]+)\s*(.*)/);
  if (!match) return amount;

  let numeric: number;
  const raw = match[1];
  if (raw.includes('/')) {
    const [num, den] = raw.split('/');
    numeric = parseInt(num) / parseInt(den);
  } else {
    numeric = parseFloat(raw);
  }

  if (isNaN(numeric)) return amount;

  const scaled = numeric * factor;
  const unit = match[2] || '';

  // Format nicely
  const rounded = Math.round(scaled * 4) / 4;
  if (rounded === 0.25) return `1/4 ${unit}`.trim();
  if (rounded === 0.5) return `1/2 ${unit}`.trim();
  if (rounded === 0.75) return `3/4 ${unit}`.trim();
  if (rounded % 1 === 0) return `${rounded} ${unit}`.trim();
  return `${rounded.toFixed(2)} ${unit}`.trim();
}

interface CategorizedAmounts {
  spiritOz: number;
  citrusOz: number;
  sweetOz: number;
  mixerOz: number;
}

function categorizeIngredients(ingredients: Ingredient[]): CategorizedAmounts {
  let spiritOz = 0, citrusOz = 0, sweetOz = 0, mixerOz = 0;

  for (const ing of ingredients) {
    const oz = parseOz(ing.amount);
    if (isSpirit(ing.name)) spiritOz += oz;
    else if (isCitrus(ing.name)) citrusOz += oz;
    else if (isSweetener(ing.name)) sweetOz += oz;
    else mixerOz += oz;
  }

  return { spiritOz, citrusOz, sweetOz, mixerOz };
}

function parseOz(amount: string): number {
  const match = amount.match(/^([\d.\/]+)/);
  if (!match) return 0;
  const raw = match[1];
  if (raw.includes('/')) {
    const [num, den] = raw.split('/');
    return parseInt(num) / parseInt(den);
  }
  return parseFloat(raw) || 0;
}

function detectTemplate(recipe: Recipe): RatioTemplate | null {
  if (recipe.recipeType === 'sour' || recipe.category === 'sour') return 'sour';
  if (recipe.recipeType === 'spirit-forward' || recipe.category === 'stirred') return 'spirit-forward';
  if (recipe.recipeType === 'highball' || recipe.category === 'built') return 'highball';
  if (recipe.category === 'tiki') return 'tiki';

  // Heuristic detection from ingredients
  const cat = categorizeIngredients(recipe.ingredients);
  if (cat.citrusOz > 0 && cat.sweetOz > 0 && cat.spiritOz > 0) return 'sour';
  if (cat.spiritOz > 0 && cat.mixerOz > cat.spiritOz * 2) return 'highball';
  if (cat.spiritOz > 0 && cat.citrusOz === 0 && cat.mixerOz < cat.spiritOz) return 'spirit-forward';

  return 'custom';
}
