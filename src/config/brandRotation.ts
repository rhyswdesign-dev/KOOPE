/**
 * Brand Rotation Config
 * Defines the seasonal category rotation for brand sponsorships.
 * Each month has up to 5 categories available for sponsorship.
 * Includes vodka and liqueurs (Update 5 from strategy addendum).
 *
 * NOTE: This is the category rotation template.
 * Which specific brand fills each slot is managed in the `featured_brands`
 * Supabase table (via the brand partnership dashboard or admin panel).
 */

export type SponsorshipTier = 'premium' | 'growth' | 'specialty';

export interface CategorySlot {
  category: string;
  tier: SponsorshipTier;
  priceRangeMonthly: [number, number]; // [min, max] USD
  seasonalJustification: string;
}

export interface MonthRotation {
  month: number;
  monthName: string;
  categories: CategorySlot[];
  seasonalTheme: string;
}

export const BRAND_ROTATION: MonthRotation[] = [
  {
    month: 1,
    monthName: 'January',
    seasonalTheme: 'Winter warmers & digestif season',
    categories: [
      { category: 'bourbon',  tier: 'premium',   priceRangeMonthly: [18000, 25000], seasonalJustification: 'Holiday recovery, Old Fashioned season' },
      { category: 'rye',      tier: 'specialty',  priceRangeMonthly: [8000, 12000],  seasonalJustification: 'Winter cocktails, Manhattans' },
      { category: 'brandy',   tier: 'specialty',  priceRangeMonthly: [8000, 12000],  seasonalJustification: 'Winter luxury, cold-weather serves' },
      { category: 'vodka',    tier: 'growth',     priceRangeMonthly: [12000, 18000], seasonalJustification: 'NYE hangover Bloody Marys, Moscow Mules' },
      { category: 'amaro',    tier: 'growth',     priceRangeMonthly: [10000, 15000], seasonalJustification: 'Digestif season post-holiday' },
    ],
  },
  {
    month: 2,
    monthName: 'February',
    seasonalTheme: 'Valentine\'s cocktails',
    categories: [
      { category: 'bourbon',  tier: 'premium',   priceRangeMonthly: [18000, 24000], seasonalJustification: 'Valentine\'s Old Fashioned, Whiskey Sour' },
      { category: 'brandy',   tier: 'specialty',  priceRangeMonthly: [8000, 12000],  seasonalJustification: 'Valentine\'s luxury serves' },
      { category: 'vodka',    tier: 'growth',     priceRangeMonthly: [12000, 18000], seasonalJustification: 'Valentine\'s Cosmopolitan, Espresso Martini' },
      { category: 'vermouth', tier: 'specialty',  priceRangeMonthly: [8000, 10000],  seasonalJustification: 'Martini season, Valentine\'s classics' },
      { category: 'liqueur',  tier: 'growth',     priceRangeMonthly: [10000, 14000], seasonalJustification: 'St-Germain for Valentine\'s spritz' },
    ],
  },
  {
    month: 3,
    monthName: 'March',
    seasonalTheme: 'Spring transition + St. Patrick\'s',
    categories: [
      { category: 'gin',      tier: 'premium',   priceRangeMonthly: [18000, 22000], seasonalJustification: 'Spring G&T season begins' },
      { category: 'tequila',  tier: 'premium',   priceRangeMonthly: [18000, 22000], seasonalJustification: 'St. Patrick\'s Paloma, spring Margaritas' },
      { category: 'vodka',    tier: 'growth',     priceRangeMonthly: [12000, 18000], seasonalJustification: 'Spring Vodka Sodas begin' },
      { category: 'liqueur',  tier: 'growth',     priceRangeMonthly: [10000, 14000], seasonalJustification: 'Spring cocktail modifiers' },
      { category: 'amaro',    tier: 'specialty',  priceRangeMonthly: [8000, 12000],  seasonalJustification: 'Negroni season approaching' },
    ],
  },
  {
    month: 4,
    monthName: 'April',
    seasonalTheme: 'Spring aperitifs',
    categories: [
      { category: 'aperitif', tier: 'premium',   priceRangeMonthly: [18000, 24000], seasonalJustification: 'Aperol Spritz season opens' },
      { category: 'gin',      tier: 'premium',   priceRangeMonthly: [18000, 22000], seasonalJustification: 'Peak G&T spring weather' },
      { category: 'tequila',  tier: 'premium',   priceRangeMonthly: [18000, 22000], seasonalJustification: 'Spring Margarita season' },
      { category: 'vodka',    tier: 'growth',     priceRangeMonthly: [12000, 18000], seasonalJustification: 'Spring Vodka Soda season' },
      { category: 'vermouth', tier: 'specialty',  priceRangeMonthly: [8000, 10000],  seasonalJustification: 'Spring classics (Negroni, Martini)' },
    ],
  },
  {
    month: 5,
    monthName: 'May',
    seasonalTheme: 'Pre-summer + Margarita season',
    categories: [
      { category: 'mezcal',   tier: 'growth',     priceRangeMonthly: [12000, 18000], seasonalJustification: 'Mezcal Margarita season' },
      { category: 'aperitif', tier: 'premium',   priceRangeMonthly: [20000, 25000], seasonalJustification: 'Aperol Spritz peak season' },
      { category: 'rum',      tier: 'growth',     priceRangeMonthly: [10000, 14000], seasonalJustification: 'Daiquiri & Mojito season begins' },
      { category: 'vodka',    tier: 'premium',   priceRangeMonthly: [18000, 22000], seasonalJustification: 'Moscow Mule season' },
      { category: 'liqueur',  tier: 'growth',     priceRangeMonthly: [12000, 15000], seasonalJustification: 'Cointreau for Margaritas' },
    ],
  },
  {
    month: 6,
    monthName: 'June',
    seasonalTheme: 'Summer peak — all categories',
    categories: [
      { category: 'tequila',  tier: 'premium',   priceRangeMonthly: [20000, 25000], seasonalJustification: 'Peak Margarita season' },
      { category: 'aperitif', tier: 'premium',   priceRangeMonthly: [20000, 24000], seasonalJustification: 'Aperol Spritz peak' },
      { category: 'vodka',    tier: 'premium',   priceRangeMonthly: [20000, 25000], seasonalJustification: 'Peak Vodka Soda season' },
      { category: 'rum',      tier: 'growth',     priceRangeMonthly: [12000, 15000], seasonalJustification: 'Daiquiri & Mojito peak' },
      { category: 'liqueur',  tier: 'growth',     priceRangeMonthly: [12000, 16000], seasonalJustification: 'Cointreau for summer cocktails' },
    ],
  },
  {
    month: 7,
    monthName: 'July',
    seasonalTheme: 'Peak summer',
    categories: [
      { category: 'tequila',  tier: 'premium',   priceRangeMonthly: [20000, 25000], seasonalJustification: 'Peak summer Margaritas' },
      { category: 'rum',      tier: 'growth',     priceRangeMonthly: [12000, 15000], seasonalJustification: 'Summer tropical cocktails' },
      { category: 'gin',      tier: 'premium',   priceRangeMonthly: [18000, 22000], seasonalJustification: 'G&T peak season' },
      { category: 'vodka',    tier: 'premium',   priceRangeMonthly: [20000, 25000], seasonalJustification: 'Vodka Soda peak' },
      { category: 'liqueur',  tier: 'growth',     priceRangeMonthly: [10000, 14000], seasonalJustification: 'Orange liqueur for tropical drinks' },
    ],
  },
  {
    month: 8,
    monthName: 'August',
    seasonalTheme: 'Late summer aperitifs',
    categories: [
      { category: 'aperitif', tier: 'premium',   priceRangeMonthly: [24000, 28000], seasonalJustification: 'Peak Aperol Spritz demand' },
      { category: 'tequila',  tier: 'premium',   priceRangeMonthly: [20000, 25000], seasonalJustification: 'Summer Margarita season' },
      { category: 'gin',      tier: 'premium',   priceRangeMonthly: [20000, 24000], seasonalJustification: 'G&T season' },
      { category: 'rum',      tier: 'growth',     priceRangeMonthly: [12000, 15000], seasonalJustification: 'Summer tropical drinks' },
      { category: 'vodka',    tier: 'growth',     priceRangeMonthly: [18000, 22000], seasonalJustification: 'Peak summer vodka' },
    ],
  },
  {
    month: 9,
    monthName: 'September',
    seasonalTheme: 'Fall transition',
    categories: [
      { category: 'mezcal',   tier: 'growth',     priceRangeMonthly: [12000, 18000], seasonalJustification: 'Fall Mezcal Negroni season' },
      { category: 'rum',      tier: 'growth',     priceRangeMonthly: [10000, 14000], seasonalJustification: 'Rum Old Fashioned, fall transition' },
      { category: 'vodka',    tier: 'growth',     priceRangeMonthly: [12000, 16000], seasonalJustification: 'Transition season Vodka Soda' },
      { category: 'vermouth', tier: 'specialty',  priceRangeMonthly: [8000, 10000],  seasonalJustification: 'Fall classics (Negroni, Martini)' },
      { category: 'amaro',    tier: 'growth',     priceRangeMonthly: [10000, 14000], seasonalJustification: 'Digestif season approaches' },
    ],
  },
  {
    month: 10,
    monthName: 'October',
    seasonalTheme: 'Fall warmers + Halloween',
    categories: [
      { category: 'bourbon',  tier: 'premium',   priceRangeMonthly: [18000, 24000], seasonalJustification: 'Fall Old Fashioned, Halloween cocktails' },
      { category: 'rye',      tier: 'specialty',  priceRangeMonthly: [8000, 12000],  seasonalJustification: 'Fall Manhattan season' },
      { category: 'amaro',    tier: 'growth',     priceRangeMonthly: [10000, 14000], seasonalJustification: 'Digestif season' },
      { category: 'vodka',    tier: 'growth',     priceRangeMonthly: [12000, 16000], seasonalJustification: 'Halloween cocktails' },
      { category: 'liqueur',  tier: 'growth',     priceRangeMonthly: [10000, 14000], seasonalJustification: 'Coffee liqueur for fall Espresso Martinis' },
    ],
  },
  {
    month: 11,
    monthName: 'November',
    seasonalTheme: 'Thanksgiving cocktails',
    categories: [
      { category: 'bourbon',  tier: 'premium',   priceRangeMonthly: [18000, 25000], seasonalJustification: 'Thanksgiving Old Fashioned, holiday gifting' },
      { category: 'rye',      tier: 'specialty',  priceRangeMonthly: [8000, 12000],  seasonalJustification: 'Thanksgiving Manhattan' },
      { category: 'brandy',   tier: 'specialty',  priceRangeMonthly: [8000, 12000],  seasonalJustification: 'Thanksgiving Sidecar season' },
      { category: 'amaro',    tier: 'growth',     priceRangeMonthly: [10000, 14000], seasonalJustification: 'Digestif after Thanksgiving dinner' },
      { category: 'vermouth', tier: 'specialty',  priceRangeMonthly: [8000, 10000],  seasonalJustification: 'Thanksgiving classics (Manhattan)' },
    ],
  },
  {
    month: 12,
    monthName: 'December',
    seasonalTheme: 'Holiday season + NYE',
    categories: [
      { category: 'bourbon',  tier: 'premium',   priceRangeMonthly: [20000, 26000], seasonalJustification: 'Holiday Old Fashioneds, gifting' },
      { category: 'scotch',   tier: 'premium',   priceRangeMonthly: [18000, 24000], seasonalJustification: 'Holiday luxury gifting' },
      { category: 'brandy',   tier: 'specialty',  priceRangeMonthly: [8000, 14000],  seasonalJustification: 'Holiday luxury serves' },
      { category: 'vodka',    tier: 'premium',   priceRangeMonthly: [20000, 26000], seasonalJustification: 'NYE Martinis, Espresso Martinis' },
      { category: 'liqueur',  tier: 'growth',     priceRangeMonthly: [12000, 18000], seasonalJustification: 'Holiday Espresso Martini & Baileys season' },
    ],
  },
];

/** Get the rotation config for a given month (1-based) */
export function getRotationForMonth(month: number): MonthRotation {
  const rotation = BRAND_ROTATION.find((r) => r.month === month);
  if (!rotation) return BRAND_ROTATION[0]; // Fallback to January
  return rotation;
}

/** Get all categories available for a given month */
export function getCategoriesForMonth(month: number): string[] {
  return getRotationForMonth(month).categories.map((c) => c.category);
}

/** Get the pricing range for a category in a given month */
export function getPricingForCategory(month: number, category: string): [number, number] | null {
  const rotation = getRotationForMonth(month);
  const slot = rotation.categories.find((c) => c.category === category);
  return slot?.priceRangeMonthly ?? null;
}
