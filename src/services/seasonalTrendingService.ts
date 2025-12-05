/**
 * SEASONAL TRENDING SERVICE
 * Phase 2 Enhancement #5
 *
 * Categorizes cocktails by season and identifies trending drinks
 * based on time of year, ingredients, and flavor profiles.
 */

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export interface SeasonalMetadata {
  seasons: Season[];
  isTrending: boolean;
  trendingReason?: string;
}

/**
 * Get current season based on month
 */
export function getCurrentSeason(): Season {
  const month = new Date().getMonth(); // 0-11

  if (month >= 2 && month <= 4) return 'spring'; // Mar, Apr, May
  if (month >= 5 && month <= 7) return 'summer'; // Jun, Jul, Aug
  if (month >= 8 && month <= 10) return 'fall'; // Sep, Oct, Nov
  return 'winter'; // Dec, Jan, Feb
}

/**
 * Seasonal cocktail mappings based on ingredients and flavor profiles
 * These are manually curated for the best seasonal experience
 */
const SEASONAL_COCKTAILS: Record<string, Season[]> = {
  // SUMMER (refreshing, citrus, light, tropical)
  'margarita': ['spring', 'summer'],
  'daiquiri': ['spring', 'summer'],
  'mojito': ['spring', 'summer'],
  'aperol-spritz': ['spring', 'summer'],
  'paloma': ['spring', 'summer'],
  'tom-collins': ['spring', 'summer'],
  'gin-tonic': ['spring', 'summer'],
  'moscow-mule': ['spring', 'summer'],
  'pina-colada': ['summer'],
  'mai-tai': ['summer'],
  'dark-and-stormy': ['summer'],
  'caipirinha': ['summer'],
  'southside': ['summer'],
  'pimms-cup': ['summer'],

  // FALL (apple, spice, maple, warming)
  'whiskey-sour': ['fall', 'winter'],
  'old-fashioned': ['fall', 'winter'],
  'manhattan': ['fall', 'winter'],
  'boulevardier': ['fall', 'winter'],
  'negroni': ['spring', 'fall'],
  'sazerac': ['fall', 'winter'],
  'paper-plane': ['fall'],
  'autumn-old-fashioned': ['fall'],
  'apple-cider-mule': ['fall'],

  // WINTER (rich, creamy, chocolate, warming spirits)
  'espresso-martini': ['fall', 'winter'],
  'irish-coffee': ['winter'],
  'hot-toddy': ['winter'],
  'eggnog': ['winter'],
  'brandy-alexander': ['winter'],
  'white-russian': ['winter'],
  'hot-buttered-rum': ['winter'],
  'mulled-wine': ['winter'],

  // SPRING (floral, light, fresh, botanical)
  'french-75': ['spring', 'summer'],
  'bee-knees': ['spring', 'summer'],
  'aviation': ['spring'],
  'elderflower-spritz': ['spring', 'summer'],
  'corpse-reviver-2': ['spring'],
  'vesper': ['spring', 'fall'],
};

/**
 * Ingredient-based seasonal detection
 * Automatically categorizes cocktails by their ingredients
 */
const SEASONAL_INGREDIENTS: Record<Season, string[]> = {
  spring: ['elderflower', 'strawberry', 'rhubarb', 'mint', 'basil', 'cucumber', 'rose', 'lavender'],
  summer: ['watermelon', 'pineapple', 'coconut', 'lime', 'lemon', 'grapefruit', 'mango', 'passionfruit', 'citrus'],
  fall: ['apple', 'pear', 'cinnamon', 'maple', 'fig', 'pomegranate', 'cranberry', 'spice', 'nutmeg'],
  winter: ['chocolate', 'coffee', 'cream', 'eggnog', 'brandy', 'cognac', 'hot', 'warm', 'cacao', 'vanilla'],
};

/**
 * Determine which seasons a cocktail fits based on its ingredients
 */
function detectSeasonsByIngredients(cocktailName: string, ingredients: string[]): Season[] {
  const seasons = new Set<Season>();
  const ingredientsLower = ingredients.join(' ').toLowerCase();
  const nameLower = cocktailName.toLowerCase();

  // Check each season's ingredients
  for (const [season, seasonalIngredients] of Object.entries(SEASONAL_INGREDIENTS)) {
    for (const ingredient of seasonalIngredients) {
      if (ingredientsLower.includes(ingredient) || nameLower.includes(ingredient)) {
        seasons.add(season as Season);
        break;
      }
    }
  }

  // Default to year-round if no seasonal ingredients detected
  if (seasons.size === 0) {
    return ['spring', 'summer', 'fall', 'winter'];
  }

  return Array.from(seasons);
}

