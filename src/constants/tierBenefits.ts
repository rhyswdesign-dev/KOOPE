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
    tagline: 'Start the journey. Learn the basics.',
    bulletPoints: [
      'Basics Only',
      'Limited AI (1/day)',
      '10 Inventory Items',
      'Basic Lessons',
    ],
    recommended: false,
    color: '#8B8B8B',
  },
  {
    id: 'koope_plus',
    name: 'KOOPE+',
    priceLabel: '$8.99',
    monthlyPriceLabel: '$8.99',
    yearlyPriceLabel: '$71.99',
    monthlyPriceDetail: '/month',
    yearlyPriceDetail: '/year (save 33%)',
    priceDetail: '/mo USD or $71.99/yr',
    tagline: 'Your personal upgrade.',
    bulletPoints: [
      'Unlimited Lessons',
      'Unlimited AI Coach',
      'Vault Access',
      'Offline Mode',
      'Full Recipe Library',
    ],
    recommended: true,
    badge: 'Most Popular',
    color: '#D4AF37',
  },
  {
    id: 'koope_pro',
    name: 'KOOPE PRO',
    priceLabel: '$17.99',
    monthlyPriceLabel: '$17.99',
    yearlyPriceLabel: '$179.99',
    monthlyPriceDetail: '/month',
    yearlyPriceDetail: '/year (save 17%)',
    priceDetail: '/mo USD or $179.99/yr',
    tagline: 'The premium hosting lifestyle.',
    bulletPoints: [
      'Everything in KOOPE+',
      'Priority AI w/ Memory',
      'Creator Tools',
      'VIP Challenges',
      'Exclusive Brand Perks',
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
  { label: 'Lessons', free: 'Basics Only', plus: 'Unlimited', pro: 'Unlimited + Masterclasses' },
  { label: 'AI Coach', free: 'Limited (3/day)', plus: 'Unlimited', pro: 'Priority AI (Memory + Context)' },
  { label: 'Saves & Notes', free: 'Limited', plus: 'Unlimited', pro: 'Unlimited + Pro Tools' },
  { label: 'Inventory System', free: '10 Items Max', plus: 'Unlimited', pro: 'Unlimited + Smart Suggestions' },
  { label: 'Seasonal Vault Access', free: false, plus: 'Standard Access', pro: 'Early Access + Monthly Free Key' },
  { label: 'Monthly New Drops', free: 'Free Mini-Drop', plus: 'Full Access', pro: 'Early Access + Pro Exclusives' },
  { label: 'Challenges', free: 'Limited', plus: 'Full Access', pro: 'VIP-Only Challenges' },
  { label: 'Brand Perks', free: false, plus: 'Light Perks', pro: 'Exclusive Offers, Tastings, Events' },
  { label: 'Offline Mode', free: false, plus: true, pro: true },
  { label: 'Recipe Builder', free: 'Basic', plus: 'Enhanced', pro: 'Pro Builder (Advanced Flavor AI)' },
  { label: 'Cocktail Cards', free: 'Limited Pack', plus: 'Full Library', pro: 'Pro-Only Cards + Variations' },
  { label: 'Home Bar Plan', free: 'Basic Tips', plus: 'Monthly Personalized Plan', pro: 'Advanced Blueprint + PDF' },
  { label: 'Event / Class Discounts', free: false, plus: 'Light', pro: 'Priority + Bigger Discounts' },
  { label: 'Certification Tracks', free: false, plus: 'Basic', pro: 'Verified MixMind Certifications' },
  { label: 'Creator Tools', free: false, plus: false, pro: 'Menu Export, Upload Recipes, Themes' },
  { label: 'Community Identity', free: 'General', plus: 'Standard', pro: 'Elite Flair (Badge, Crown)' },
];
