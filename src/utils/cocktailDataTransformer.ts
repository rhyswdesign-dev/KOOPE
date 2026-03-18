/**
 * Cocktail Data Transformer
 * Converts centralized cocktail data to Old Fashioned template format
 */

import { ALL_COCKTAILS } from '../data/cocktails';
import { formatIngredientDisplay, ingredientListToSearchText } from './ingredientFormatting';

export interface DetailedCocktailIngredient {
  name: string;
  note?: string;
}

export interface DetailedCocktail {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  img: string;
  difficulty: string;
  time: string;
  ingredients: DetailedCocktailIngredient[];
  instructions: string[];
  tips: string[];
  glassware: string;
  kitAvailable: boolean;
  kitPrice?: number;
  rating?: number;
}

/**
 * Transform basic cocktail data to detailed template format
 */
export function transformCocktailToDetailFormat(cocktail: any): DetailedCocktail {
  // Transform ingredients from strings to objects with notes
  const transformedIngredients: DetailedCocktailIngredient[] = cocktail.ingredients?.map((ingredient: any) => {
    const formatted = formatIngredientDisplay(ingredient);
    return {
      name: formatted.name,
      note: formatted.note || generateIngredientNote(formatted.name)
    };
  }) || [];

  return {
    id: cocktail.id,
    title: cocktail.name || cocktail.title,
    subtitle: cocktail.subtitle || `${cocktail.difficulty || 'Medium'} • ${getBaseSpirit(cocktail)}-based`,
    description: cocktail.description || generateDescription(cocktail),
    img: cocktail.image || cocktail.img || getDefaultImage(cocktail),
    difficulty: cocktail.difficulty || 'Medium',
    time: cocktail.time || '3 min',
    ingredients: transformedIngredients,
    instructions: cocktail.instructions || generateInstructions(cocktail),
    tips: generateTips(cocktail),
    glassware: generateGlassware(cocktail),
    kitAvailable: true, // Enable shopping cart for all transformed cocktails
    kitPrice: undefined,
    rating: cocktail.rating
  };
}

/**
 * Generate ingredient notes based on ingredient name
 */
function generateIngredientNote(ingredientName: string): string | undefined {
  const name = ingredientName.toLowerCase();

  // Spirits
  if (name.includes('bourbon')) return 'High-quality bourbon preferred';
  if (name.includes('rye')) return 'Traditional choice for this cocktail';
  if (name.includes('whiskey')) return 'Choose quality whiskey for best results';
  if (name.includes('gin')) return 'London Dry gin recommended';
  if (name.includes('vodka')) return 'Premium vodka makes a difference';
  if (name.includes('rum')) return 'Quality rum essential';
  if (name.includes('tequila')) return '100% agave tequila preferred';

  // Liqueurs & Modifiers
  if (name.includes('vermouth')) return 'Use fresh vermouth for best flavor';
  if (name.includes('campari')) return 'Italian bitter aperitif';
  if (name.includes('chartreuse')) return 'French herbal liqueur';
  if (name.includes('cointreau') || name.includes('triple sec')) return 'Orange liqueur';

  // Fresh ingredients
  if (name.includes('lime juice')) return 'Freshly squeezed';
  if (name.includes('lemon juice')) return 'Freshly squeezed';
  if (name.includes('orange juice')) return 'Fresh preferred';
  if (name.includes('simple syrup')) return 'Can make at home: 1:1 sugar and water';

  // Bitters
  if (name.includes('angostura')) return 'Classic aromatic bitters';
  if (name.includes('peychaud')) return 'New Orleans-style bitters';
  if (name.includes('bitters')) return 'Essential for flavor balance';

  // Garnishes
  if (name.includes('peel')) return 'Express oils over drink';
  if (name.includes('twist')) return 'For garnish and aroma';
  if (name.includes('cherry')) return 'Maraschino preferred';
  if (name.includes('olive')) return 'For classic garnish';

  return undefined;
}

/**
 * Generate description if missing
 */
function generateDescription(cocktail: any): string {
  const base = getBaseSpirit(cocktail);
  const era = cocktail.era ? ` from the ${cocktail.era} era` : '';

  return cocktail.description ||
    `A ${cocktail.difficulty?.toLowerCase() || 'classic'} ${base}-based cocktail${era}. ${cocktail.subtitle || 'A timeless drink with balanced flavors.'} Perfect for any occasion.`;
}

/**
 * Get base spirit from cocktail data
 */
function getBaseSpirit(cocktail: any): string {
  if (cocktail.base) return cocktail.base;

  const name = cocktail.name?.toLowerCase() || '';
  const ingredients = ingredientListToSearchText(cocktail.ingredients);

  if (name.includes('whiskey') || ingredients.includes('whiskey') || ingredients.includes('bourbon') || ingredients.includes('rye')) return 'whiskey';
  if (name.includes('gin') || ingredients.includes('gin')) return 'gin';
  if (name.includes('vodka') || ingredients.includes('vodka')) return 'vodka';
  if (name.includes('rum') || ingredients.includes('rum')) return 'rum';
  if (name.includes('tequila') || ingredients.includes('tequila')) return 'tequila';
  if (ingredients.includes('brandy') || ingredients.includes('cognac')) return 'brandy';

  return 'spirit';
}

/**
 * Generate instructions if missing
 */
