/**
 * Spirit Substitution Utility
 * Provides suggestions for spirit substitutions in cocktails
 */

export interface SubstitutionSuggestion {
  original: string;
  substitutes: {
    name: string;
    confidence: 'high' | 'medium' | 'low';
    note: string;
  }[];
}

/**
 * Common spirit substitution rules
 * Based on flavor profiles and cocktail compatibility
 */
const SUBSTITUTION_RULES: Record<
  string,
  {
    name: string;
    confidence: 'high' | 'medium' | 'low';
    note: string;
  }[]
> = {
  // Vodka substitutions
  vodka: [
    { name: 'gin', confidence: 'high', note: 'Adds botanical notes' },
    { name: 'white rum', confidence: 'medium', note: 'Slightly sweeter' },
    { name: 'tequila blanco', confidence: 'low', note: 'Changes flavor profile' },
  ],
  tequila: [
    { name: 'tequila blanco', confidence: 'high', note: 'Closest clean agave profile' },
    { name: 'mezcal', confidence: 'medium', note: 'Adds smoke' },
    { name: 'white rum', confidence: 'low', note: 'Different profile but works in citrus builds' },
  ],

  // Gin substitutions
  gin: [
    { name: 'vodka', confidence: 'high', note: 'Cleaner, less botanical' },
    { name: 'white rum', confidence: 'medium', note: 'Tropical twist' },
    { name: 'tequila blanco', confidence: 'low', note: 'Earthier and more savory' },
  ],

  // Rum substitutions
  'white rum': [
    { name: 'vodka', confidence: 'medium', note: 'Less sweet' },
    { name: 'tequila blanco', confidence: 'medium', note: 'Earthy notes' },
    { name: 'light rum', confidence: 'high', note: 'Nearly identical' },
  ],
  'dark rum': [
    { name: 'aged rum', confidence: 'high', note: 'Similar depth' },
    { name: 'bourbon', confidence: 'medium', note: 'Different but rich' },
    { name: 'cognac', confidence: 'low', note: 'More refined' },
  ],
  'spiced rum': [
    { name: 'dark rum', confidence: 'medium', note: 'Less spiced' },
    { name: 'aged rum', confidence: 'medium', note: 'Smoother finish' },
  ],
  rum: [
    { name: 'white rum', confidence: 'high', note: 'Closest neutral rum base' },
    { name: 'aged rum', confidence: 'medium', note: 'Adds oak depth' },
    { name: 'dark rum', confidence: 'medium', note: 'Richer molasses tone' },
  ],
  cachaca: [
    { name: 'white rum', confidence: 'high', note: 'Closest cane-spirit swap' },
    { name: 'agricole rhum', confidence: 'medium', note: 'Grassy cane character' },
    { name: 'tequila blanco', confidence: 'low', note: 'Changes profile but keeps brightness' },
  ],

  // Whiskey substitutions
  bourbon: [
    { name: 'rye whiskey', confidence: 'high', note: 'Spicier finish' },
    { name: 'tennessee whiskey', confidence: 'high', note: 'Smoother' },
    { name: 'scotch', confidence: 'medium', note: 'Smokier profile' },
    { name: 'irish whiskey', confidence: 'medium', note: 'Lighter, smoother' },
  ],
  whiskey: [
    { name: 'bourbon', confidence: 'high', note: 'Balanced and easy swap' },
    { name: 'rye whiskey', confidence: 'medium', note: 'Spicier finish' },
    { name: 'irish whiskey', confidence: 'medium', note: 'Lighter body' },
  ],
  'rye whiskey': [
    { name: 'bourbon', confidence: 'high', note: 'Sweeter, less spicy' },
    { name: 'scotch', confidence: 'medium', note: 'Different character' },
  ],
  scotch: [
    { name: 'irish whiskey', confidence: 'medium', note: 'Less smoky' },
    { name: 'bourbon', confidence: 'medium', note: 'Sweeter' },
  ],
  'irish whiskey': [
    { name: 'bourbon', confidence: 'high', note: 'Richer' },
    { name: 'scotch', confidence: 'medium', note: 'Smokier' },
  ],

  // Tequila substitutions
  'tequila blanco': [
    { name: 'mezcal', confidence: 'medium', note: 'Smokier' },
    { name: 'vodka', confidence: 'low', note: 'Cleaner and less agave-forward' },
    { name: 'white rum', confidence: 'low', note: 'Different profile' },
    { name: 'tequila silver', confidence: 'high', note: 'Same spirit' },
  ],
  'tequila reposado': [
    { name: 'tequila añejo', confidence: 'high', note: 'More aged' },
    { name: 'tequila blanco', confidence: 'medium', note: 'Less aged' },
    { name: 'vodka', confidence: 'low', note: 'Cleaner, less oak and agave' },
    { name: 'mezcal', confidence: 'medium', note: 'Smokier character' },
  ],
  mezcal: [
    { name: 'tequila blanco', confidence: 'medium', note: 'Cleaner agave with less smoke' },
    { name: 'tequila reposado', confidence: 'medium', note: 'Aged agave depth with softer smoke' },
    { name: 'dark rum', confidence: 'low', note: 'Adds richness but changes profile' },
  ],

  // Brandy/Cognac substitutions
  cognac: [
    { name: 'brandy', confidence: 'high', note: 'Similar style' },
    { name: 'armagnac', confidence: 'high', note: 'French alternative' },
    { name: 'dark rum', confidence: 'low', note: 'Different but works' },
  ],
  brandy: [
    { name: 'cognac', confidence: 'high', note: 'More refined' },
    { name: 'bourbon', confidence: 'medium', note: 'American alternative' },
  ],

  // Liqueurs
  'triple sec': [
    { name: 'cointreau', confidence: 'high', note: 'Premium version' },
    { name: 'grand marnier', confidence: 'high', note: 'Cognac-based' },
    { name: 'curaçao', confidence: 'medium', note: 'Similar citrus' },
  ],
  cointreau: [
    { name: 'triple sec', confidence: 'high', note: 'More affordable' },
    { name: 'grand marnier', confidence: 'high', note: 'Richer' },
  ],
  campari: [{ name: 'aperol', confidence: 'medium', note: 'Sweeter, less bitter' }],
  aperol: [{ name: 'campari', confidence: 'medium', note: 'More bitter' }],
  'coffee liqueur': [
    { name: 'cold brew concentrate', confidence: 'medium', note: 'Less sweet, strong coffee note' },
    { name: 'amaro', confidence: 'low', note: 'More herbal and bitter' },
    { name: 'espresso', confidence: 'low', note: 'Use with a touch of syrup for balance' },
  ],
  'creme de cacao': [
    { name: 'chocolate liqueur', confidence: 'high', note: 'Same style, different brand' },
    { name: 'coffee liqueur', confidence: 'low', note: 'Adds coffee notes instead of pure cocoa' },
  ],
  espresso: [
    { name: 'cold brew concentrate', confidence: 'high', note: 'Closest coffee intensity' },
    { name: 'strong brewed coffee', confidence: 'medium', note: 'Lighter body' },
  ],
  'simple syrup': [
    { name: 'demerara syrup', confidence: 'high', note: 'Richer sugar depth' },
    { name: 'honey syrup', confidence: 'medium', note: 'Floral sweetness' },
    { name: 'agave nectar', confidence: 'medium', note: 'Rounder sweetness' },
  ],
  'lime juice': [
    { name: 'lemon juice', confidence: 'medium', note: 'Brighter, less tropical acidity' },
    { name: 'grapefruit juice', confidence: 'low', note: 'More bitter-citrus' },
  ],
  'lemon juice': [
    { name: 'lime juice', confidence: 'medium', note: 'Sharper and greener acidity' },
    { name: 'grapefruit juice', confidence: 'low', note: 'More bitter and soft' },
  ],
  'club soda': [
    { name: 'soda water', confidence: 'high', note: 'Equivalent substitution' },
    { name: 'sparkling water', confidence: 'high', note: 'Equivalent substitution' },
    { name: 'tonic water', confidence: 'low', note: 'Adds bitterness and sweetness' },
  ],
  'soda water': [
    { name: 'club soda', confidence: 'high', note: 'Equivalent substitution' },
    { name: 'sparkling water', confidence: 'high', note: 'Equivalent substitution' },
  ],
  'tonic water': [
    { name: 'club soda', confidence: 'medium', note: 'Cleaner and less bitter' },
    { name: 'sparkling water', confidence: 'medium', note: 'Cleaner and less bitter' },
  ],
  'ginger beer': [
    { name: 'ginger ale', confidence: 'medium', note: 'Softer spice and sweeter finish' },
    { name: 'soda water + ginger syrup', confidence: 'medium', note: 'DIY ginger kick' },
  ],
  'angostura bitters': [
    { name: 'aromatic bitters', confidence: 'high', note: 'Closest style match' },
    { name: 'orange bitters', confidence: 'medium', note: 'Brighter citrus tone' },
  ],
  // Garnish / adjacent ingredient swaps
  'orange slice': [
    { name: 'orange peel', confidence: 'high', note: 'Same citrus aroma, drier presentation' },
    { name: 'lemon wheel', confidence: 'medium', note: 'Brighter citrus lift' },
    { name: 'grapefruit peel', confidence: 'medium', note: 'More bitter-citrus aroma' },
  ],
  'orange wheel': [
    { name: 'orange peel', confidence: 'high', note: 'Same citrus aroma, less juice' },
    { name: 'lemon wheel', confidence: 'medium', note: 'Brighter citrus lift' },
  ],
  'lemon wheel': [
    { name: 'lemon peel', confidence: 'high', note: 'Similar citrus aroma with cleaner look' },
    { name: 'lime wheel', confidence: 'medium', note: 'Sharper citrus profile' },
    { name: 'orange wheel', confidence: 'medium', note: 'Softer citrus sweetness' },
  ],
  'lime wheel': [
    { name: 'lime wedge', confidence: 'high', note: 'Very close garnish function' },
    { name: 'lemon wheel', confidence: 'medium', note: 'Brighter acidity and aroma' },
  ],
  'rosemary sprig': [
    { name: 'basil', confidence: 'medium', note: 'Fresh herbal aroma with softer pine notes' },
    { name: 'thyme sprig', confidence: 'medium', note: 'Savory herbal lift' },
    { name: 'mint sprig', confidence: 'low', note: 'Cooler aromatic profile' },
  ],
  'mint sprig': [
    { name: 'basil', confidence: 'medium', note: 'Fresh green aromatic lift' },
    { name: 'thyme sprig', confidence: 'low', note: 'Savory alternative' },
  ],
  'coffee beans': [
    { name: 'cocoa nibs', confidence: 'medium', note: 'Bitter aromatic garnish' },
    { name: 'grated dark chocolate', confidence: 'medium', note: 'Dessert-forward coffee pairing' },
    { name: 'orange peel', confidence: 'low', note: 'Classic coffee-citrus aroma contrast' },
  ],
  nutmeg: [
    { name: 'allspice', confidence: 'medium', note: 'Warmer, slightly peppery spice' },
    { name: 'cinnamon', confidence: 'low', note: 'Sweeter, less earthy than nutmeg' },
  ],
  'non-alcoholic aperitivo': [
    {
      name: 'aperol',
      confidence: 'low',
      note: 'Alcoholic option with similar orange-bitter profile',
    },
    { name: 'campari', confidence: 'low', note: 'More bitter and assertive' },
    {
      name: 'grapefruit juice + soda water',
      confidence: 'medium',
      note: 'Zero-proof bitter-citrus style backup',
    },
  ],
  'cherry garnish': [
    {
      name: 'raspberries',
      confidence: 'medium',
      note: 'Bright berry accent with similar visual role',
    },
    { name: 'blackberries', confidence: 'medium', note: 'Darker berry profile and color' },
    { name: 'strawberry slice', confidence: 'low', note: 'Softer berry sweetness' },
  ],
};

