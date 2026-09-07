/**
 * TIER BENEFITS CONSTANTS
 * Defines subscription tiers, pricing, and benefits for KOOPE app
 */

export interface TierBenefit {
  id: 'free' | 'koope_plus' | 'koope_pro';
  name: string;
  /** Headline price (annual per-month equivalent) */
  priceLabel: string;
  /** Annual price */
  yearlyPriceLabel: string;
  yearlyPriceDetail?: string;
  /** Monthly price */
  monthlyPriceLabel: string;
  monthlyPriceDetail?: string;
  tagline: string;
  bulletPoints: string[];
  recommended: boolean;
  badge?: string;
  color: string;
  priceDetail?: string;
}

/**
 * Subscription tier definitions
 * These are used throughout the app to display tier information
 */
export const TIERS: TierBenefit[] = [
  {
    id: 'free',
    name: 'Home Bar',
    priceLabel: 'Free',
    yearlyPriceLabel: 'Free',
    monthlyPriceLabel: 'Free',
    tagline: 'Where it starts.',
    bulletPoints: [
      '10 Bottles Max',
      'Unlimited Scans',
      'Full Recipe Catalog (XP Unlock)',
      'Challenges & XP Earning',
      'Vault Access (XP Spend)',
    ],
    recommended: false,
    color: '#8B8B8B',
  },
  {
    id: 'koope_plus',
    name: 'Bartender',
    priceLabel: '$4.92',
    yearlyPriceLabel: '$59',
    yearlyPriceDetail: '/year',
    monthlyPriceLabel: '$6.99',
    monthlyPriceDetail: '/month',
    priceDetail: '/mo billed annually',
    tagline: 'You take this seriously.',
    bulletPoints: [
      'Unlimited Bottles & Scans',
      'Advanced Filters & Full Library',
      'Save Favorites Unlimited',
      'Smart Shelf & Bar Health',
      '"Optimize My Bar" Analysis',
      'Basic Hosting Tools',
    ],
    recommended: true,
    badge: 'Founders',
    color: '#D4AF37',
  },
  {
    id: 'koope_pro',
    name: 'Mixologist',
    priceLabel: '$8.25',
    yearlyPriceLabel: '$99',
    yearlyPriceDetail: '/year',
    monthlyPriceLabel: '$12.99',
    monthlyPriceDetail: '/month',
    priceDetail: '/mo billed annually',
    tagline: 'Full craft, full control.',
    bulletPoints: [
      'Everything in KŌOPE+',
      'Mastery Lessons & XP Levels',
      'Full Predictive Engine & Full Palate',
      'Advanced Hosting (5+ Guests)',
      'Flavor Sliders & Brand Capture',
      'Vault Pro Drops',
    ],
    recommended: false,
    badge: 'Elite',
    color: '#CD7F32',
  },
];

/**
 * Detailed feature comparison matrix
 * Used in expanded feature lists
 */
export interface FeatureComparison {
  label: string;
  free: string | boolean;
  plus: string | boolean;
  pro: string | boolean;
  locked?: boolean;
}

export const FEATURE_COMPARISON: FeatureComparison[] = [
  // Shelf
  { label: 'Shelf Bottles', free: '10 Max', plus: 'Unlimited', pro: 'Unlimited' },
  { label: 'Scans', free: 'Unlimited', plus: 'Unlimited', pro: 'Unlimited' },
  { label: 'Multi-Bar Profiles', free: false, plus: '2 Bars', pro: 'Unlimited' },
  {
    label: 'Smart Shelf',
    free: false,
    plus: 'Bar Health + Expiry Alerts',
    pro: 'Full (Dead Bottle, Usage, Cost)',
  },
  {
    label: '"Optimize My Bar"',
    free: false,
    plus: 'Analysis + Suggestions',
    pro: 'Analysis + Suggestions',
  },
  // Discovery
  { label: 'Cocktail Library', free: 'Limited', plus: 'Full Library', pro: 'Full Library' },
  { label: 'Saved Cocktails', free: false, plus: 'Unlimited', pro: 'Unlimited' },
  {
    label: 'Filters',
    free: 'Spirit Only',
    plus: 'Advanced (5-ingredient, low sugar, spirit-forward)',
    pro: 'Advanced + Predictive',
  },
  // AI
  {
    label: 'AI Suggestions',
    free: 'Basic (No Memory)',
    plus: 'Mood-Based + Palate Match %',
    pro: 'Full Predictive Engine + Long Memory',
  },
  { label: 'Palate Match %', free: false, plus: 'Basic', pro: 'Full Palate' },
  { label: 'Flavor Tags', free: false, plus: 'Visible', pro: 'Visible + Adjustable Sliders' },
  // Hosting
  { label: 'Hosting Tools', free: false, plus: 'Basic (1-4 Guests)', pro: 'Advanced (5+ Guests)' },
  {
    label: 'Shopping List',
    free: false,
    plus: 'Export + Add Missing',
    pro: 'Full Hosting Planner',
  },
  { label: 'Bring to Party', free: false, plus: false, pro: true },
  { label: 'Guest Preference Matching', free: false, plus: false, pro: true },
  // Pro Builder
  { label: 'Remix Engine', free: false, plus: false, pro: 'Ratio Balancing + Flavor Correction' },
  { label: 'Brand Capture', free: false, plus: false, pro: true },
  { label: 'Flavor Profile Dashboard', free: false, plus: false, pro: true },
  // Mastery & XP
  { label: 'XP Earning', free: true, plus: true, pro: true },
  { label: 'XP Levels & Dashboard', free: false, plus: false, pro: true },
  { label: 'Mastery Lessons', free: false, plus: false, pro: true },
  { label: 'Certifications', free: false, plus: false, pro: true },
  // Commerce
  { label: 'Shopping Cart', free: true, plus: true, pro: true },
  { label: 'Smart Cart Intelligence', free: false, plus: 'Non-Aggressive', pro: true },
  // Vault
  { label: 'Vault Basic Drops', free: 'XP Spend', plus: 'XP Spend', pro: 'XP Spend' },
  { label: 'Vault Pro Drops', free: false, plus: false, pro: true },
];
