/**
 * Spirit Substitution Utility
 * Provides suggestions for spirit substitutions in cocktails
 */

export interface SubstitutionSuggestion {
  original: string;
  substitutes: Array<{
    name: string;
    confidence: 'high' | 'medium' | 'low';
    note: string;
  }>;
}

/**
 * Common spirit substitution rules
 * Based on flavor profiles and cocktail compatibility
 */
const SUBSTITUTION_RULES: Record<string, Array<{
  name: string;
  confidence: 'high' | 'medium' | 'low';
  note: string;
}>> = {
  // Vodka substitutions
  'vodka': [
    { name: 'gin', confidence: 'high', note: 'Adds botanical notes' },
    { name: 'white rum', confidence: 'medium', note: 'Slightly sweeter' },
    { name: 'tequila blanco', confidence: 'low', note: 'Changes flavor profile' },
  ],

  // Gin substitutions
  'gin': [
    { name: 'vodka', confidence: 'high', note: 'Cleaner, less botanical' },
    { name: 'white rum', confidence: 'medium', note: 'Tropical twist' },
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

  // Whiskey substitutions
  'bourbon': [
    { name: 'rye whiskey', confidence: 'high', note: 'Spicier finish' },
    { name: 'tennessee whiskey', confidence: 'high', note: 'Smoother' },
    { name: 'scotch', confidence: 'medium', note: 'Smokier profile' },
    { name: 'irish whiskey', confidence: 'medium', note: 'Lighter, smoother' },
  ],
  'rye whiskey': [
    { name: 'bourbon', confidence: 'high', note: 'Sweeter, less spicy' },
    { name: 'scotch', confidence: 'medium', note: 'Different character' },
  ],
  'scotch': [
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
    { name: 'white rum', confidence: 'low', note: 'Different profile' },
    { name: 'tequila silver', confidence: 'high', note: 'Same spirit' },
  ],
  'tequila reposado': [
    { name: 'tequila añejo', confidence: 'high', note: 'More aged' },
    { name: 'tequila blanco', confidence: 'medium', note: 'Less aged' },
    { name: 'mezcal', confidence: 'medium', note: 'Smokier character' },
  ],

  // Brandy/Cognac substitutions
  'cognac': [
    { name: 'brandy', confidence: 'high', note: 'Similar style' },
    { name: 'armagnac', confidence: 'high', note: 'French alternative' },
    { name: 'dark rum', confidence: 'low', note: 'Different but works' },
  ],
  'brandy': [
    { name: 'cognac', confidence: 'high', note: 'More refined' },
    { name: 'bourbon', confidence: 'medium', note: 'American alternative' },
  ],

  // Liqueurs
  'triple sec': [
    { name: 'cointreau', confidence: 'high', note: 'Premium version' },
    { name: 'grand marnier', confidence: 'high', note: 'Cognac-based' },
    { name: 'curaçao', confidence: 'medium', note: 'Similar citrus' },
  ],
  'cointreau': [
    { name: 'triple sec', confidence: 'high', note: 'More affordable' },
    { name: 'grand marnier', confidence: 'high', note: 'Richer' },
  ],
  'campari': [
    { name: 'aperol', confidence: 'medium', note: 'Sweeter, less bitter' },
  ],
  'aperol': [
    { name: 'campari', confidence: 'medium', note: 'More bitter' },
  ],
};

/**
 * Normalize spirit name for lookup
 */
function normalizeSpirit(spirit: string): string {
  return spirit.toLowerCase().trim();
}

/**
 * Get substitution suggestions for a spirit
 */
export function getSpiritSubstitutions(spirit: string): SubstitutionSuggestion | null {
  const normalized = normalizeSpirit(spirit);

  // Direct match
  if (SUBSTITUTION_RULES[normalized]) {
    return {
      original: spirit,
      substitutes: SUBSTITUTION_RULES[normalized],
    };
  }

  // Partial match (e.g., "Grey Goose Vodka" matches "vodka")
  for (const [key, substitutes] of Object.entries(SUBSTITUTION_RULES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return {
        original: spirit,
        substitutes,
      };
    }
  }

  return null;
}

/**
 * Get all missing ingredients with substitution suggestions
 */
export function getMissingWithSubstitutions(
  missingIngredients: string[],
  availableIngredients: string[]
): Array<{
  ingredient: string;
  canSubstitute: boolean;
  substitutions: SubstitutionSuggestion | null;
}> {
  return missingIngredients.map(missing => {
    const substitutions = getSpiritSubstitutions(missing);

    // Check if user has any of the suggested substitutes
    const canSubstitute = substitutions
      ? substitutions.substitutes.some(sub =>
          availableIngredients.some(available =>
            normalizeSpirit(available).includes(normalizeSpirit(sub.name)) ||
            normalizeSpirit(sub.name).includes(normalizeSpirit(available))
          )
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
  substitutes: Array<{ name: string; confidence: string; note: string }>
): string {
  if (substitutes.length === 0) return '';

  const best = substitutes[0];
  return `Try ${best.name} instead - ${best.note}`;
}