function generateInstructions(cocktail: any): string[] {
  if (cocktail.instructions && cocktail.instructions.length > 0) {
    return cocktail.instructions;
  }

  // Generate basic instructions based on cocktail type
  const base = getBaseSpirit(cocktail);
  const hasVermouth = cocktail.ingredients?.some((ing: string) => ing.toLowerCase().includes('vermouth'));
  const hasCitrus = cocktail.ingredients?.some((ing: string) =>
    ing.toLowerCase().includes('lime') || ing.toLowerCase().includes('lemon')
  );

  if (hasVermouth) {
    // Stirred cocktail
    return [
      'Add all ingredients to mixing glass with ice',
      'Stir until well-chilled (about 30 seconds)',
      'Strain into chilled glass',
      'Garnish as specified'
    ];
  } else if (hasCitrus) {
    // Shaken cocktail
    return [
      'Add all ingredients to shaker with ice',
      'Shake vigorously for 10-15 seconds',
      'Strain into glass over fresh ice',
      'Garnish as specified'
    ];
  } else {
    // Built cocktail
    return [
      'Add ingredients to glass over ice',
      'Stir gently to combine',
      'Garnish as specified'
    ];
  }
}

/**
 * Generate pro tips
 */
function generateTips(cocktail: any): string[] {
  const tips: string[] = [];
  const base = getBaseSpirit(cocktail);
  const ingredients = ingredientListToSearchText(cocktail.ingredients);

  // Base spirit tips
  if (base === 'whiskey') {
    tips.push('Quality whiskey makes a significant difference in this cocktail');
  }
  if (base === 'gin') {
    tips.push('London Dry gin provides the best botanical balance');
  }

  // Ingredient-specific tips
  if (ingredients.includes('vermouth')) {
    tips.push('Use fresh vermouth - store in refrigerator after opening');
  }
  if (ingredients.includes('citrus') || ingredients.includes('lime') || ingredients.includes('lemon')) {
    tips.push('Always use fresh citrus juice for best flavor');
  }
  if (ingredients.includes('simple syrup')) {
    tips.push('Make simple syrup at home: equal parts sugar and hot water');
  }
  if (ingredients.includes('bitters')) {
    tips.push('A few dashes of bitters go a long way - start with less');
  }

  // Technique tips
  const hasVermouth = ingredients.includes('vermouth');
  const hasCitrus = ingredients.includes('lime') || ingredients.includes('lemon');

  if (hasVermouth && !hasCitrus) {
    tips.push('Stir, don\'t shake - maintains clarity and texture');
  } else if (hasCitrus) {
    tips.push('Shake with ice to properly integrate citrus');
  }

  // Ice and dilution
  tips.push('Use quality ice for better dilution and temperature control');

  return tips.slice(0, 3); // Limit to 3 tips max
}

/**
 * Generate glassware recommendation
 */
function generateGlassware(cocktail: any): string {
  if (cocktail.glassware) return cocktail.glassware;

  const ingredients = ingredientListToSearchText(cocktail.ingredients);
  const name = cocktail.name?.toLowerCase() || '';

  // Specific cocktail types
  if (name.includes('martini')) return 'Coupe Glass';
  if (name.includes('margarita')) return 'Margarita Glass';
  if (name.includes('manhattan')) return 'Coupe Glass';
  if (name.includes('old fashioned')) return 'Rocks Glass';
  if (name.includes('negroni')) return 'Rocks Glass';
  if (name.includes('mule')) return 'Copper Mug';

  // By preparation method
  const hasVermouth = ingredients.includes('vermouth');
  const hasCitrus = ingredients.includes('lime') || ingredients.includes('lemon');
  const hasJuice = ingredients.includes('juice');
  const hasSoda = ingredients.includes('soda') || ingredients.includes('tonic') || ingredients.includes('ginger beer');

  if (hasVermouth && !hasCitrus) return 'Coupe Glass';
  if (hasSoda) return 'Highball Glass';
  if (hasJuice || hasCitrus) return 'Coupe Glass';

  return 'Rocks Glass'; // Default
}

/**
 * Get default image based on cocktail type
 */
function getDefaultImage(cocktail: any): string {
  const base = getBaseSpirit(cocktail);

  const images = {
    whiskey: 'https://images.unsplash.com/photo-1580424805313-04ac2b1fef66?q=80&w=1200&auto=format&fit=crop',
    gin: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    vodka: 'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?q=80&w=1200&auto=format&fit=crop',
    rum: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    tequila: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=1200&auto=format&fit=crop',
    brandy: 'https://images.unsplash.com/photo-1580424805313-04ac2b1fef66?q=80&w=1200&auto=format&fit=crop'
  };

  return images[base as keyof typeof images] || images.whiskey;
}

/**
 * Get all cocktails transformed to detailed format
 */
export function getAllDetailedCocktails(): Record<string, DetailedCocktail> {
  const detailedCocktails: Record<string, DetailedCocktail> = {};

  ALL_COCKTAILS.forEach(cocktail => {
    detailedCocktails[cocktail.id] = transformCocktailToDetailFormat(cocktail);
  });

  return detailedCocktails;
}

/**
 * Get specific cocktail in detailed format
 */
export function getDetailedCocktail(id: string): DetailedCocktail | null {
  const cocktail = ALL_COCKTAILS.find(c => c.id === id);
  if (!cocktail) return null;

  return transformCocktailToDetailFormat(cocktail);
}
