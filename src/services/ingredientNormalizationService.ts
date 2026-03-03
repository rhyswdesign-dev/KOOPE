/**
 * Ingredient Normalization Service — P4 Infrastructure
 *
 * Maps freeform ingredient strings to canonical IDs for reliable matching.
 * Solves the "rum" matching "rumchata" problem and enables:
 *   - Reliable inventory-to-recipe matching
 *   - Substitution-aware comparisons
 *   - Category inference from ingredient names
 *   - Canonical display names
 *
 * Architecture:
 *   - Static canonical database (fast, no network)
 *   - Alias map for common variations
 *   - Fuzzy matching fallback for unknowns
 *   - Substitution groups for "close enough" matching
 */

import { BottleCategory } from '../types/database';

// ============================================================================
// TYPES
// ============================================================================

export interface CanonicalIngredient {
  /** Unique canonical ID (lowercase, hyphenated) */
  id: string;
  /** Display name */
  displayName: string;
  /** Category */
  category: BottleCategory;
  /** Subcategory for finer grouping */
  subcategory?: string;
  /** Known aliases and variations */
  aliases: string[];
  /** Substitution group key — ingredients in the same group can sub for each other */
  substitutionGroup?: string;
}

export interface NormalizationResult {
  /** The canonical ingredient, or null if no match found */
  canonical: CanonicalIngredient | null;
  /** Confidence of the match (0-1) */
  confidence: number;
  /** The matched alias or original query */
  matchedOn: string;
}

// ============================================================================
// CANONICAL DATABASE
// ============================================================================