/**
 * Normalize spirit name for lookup
 */
function normalizeSpirit(spirit: string): string {
  return spirit
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Get substitution suggestions for a spirit
 */
export function getSpiritSubstitutions(spirit: string): SubstitutionSuggestion | null {
  const normalized = normalizeSpirit(spirit);
  const aliases: Record<string, string> = {
    cachaça: 'cachaca',
    'tequila silver': 'tequila blanco',
    'white tequila': 'tequila blanco',
    'fresh lime juice': 'lime juice',
    'fresh lemon juice': 'lemon juice',
    'topo chico': 'club soda',
    'coffee beans garnish': 'coffee beans',
    'coffee bean garnish': 'coffee beans',
    'orange wheel garnish': 'orange wheel',
    'orange slice garnish': 'orange slice',
    'lemon wheel garnish': 'lemon wheel',
    'lime wheel garnish': 'lime wheel',
    'rosemary garnish': 'rosemary sprig',
    'mint garnish': 'mint sprig',
  };
  const stripped = normalized
    .replace(/\bgarnish\b/g, '')
    .replace(/\bfor garnish\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const aliased = aliases[stripped] || aliases[normalized] || stripped || normalized;

  // Direct match
  if (SUBSTITUTION_RULES[aliased]) {
    return {
      original: spirit,
      substitutes: SUBSTITUTION_RULES[aliased],
    };
  }

  // Partial match (e.g., "Grey Goose Vodka" matches "vodka")
  for (const [key, substitutes] of Object.entries(SUBSTITUTION_RULES)) {
    if (aliased.includes(key) || key.includes(aliased)) {
      return {
        original: spirit,
        substitutes,
      };
    }
  }

  // Broad fallback so users always get ideas
  if (aliased.includes('liqueur')) {
    return {
      original: spirit,
      substitutes: [
        { name: 'amaro', confidence: 'low', note: 'More bitter and herbal' },
        { name: 'sweet vermouth', confidence: 'low', note: 'Less sweet, more wine-like' },
      ],
    };
  }
  if (aliased.includes('juice')) {
    return {
      original: spirit,
      substitutes: [
        { name: 'lemon juice', confidence: 'low', note: 'Bright acidity backup' },
        { name: 'lime juice', confidence: 'low', note: 'Sharper acidity backup' },
      ],
    };
  }

  // Linear garnish adjacency: keep users in the same flavor world
  if (
    aliased.includes('orange') ||
    aliased.includes('lemon') ||
    aliased.includes('lime') ||
    aliased.includes('grapefruit') ||
    aliased.includes('citrus')
  ) {
    return {
      original: spirit,
      substitutes: [
        { name: 'lemon wheel', confidence: 'medium', note: 'Same citrus family, brighter aroma' },
        { name: 'lime wheel', confidence: 'medium', note: 'Same citrus family, sharper profile' },
        {
          name: 'grapefruit peel',
          confidence: 'medium',
          note: 'Same citrus family, more bitter-citrus oils',
        },
      ],
    };
  }

  if (aliased.includes('cherry')) {
    return {
      original: spirit,
      substitutes: [
        {
          name: 'raspberries',
          confidence: 'medium',
          note: 'Berry-adjacent garnish with bright acidity',
        },
        {
          name: 'blackberries',
          confidence: 'medium',
          note: 'Berry-adjacent garnish with deeper fruit tone',
        },
        {
          name: 'strawberry slice',
          confidence: 'low',
          note: 'Berry-adjacent option with softer sweetness',
        },
      ],
    };
  }

  return null;
}

/**
 * Get all missing ingredients with substitution suggestions
 */
export function getMissingWithSubstitutions(
  missingIngredients: string[],
  availableIngredients: string[],
): {
  ingredient: string;
  canSubstitute: boolean;
  substitutions: SubstitutionSuggestion | null;
}[] {
  return missingIngredients.map((missing) => {
    const substitutions = getSpiritSubstitutions(missing);

    // Check if user has any of the suggested substitutes
    const canSubstitute = substitutions
      ? substitutions.substitutes.some((sub) =>
          availableIngredients.some(
            (available) =>
              normalizeSpirit(available).includes(normalizeSpirit(sub.name)) ||
              normalizeSpirit(sub.name).includes(normalizeSpirit(available)),
          ),
        )
      : false;

    return {
      ingredient: missing,
      canSubstitute,
      substitutions,
    };
  });
}

/**
 * Get a user-friendly message for substitutions
 */
export function getSubstitutionMessage(
  missing: string,
  substitutes: { name: string; confidence: string; note: string }[],
): string {
  if (substitutes.length === 0) return '';

  const best = substitutes[0];
  return `Try ${best.name} instead - ${best.note}`;
}