/**
 * Get seasonal metadata for a cocktail
 */
export function getSeasonalMetadata(
  cocktailId: string,
  cocktailName: string,
  ingredients: string[]
): SeasonalMetadata {
  const currentSeason = getCurrentSeason();

  // Check if manually categorized
  let seasons = SEASONAL_COCKTAILS[cocktailId];

  // If not manually categorized, detect from ingredients
  if (!seasons) {
    seasons = detectSeasonsByIngredients(cocktailName, ingredients);
  }

  // Determine if trending (in season)
  const isTrending = seasons.includes(currentSeason);

  // Generate trending reason
  let trendingReason: string | undefined;
  if (isTrending) {
    trendingReason = getTrendingReason(currentSeason, cocktailName, ingredients);
  }

  return {
    seasons,
    isTrending,
    trendingReason,
  };
}

/**
 * Generate contextual trending reason based on season
 */
function getTrendingReason(season: Season, cocktailName: string, ingredients: string[]): string {
  const ingredientsLower = ingredients.join(' ').toLowerCase();
  const nameLower = cocktailName.toLowerCase();

  // Specific ingredient mentions
  if (season === 'spring') {
    if (ingredientsLower.includes('elderflower')) return 'Perfect for spring with elderflower';
    if (ingredientsLower.includes('strawberry')) return 'Fresh spring strawberries';
    if (ingredientsLower.includes('mint') || ingredientsLower.includes('basil')) return 'Light & refreshing for spring';
    return 'Trending this spring';
  }

  if (season === 'summer') {
    if (ingredientsLower.includes('watermelon')) return 'Summer refreshment';
    if (ingredientsLower.includes('coconut') || ingredientsLower.includes('pineapple')) return 'Tropical summer vibes';
    if (ingredientsLower.includes('citrus') || ingredientsLower.includes('lime')) return 'Citrusy & perfect for summer';
    return 'Trending this summer';
  }

  if (season === 'fall') {
    if (ingredientsLower.includes('apple') || nameLower.includes('apple')) return 'Fall apple harvest';
    if (ingredientsLower.includes('cinnamon') || ingredientsLower.includes('spice')) return 'Warm fall spices';
    if (ingredientsLower.includes('maple')) return 'Cozy fall flavors';
    if (ingredientsLower.includes('whiskey') || ingredientsLower.includes('bourbon')) return 'Warming whiskey for fall';
    return 'Trending this fall';
  }

  if (season === 'winter') {
    if (nameLower.includes('hot') || ingredientsLower.includes('hot')) return 'Warm winter drink';
    if (ingredientsLower.includes('chocolate') || ingredientsLower.includes('coffee')) return 'Cozy winter flavors';
    if (ingredientsLower.includes('cream') || ingredientsLower.includes('eggnog')) return 'Rich & indulgent for winter';
    return 'Trending this winter';
  }

  return `Trending this ${season}`;
}

/**
 * Filter cocktails by season
 */
export function filterCocktailsBySeason(
  cocktails: Array<{ id: string; name: string; ingredients: string[] }>,
  season: Season
): Array<{ id: string; name: string; ingredients: string[]; trendingReason?: string }> {
  return cocktails
    .map(cocktail => {
      const metadata = getSeasonalMetadata(cocktail.id, cocktail.name, cocktail.ingredients);

      if (metadata.seasons.includes(season)) {
        return {
          ...cocktail,
          trendingReason: metadata.trendingReason,
        };
      }

      return null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
}

/**
 * Get trending cocktails for current season
 */
export function getTrendingCocktails(
  cocktails: Array<{ id: string; name: string; ingredients: string[] }>,
  limit: number = 8
): Array<{ id: string; name: string; ingredients: string[]; trendingReason?: string }> {
  const currentSeason = getCurrentSeason();
  const seasonalCocktails = filterCocktailsBySeason(cocktails, currentSeason);

  // Return limited set
  return seasonalCocktails.slice(0, limit);
}

/**
 * Get season display name
 */
export function getSeasonDisplayName(season: Season): string {
  const names: Record<Season, string> = {
    spring: 'Spring',
    summer: 'Summer',
    fall: 'Fall',
    winter: 'Winter',
  };
  return names[season];
}

/**
 * Get season emoji
 */
export function getSeasonEmoji(season: Season): string {
  const emojis: Record<Season, string> = {
    spring: '🌸',
    summer: '☀️',
    fall: '🍂',
    winter: '❄️',
  };
  return emojis[season];
}