const CANONICAL_INGREDIENTS: CanonicalIngredient[] = [
  // --- Spirits ---
  { id: 'vodka', displayName: 'Vodka', category: 'spirit', aliases: ['vodka', 'potato vodka', 'grain vodka'], substitutionGroup: 'vodka' },
  { id: 'gin-london-dry', displayName: 'London Dry Gin', category: 'spirit', subcategory: 'london dry', aliases: ['gin', 'london dry gin', 'dry gin'], substitutionGroup: 'gin' },
  { id: 'gin-plymouth', displayName: 'Plymouth Gin', category: 'spirit', subcategory: 'plymouth', aliases: ['plymouth gin'], substitutionGroup: 'gin' },
  { id: 'gin-old-tom', displayName: 'Old Tom Gin', category: 'spirit', subcategory: 'old tom', aliases: ['old tom gin'], substitutionGroup: 'gin' },
  { id: 'bourbon', displayName: 'Bourbon', category: 'spirit', subcategory: 'bourbon', aliases: ['bourbon', 'bourbon whiskey', 'kentucky bourbon'], substitutionGroup: 'whiskey' },
  { id: 'rye-whiskey', displayName: 'Rye Whiskey', category: 'spirit', subcategory: 'rye', aliases: ['rye whiskey', 'rye'], substitutionGroup: 'whiskey' },
  { id: 'scotch', displayName: 'Scotch', category: 'spirit', subcategory: 'scotch', aliases: ['scotch', 'scotch whisky', 'blended scotch'], substitutionGroup: 'whiskey' },
  { id: 'irish-whiskey', displayName: 'Irish Whiskey', category: 'spirit', subcategory: 'irish', aliases: ['irish whiskey'], substitutionGroup: 'whiskey' },
  { id: 'japanese-whisky', displayName: 'Japanese Whisky', category: 'spirit', subcategory: 'japanese', aliases: ['japanese whisky', 'japanese whiskey'], substitutionGroup: 'whiskey' },
  { id: 'white-rum', displayName: 'White Rum', category: 'spirit', subcategory: 'white', aliases: ['white rum', 'light rum', 'silver rum'], substitutionGroup: 'rum' },
  { id: 'dark-rum', displayName: 'Dark Rum', category: 'spirit', subcategory: 'dark', aliases: ['dark rum', 'black rum'], substitutionGroup: 'rum' },
  { id: 'aged-rum', displayName: 'Aged Rum', category: 'spirit', subcategory: 'aged', aliases: ['aged rum', 'gold rum', 'añejo rum'], substitutionGroup: 'rum' },
  { id: 'spiced-rum', displayName: 'Spiced Rum', category: 'spirit', subcategory: 'spiced', aliases: ['spiced rum'], substitutionGroup: 'rum' },
  { id: 'cachaca', displayName: 'Cachaça', category: 'spirit', aliases: ['cachaça', 'cachaca'], substitutionGroup: 'rum' },
  { id: 'tequila-blanco', displayName: 'Tequila Blanco', category: 'spirit', subcategory: 'blanco', aliases: ['tequila', 'tequila blanco', 'silver tequila', 'blanco tequila'], substitutionGroup: 'tequila' },
  { id: 'tequila-reposado', displayName: 'Tequila Reposado', category: 'spirit', subcategory: 'reposado', aliases: ['tequila reposado', 'reposado tequila'], substitutionGroup: 'tequila' },
  { id: 'mezcal', displayName: 'Mezcal', category: 'spirit', aliases: ['mezcal'], substitutionGroup: 'tequila' },
  { id: 'cognac', displayName: 'Cognac', category: 'spirit', subcategory: 'cognac', aliases: ['cognac', 'vs cognac', 'vsop cognac'], substitutionGroup: 'brandy' },
  { id: 'brandy', displayName: 'Brandy', category: 'spirit', aliases: ['brandy'], substitutionGroup: 'brandy' },
  { id: 'pisco', displayName: 'Pisco', category: 'spirit', aliases: ['pisco'], substitutionGroup: 'brandy' },

  // --- Liqueurs & Modifiers ---
  { id: 'triple-sec', displayName: 'Triple Sec', category: 'liqueur', aliases: ['triple sec'], substitutionGroup: 'orange-liqueur' },
  { id: 'cointreau', displayName: 'Cointreau', category: 'liqueur', aliases: ['cointreau'], substitutionGroup: 'orange-liqueur' },
  { id: 'grand-marnier', displayName: 'Grand Marnier', category: 'liqueur', aliases: ['grand marnier'], substitutionGroup: 'orange-liqueur' },
  { id: 'curacao', displayName: 'Curaçao', category: 'liqueur', aliases: ['curaçao', 'curacao', 'blue curacao', 'orange curacao'], substitutionGroup: 'orange-liqueur' },
  { id: 'campari', displayName: 'Campari', category: 'liqueur', aliases: ['campari'], substitutionGroup: 'bitter-liqueur' },
  { id: 'aperol', displayName: 'Aperol', category: 'liqueur', aliases: ['aperol'], substitutionGroup: 'bitter-liqueur' },
  { id: 'sweet-vermouth', displayName: 'Sweet Vermouth', category: 'liqueur', aliases: ['sweet vermouth', 'rosso vermouth', 'red vermouth'], substitutionGroup: 'sweet-vermouth' },
  { id: 'dry-vermouth', displayName: 'Dry Vermouth', category: 'liqueur', aliases: ['dry vermouth', 'french vermouth', 'extra dry vermouth'], substitutionGroup: 'dry-vermouth' },
  { id: 'amaretto', displayName: 'Amaretto', category: 'liqueur', aliases: ['amaretto', 'disaronno'], substitutionGroup: 'amaretto' },
  { id: 'kahlua', displayName: 'Kahlúa', category: 'liqueur', aliases: ['kahlúa', 'kahlua', 'coffee liqueur'], substitutionGroup: 'coffee-liqueur' },
  { id: 'maraschino', displayName: 'Maraschino Liqueur', category: 'liqueur', aliases: ['maraschino', 'maraschino liqueur', 'luxardo maraschino'], substitutionGroup: 'maraschino' },
  { id: 'chartreuse-green', displayName: 'Green Chartreuse', category: 'liqueur', aliases: ['green chartreuse', 'chartreuse'], substitutionGroup: 'chartreuse' },
  { id: 'st-germain', displayName: 'St-Germain', category: 'liqueur', aliases: ['st-germain', 'st germain', 'elderflower liqueur'], substitutionGroup: 'elderflower' },

  // --- Mixers ---
  { id: 'tonic-water', displayName: 'Tonic Water', category: 'mixer', aliases: ['tonic water', 'tonic'], substitutionGroup: 'tonic' },
  { id: 'soda-water', displayName: 'Soda Water', category: 'mixer', aliases: ['soda water', 'club soda', 'sparkling water', 'seltzer'], substitutionGroup: 'soda' },
  { id: 'ginger-beer', displayName: 'Ginger Beer', category: 'mixer', aliases: ['ginger beer'], substitutionGroup: 'ginger' },
  { id: 'ginger-ale', displayName: 'Ginger Ale', category: 'mixer', aliases: ['ginger ale'], substitutionGroup: 'ginger' },
  { id: 'cola', displayName: 'Cola', category: 'mixer', aliases: ['cola', 'coca-cola', 'coke', 'pepsi'], substitutionGroup: 'cola' },
  { id: 'cranberry-juice', displayName: 'Cranberry Juice', category: 'mixer', aliases: ['cranberry juice', 'cran'], substitutionGroup: 'cranberry' },
  { id: 'pineapple-juice', displayName: 'Pineapple Juice', category: 'mixer', aliases: ['pineapple juice'], substitutionGroup: 'pineapple-juice' },
  { id: 'coconut-cream', displayName: 'Coconut Cream', category: 'mixer', aliases: ['coconut cream', 'cream of coconut', 'coco lopez'], substitutionGroup: 'coconut' },

  // --- Bitters ---
  { id: 'angostura', displayName: 'Angostura Bitters', category: 'bitters', aliases: ['angostura bitters', 'angostura', 'aromatic bitters'], substitutionGroup: 'aromatic-bitters' },
  { id: 'orange-bitters', displayName: 'Orange Bitters', category: 'bitters', aliases: ['orange bitters'], substitutionGroup: 'orange-bitters' },
  { id: 'peychauds', displayName: "Peychaud's Bitters", category: 'bitters', aliases: ["peychaud's bitters", 'peychauds bitters', "peychaud's"], substitutionGroup: 'peychauds' },

  // --- Syrups ---
  { id: 'simple-syrup', displayName: 'Simple Syrup', category: 'syrup', aliases: ['simple syrup', 'sugar syrup', '1:1 syrup'], substitutionGroup: 'simple-sweet' },
  { id: 'rich-simple', displayName: 'Rich Simple Syrup', category: 'syrup', aliases: ['rich simple syrup', '2:1 syrup', 'rich simple'], substitutionGroup: 'simple-sweet' },
  { id: 'honey-syrup', displayName: 'Honey Syrup', category: 'syrup', aliases: ['honey syrup', 'honey'], substitutionGroup: 'simple-sweet' },
  { id: 'agave-syrup', displayName: 'Agave Syrup', category: 'syrup', aliases: ['agave syrup', 'agave nectar', 'agave'], substitutionGroup: 'simple-sweet' },
  { id: 'demerara-syrup', displayName: 'Demerara Syrup', category: 'syrup', aliases: ['demerara syrup', 'demerara'], substitutionGroup: 'simple-sweet' },
  { id: 'maple-syrup', displayName: 'Maple Syrup', category: 'syrup', aliases: ['maple syrup'], substitutionGroup: 'simple-sweet' },
  { id: 'grenadine', displayName: 'Grenadine', category: 'syrup', aliases: ['grenadine'], substitutionGroup: 'grenadine' },
  { id: 'orgeat', displayName: 'Orgeat', category: 'syrup', aliases: ['orgeat', 'orgeat syrup', 'almond syrup'], substitutionGroup: 'orgeat' },

  // --- Citrus / Juice ---
  { id: 'lime-juice', displayName: 'Lime Juice', category: 'garnish', aliases: ['lime juice', 'fresh lime juice', 'freshly squeezed lime juice'], substitutionGroup: 'citrus-sour' },
  { id: 'lemon-juice', displayName: 'Lemon Juice', category: 'garnish', aliases: ['lemon juice', 'fresh lemon juice', 'freshly squeezed lemon juice'], substitutionGroup: 'citrus-sour' },
  { id: 'orange-juice', displayName: 'Orange Juice', category: 'garnish', aliases: ['orange juice', 'fresh orange juice', 'oj'], substitutionGroup: 'citrus-sweet' },
  { id: 'grapefruit-juice', displayName: 'Grapefruit Juice', category: 'garnish', aliases: ['grapefruit juice', 'fresh grapefruit juice'], substitutionGroup: 'citrus-sweet' },

  // --- Garnishes ---
  { id: 'lime', displayName: 'Lime', category: 'garnish', aliases: ['lime', 'lime wedge', 'lime wheel', 'lime slice', 'lime peel', 'lime twist'], substitutionGroup: 'lime-garnish' },
  { id: 'lemon', displayName: 'Lemon', category: 'garnish', aliases: ['lemon', 'lemon wedge', 'lemon wheel', 'lemon slice', 'lemon peel', 'lemon twist'], substitutionGroup: 'lemon-garnish' },
  { id: 'orange', displayName: 'Orange', category: 'garnish', aliases: ['orange', 'orange wedge', 'orange wheel', 'orange slice', 'orange peel', 'orange twist'], substitutionGroup: 'orange-garnish' },
  { id: 'cherry', displayName: 'Maraschino Cherry', category: 'garnish', aliases: ['cherry', 'maraschino cherry', 'cocktail cherry', 'luxardo cherry'], substitutionGroup: 'cherry' },
  { id: 'mint', displayName: 'Fresh Mint', category: 'garnish', aliases: ['mint', 'fresh mint', 'mint leaves', 'mint sprig'], substitutionGroup: 'mint' },
  { id: 'olive', displayName: 'Olive', category: 'garnish', aliases: ['olive', 'green olive', 'cocktail olive'], substitutionGroup: 'olive' },

  // --- Other Ingredients ---
  { id: 'egg-white', displayName: 'Egg White', category: 'ingredient', aliases: ['egg white', 'egg whites'], substitutionGroup: 'egg-white' },
  { id: 'aquafaba', displayName: 'Aquafaba', category: 'ingredient', aliases: ['aquafaba', 'chickpea water'], substitutionGroup: 'egg-white' },
  { id: 'cream', displayName: 'Heavy Cream', category: 'ingredient', aliases: ['cream', 'heavy cream', 'double cream', 'whipping cream'], substitutionGroup: 'cream' },
  { id: 'half-and-half', displayName: 'Half & Half', category: 'ingredient', aliases: ['half and half', 'half & half', 'half-and-half'], substitutionGroup: 'cream' },
  { id: 'sugar', displayName: 'Sugar', category: 'ingredient', aliases: ['sugar', 'white sugar', 'granulated sugar', 'sugar cube', 'sugar cubes'], substitutionGroup: 'sugar' },
];

