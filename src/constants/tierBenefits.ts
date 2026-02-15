/**
 * TIER BENEFITS CONSTANTS
 * Defines subscription tiers, pricing, and benefits for KOOPE app
 */

export interface TierBenefit {
  id: 'free' | 'koope_plus' | 'koope_pro';
  name: string;
  priceLabel: string; // Default price label (backward compatibility)
  monthlyPriceLabel: string; // Price when monthly billing selected
  yearlyPriceLabel: string; // Price when yearly billing selected
  monthlyPriceDetail?: string; // Additional detail for monthly
  yearlyPriceDetail?: string; // Additional detail for yearly
  tagline: string;
  bulletPoints: string[];
  recommended: boolean;
  badge?: string;
  color: string;
  priceDetail?: string; // Legacy field for backward compatibility
}

/**
 * Subscription tier definitions
 * These are used throughout the app to display tier information
 */
export const TIERS: TierBenefit[] = [
  {
    id: 'free',
    name: 'FREE',
    priceLabel: 'Free',
    monthlyPriceLabel: 'Free',
    yearlyPriceLabel: 'Free',
    tagline: 'Hook into the bar. Feel the potential.',
    bulletPoints: [
      '15 Bottles Max',
      '15 Scans/Month',
      '5 Saved Cocktails',
      '"What Can I Make" (Spirit Filter)',
      'Basic AI (No Memory)',
    ],
    recommended: false,
    color: '#8B8B8B',
  },
  {
    id: 'koope_plus',
    name: 'KOOPE+',
    priceLabel: '$6.58',
    monthlyPriceLabel: '$8.99',
    yearlyPriceLabel: '$79',
    monthlyPriceDetail: '/month',
    yearlyPriceDetail: '/year (save 27%)',
    priceDetail: '/mo billed annually',
    tagline: 'Core precision for your home bar.',
    bulletPoints: [
      'Unlimited Bottles & Scans',
      'Full Cocktail Library',
      'Taste Match %',
      'Advanced Filters',
      'Party Scaling Calculator',
      'Shopping List Export',
    ],
    recommended: true,
    badge: 'Most Popular',
    color: '#D4AF37',
  },
  {
    id: 'koope_pro',
    name: 'KOOPE PRO',
    priceLabel: '$9.92',
    monthlyPriceLabel: '$12.99',
    yearlyPriceLabel: '$119',
    monthlyPriceDetail: '/month',
    yearlyPriceDetail: '/year (save 24%)',
    priceDetail: '/mo billed annually',
    tagline: 'Authority. Control. Precision Mode.',
    bulletPoints: [
      'Everything in KOOPE+',
      'Full Taste Graph & Predictive Engine',
      'Hosting Planner & Batch Optimizer',
      'Remix Engine & Flavor Correction AI',
      '"Optimize My Bar" Analysis',
      'Advanced Mixology Education',
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
  // Inventory
  { label: 'Bottles', free: '15 Max', plus: 'Unlimited', pro: 'Unlimited' },
  { label: 'Scans', free: '15/Month', plus: 'Unlimited', pro: 'Unlimited' },
  { label: 'Multi-Bar Profiles', free: false, plus: '2 Bars', pro: 'Unlimited' },
  // Discovery
  { label: 'Cocktail Library', free: 'Limited', plus: 'Full Library', pro: 'Full Library' },
  { label: 'Saved Cocktails', free: '5 Max', plus: 'Unlimited', pro: 'Unlimited' },
  { label: 'Filters', free: 'Spirit Only', plus: 'Advanced (5-ingredient, low sugar, spirit-forward)', pro: 'Advanced + Predictive' },
  // AI
  { label: 'AI Suggestions', free: 'Basic (No Memory)', plus: 'Mood-Based + Taste Match %', pro: 'Full Predictive Engine + Long Memory' },
  { label: 'Taste Match %', free: false, plus: 'Basic', pro: 'Full Taste Graph' },
  { label: 'Flavor Tags', free: false, plus: 'Visible', pro: 'Visible + Adjustable Controls' },
  // Hosting
  { label: 'Party Scaling', free: 'Manual Only', plus: 'Calculator', pro: 'Batch Optimizer + Timeline' },
  { label: 'Shopping List', free: false, plus: 'Export + Add Missing', pro: 'Full Hosting Planner' },
  { label: 'Guest Menu Generator', free: false, plus: false, pro: true },
  // Pro Builder
  { label: 'Remix Engine', free: false, plus: false, pro: 'Ratio Balancing + Flavor Correction' },
  { label: '"Optimize My Bar"', free: false, plus: false, pro: 'Analysis + Expansion Suggestions' },
  { label: 'Flavor Profile Dashboard', free: false, plus: false, pro: true },
  // Education
  { label: 'Education', free: false, plus: false, pro: 'Guides + Technique Library' },
  // Commerce
  { label: 'Smart Cart Preview', free: false, plus: 'Non-Aggressive', pro: true },
];