// ============================================================================
// LOOKUP MAPS (built once on import for O(1) lookups)
// ============================================================================

/** alias (lowercase) -> CanonicalIngredient */
const aliasMap = new Map<string, CanonicalIngredient>();

/** id -> CanonicalIngredient */
const idMap = new Map<string, CanonicalIngredient>();

/** substitutionGroup -> CanonicalIngredient[] */
const substitutionMap = new Map<string, CanonicalIngredient[]>();

// Build maps
for (const ingredient of CANONICAL_INGREDIENTS) {
  idMap.set(ingredient.id, ingredient);

  for (const alias of ingredient.aliases) {
    aliasMap.set(alias.toLowerCase(), ingredient);
  }

  if (ingredient.substitutionGroup) {
    if (!substitutionMap.has(ingredient.substitutionGroup)) {
      substitutionMap.set(ingredient.substitutionGroup, []);
    }
    substitutionMap.get(ingredient.substitutionGroup)!.push(ingredient);
  }
}

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Normalize a freeform ingredient string to its canonical form.
 * Tries exact match first, then cleaned match, then fuzzy.
 */
export function normalize(ingredientName: string): NormalizationResult {
  const cleaned = cleanIngredientName(ingredientName);

  // 1. Exact alias match
  const exact = aliasMap.get(cleaned);
  if (exact) {
    return { canonical: exact, confidence: 1.0, matchedOn: cleaned };
  }

  // 2. Containment match — "Maker's Mark Bourbon" contains "bourbon"
  for (const [alias, canonical] of aliasMap) {
    if (cleaned.includes(alias) && alias.length >= 3) {
      return { canonical, confidence: 0.85, matchedOn: alias };
    }
    if (alias.includes(cleaned) && cleaned.length >= 3) {
      return { canonical, confidence: 0.8, matchedOn: alias };
    }
  }

  // 3. No match
  return { canonical: null, confidence: 0, matchedOn: cleaned };
}

/**
 * Get canonical ingredient by ID.
 */
export function getById(id: string): CanonicalIngredient | undefined {
  return idMap.get(id);
}

/**
 * Check if two ingredient strings refer to the same canonical ingredient.
 */
export function areSameIngredient(a: string, b: string): boolean {
  const normA = normalize(a);
  const normB = normalize(b);

  if (!normA.canonical || !normB.canonical) {
    // Fallback to basic string containment
    const cleanA = cleanIngredientName(a);
    const cleanB = cleanIngredientName(b);
    return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
  }

  return normA.canonical.id === normB.canonical.id;
}

/**
 * Check if two ingredients can substitute for each other.
 * More permissive than areSameIngredient — includes substitution groups.
 */
export function areSubstitutable(a: string, b: string): boolean {
  if (areSameIngredient(a, b)) return true;

  const normA = normalize(a);
  const normB = normalize(b);

  if (!normA.canonical?.substitutionGroup || !normB.canonical?.substitutionGroup) {
    return false;
  }

  return normA.canonical.substitutionGroup === normB.canonical.substitutionGroup;
}

/**
 * Get substitution options for an ingredient.
 */
export function getSubstitutions(ingredientName: string): CanonicalIngredient[] {
  const norm = normalize(ingredientName);
  if (!norm.canonical?.substitutionGroup) return [];

  const group = substitutionMap.get(norm.canonical.substitutionGroup) || [];
  return group.filter(g => g.id !== norm.canonical!.id);
}

/**
 * Infer the category of an ingredient from its name.
 */
export function inferCategory(ingredientName: string): BottleCategory {
  const norm = normalize(ingredientName);
  if (norm.canonical) return norm.canonical.category;

  // Fallback keyword heuristics
  const lower = ingredientName.toLowerCase();
  if (/vodka|gin|rum|whiskey|bourbon|tequila|mezcal|brandy|cognac|scotch|pisco/i.test(lower)) return 'spirit';
  if (/liqueur|triple sec|cointreau|campari|aperol|vermouth|amaretto|chartreuse/i.test(lower)) return 'liqueur';
  if (/juice|tonic|soda|water|beer|ale|cola|cranberry|pineapple/i.test(lower)) return 'mixer';
  if (/bitters/i.test(lower)) return 'bitters';
  if (/syrup|honey|agave|grenadine|orgeat|sugar/i.test(lower)) return 'syrup';
  if (/lemon|lime|orange|cherry|mint|olive|cucumber|garnish|wedge|twist|wheel|peel/i.test(lower)) return 'garnish';
  return 'ingredient';
}

/**
 * Get the full canonical database (useful for autocomplete).
 */
export function getAllCanonicalIngredients(): CanonicalIngredient[] {
  return [...CANONICAL_INGREDIENTS];
}

/**
 * Search the canonical database by partial name match.
 */
export function searchCanonical(query: string, limit: number = 10): CanonicalIngredient[] {
  const cleaned = cleanIngredientName(query);
  if (cleaned.length < 2) return [];

  const results: Array<{ ingredient: CanonicalIngredient; score: number }> = [];

  for (const ingredient of CANONICAL_INGREDIENTS) {
    const displayLower = ingredient.displayName.toLowerCase();

    if (displayLower === cleaned) {
      results.push({ ingredient, score: 100 });
    } else if (displayLower.startsWith(cleaned)) {
      results.push({ ingredient, score: 80 });
    } else if (ingredient.aliases.some(a => a.startsWith(cleaned))) {
      results.push({ ingredient, score: 70 });
    } else if (displayLower.includes(cleaned)) {
      results.push({ ingredient, score: 50 });
    } else if (ingredient.aliases.some(a => a.includes(cleaned))) {
      results.push({ ingredient, score: 40 });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit).map(r => r.ingredient);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Clean and normalize an ingredient name for matching.
 * Strips quantities, units, modifiers, and extra whitespace.
 */
function cleanIngredientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\d+(\.\d+)?\s*(oz|ml|cl|dash|dashes|drops?|splash|barspoon|tsp|tbsp|cup|part|parts)\b/gi, '')
    .replace(/\b(fresh|freshly\s+squeezed|chilled|cold|warm|hot|large|small|thin|thick|whole)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}
