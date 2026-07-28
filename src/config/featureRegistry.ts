/**
 * Centralized Feature Registry — P4 Infrastructure
 *
 * Single source of truth for what features exist, what tier they require,
 * and how to describe them. Replaces scattered manual gate checks across
 * screens with a declarative registry.
 *
 * Every gated feature in the app should be registered here.
 *
 * Phase 0.7 (tier collapse): every `minTier: 'PRO'` / `paywallTarget: 'pro'`
 * in this file was mechanically flipped to 'PLUS' / 'plus' — there are two
 * tiers now, FREE and KŌOPE+ (persisted/type-level as 'PLUS'; 'PRO' still
 * exists as a UserTier value only for backward compatibility, see
 * tierAccess.ts's UserTier comment). No feature that required PLUS or PRO
 * before this pass requires more than PLUS now. Do not reintroduce 'PRO' as
 * a minTier/paywallTarget here — there's no product tier left for it to
 * mean.
 */

import { UserTier } from './tierAccess';

// ============================================================================
// TYPES
// ============================================================================

export type FeatureKey =
  // Inventory
  | 'inventory_unlimited'
  | 'scans_unlimited'
  | 'multi_bar'
  | 'multi_bar_unlimited'

  // Discovery
  | 'advanced_filters'
  | 'predictive_filters'
  | 'taste_match'
  | 'taste_match_full_graph'
  | 'flavor_tags_visible'
  | 'mood_suggestions'
  | 'saved_cocktails_unlimited'

  // AI
  | 'ai_unlimited'
  | 'ai_long_memory'
  | 'predictive_engine'

  // Smart Inventory
  | 'smart_inventory'
  | 'expiry_alerts'
  | 'bottle_level_tracking'
  | 'bar_health_score'
  | 'dead_bottle_detection'
  | 'usage_frequency'
  | 'cost_tracking'
  | 'bar_value_calculator'
  | 'seasonal_alerts'
  | 'predictive_restock'
  | 'smart_substitutions'

  // Hosting
  | 'party_scaling'
  | 'shopping_list_export'
  | 'hosting_basic'
  | 'hosting_advanced'
  | 'hosting_planner'
  | 'batch_optimizer'
  | 'guest_menu_generator'
  | 'prep_timeline'
  | 'bring_to_party'
  | 'guest_preference_matching'
  | 'hosting_budget_optimizer'

  // Commerce (cart never gated)
  | 'cart_purchase'
  | 'cart_add_item'
  | 'add_missing_ingredients'
  | 'smart_cart'

  // Pro Builder
  | 'remix_engine'
  | 'ratio_balancing'
  | 'flavor_correction_ai'
  | 'optimize_my_bar'
  | 'flavor_profile_dashboard'
  | 'adjustable_flavor_controls'
  | 'brand_capture'

  // XP
  | 'xp_earn'
  | 'xp_spend_vault_basic'
  | 'xp_levels'
  | 'challenges'

  // Mastery
  | 'mastery_lessons'
  | 'practice_mode'
  | 'vault_pro_drops'
  | 'certifications'
  | 'cellar_mode'

  // Education
  | 'education_full'
  | 'lessons_unlimited'
  | 'premium_serve_guidance'
  | 'premium_serve_education'
  | 'premium_serve_personalization'

  // Content drops
  | 'weekly_drops';

export interface FeatureDefinition {
  /** Minimum tier required to access this feature */
  minTier: UserTier;
  /** Human-readable name for paywall messaging */
  displayName: string;
  /** Short description for paywall copy */
  description: string;
  /** Which paywall tab to deep-link to */
  paywallTarget: 'plus' | 'pro';
  /** Category for grouping in settings/feature lists */
  category: FeatureCategory;
}

export type FeatureCategory =
  | 'inventory'
  | 'discovery'
  | 'ai'
  | 'smart_inventory'
  | 'hosting'
  | 'commerce'
  | 'pro_builder'
  | 'xp'
  | 'mastery'
  | 'education';

// ============================================================================
// REGISTRY
// ============================================================================

export const FEATURE_REGISTRY: Record<FeatureKey, FeatureDefinition> = {
  // --- Inventory ---
  inventory_unlimited: {
    minTier: 'PLUS',
    displayName: 'Unlimited Inventory',
    description: 'Add unlimited bottles to your home bar.',
    paywallTarget: 'plus',
    category: 'inventory',
  },
  scans_unlimited: {
    minTier: 'FREE',
    displayName: 'Unlimited Scans',
    description: 'Scan as many bottles as you want across barcode and AI photo scan.',
    paywallTarget: 'plus',
    category: 'inventory',
  },
  multi_bar: {
    minTier: 'FREE',
    displayName: 'Multi-Bar Profiles',
    description: 'Manage separate bar profiles.',
    paywallTarget: 'plus',
    category: 'inventory',
  },
  multi_bar_unlimited: {
    minTier: 'PLUS',
    displayName: 'Unlimited Bar Profiles',
    description: 'Create unlimited bar profiles for every occasion.',
    paywallTarget: 'plus',
    category: 'inventory',
  },

  // --- Discovery ---
  advanced_filters: {
    minTier: 'PLUS',
    displayName: 'Advanced Filters',
    description: 'Filter by ingredient count, low sugar, and spirit-forward.',
    paywallTarget: 'plus',
    category: 'discovery',
  },
  predictive_filters: {
    minTier: 'PLUS',
    displayName: 'Predictive Filters',
    description: 'AI-powered filters that learn what you like.',
    paywallTarget: 'plus',
    category: 'discovery',
  },
  taste_match: {
    minTier: 'PLUS',
    displayName: 'Palate Match %',
    description: 'See how well each cocktail matches your palate.',
    paywallTarget: 'plus',
    category: 'discovery',
  },
  taste_match_full_graph: {
    minTier: 'PLUS',
    displayName: 'Full Palate',
    description: 'Deep taste intelligence with decay, memory, and manual controls.',
    paywallTarget: 'plus',
    category: 'discovery',
  },
  flavor_tags_visible: {
    minTier: 'PLUS',
    displayName: 'Flavor Tags',
    description: 'See flavor profiles on every recipe.',
    paywallTarget: 'plus',
    category: 'discovery',
  },
  mood_suggestions: {
    minTier: 'PLUS',
    displayName: 'Mood Suggestions',
    description: 'Get cocktail suggestions based on your mood.',
    paywallTarget: 'plus',
    category: 'discovery',
  },
  saved_cocktails_unlimited: {
    minTier: 'PLUS',
    displayName: 'Unlimited Saves',
    description: 'Save as many cocktails as you want.',
    paywallTarget: 'plus',
    category: 'discovery',
  },

  // --- AI ---
  ai_unlimited: {
    minTier: 'PLUS',
    displayName: 'Unlimited AI',
    description: 'Unlimited AI bartender conversations.',
    paywallTarget: 'plus',
    category: 'ai',
  },
  ai_long_memory: {
    minTier: 'PLUS',
    displayName: 'AI Long Memory',
    description: 'Your bartender remembers your full history.',
    paywallTarget: 'plus',
    category: 'ai',
  },
  predictive_engine: {
    minTier: 'PLUS',
    displayName: 'Predictive Engine',
    description: 'Multi-signal fusion recommendations that get smarter over time.',
    paywallTarget: 'plus',
    category: 'ai',
  },

  // --- Smart Inventory (PLUS) ---
  smart_inventory: {
    minTier: 'PLUS',
    displayName: 'Smart Inventory',
    description: 'Intelligent inventory management with health tracking.',
    paywallTarget: 'plus',
    category: 'smart_inventory',
  },
  expiry_alerts: {
    minTier: 'PLUS',
    displayName: 'Expiry Alerts',
    description: 'Get notified when bottles are nearing expiry.',
    paywallTarget: 'plus',
    category: 'smart_inventory',
  },
  smart_substitutions: {
    minTier: 'PLUS',
    displayName: 'Smart Substitutions',
    description: 'See swap ideas for what to use instead, ranked by what you already own.',
    paywallTarget: 'plus',
    category: 'smart_inventory',
  },
  bottle_level_tracking: {
    minTier: 'PLUS',
    displayName: 'Bottle Level Tracking',
    description: 'Track how much is left in each bottle.',
    paywallTarget: 'plus',
    category: 'smart_inventory',
  },
  bar_health_score: {
    minTier: 'PLUS',
    displayName: 'Bar Health Score',
    description: 'See your bar completeness and optimization score.',
    paywallTarget: 'plus',
    category: 'smart_inventory',
  },

  // --- Smart Inventory (PRO) ---
  dead_bottle_detection: {
    minTier: 'PLUS',
    displayName: 'Dead Bottle Detection',
    description: 'Identify bottles you never use and get swap suggestions.',
    paywallTarget: 'plus',
    category: 'smart_inventory',
  },
  usage_frequency: {
    minTier: 'PLUS',
    displayName: 'Usage Frequency',
    description: 'See how often each bottle is used in your cocktails.',
    paywallTarget: 'plus',
    category: 'smart_inventory',
  },
  cost_tracking: {
    minTier: 'PLUS',
    displayName: 'Cost Tracking',
    description: 'Track spend per bottle and per cocktail.',
    paywallTarget: 'plus',
    category: 'smart_inventory',
  },
  bar_value_calculator: {
    minTier: 'PLUS',
    displayName: 'Bar Value Calculator',
    description: 'See the total value and cost-per-serve of your bar.',
    paywallTarget: 'plus',
    category: 'smart_inventory',
  },
  seasonal_alerts: {
    minTier: 'PLUS',
    displayName: 'Seasonal Alerts',
    description: 'Get notified about seasonal ingredients and trending spirits.',
    paywallTarget: 'plus',
    category: 'smart_inventory',
  },
  predictive_restock: {
    minTier: 'PLUS',
    displayName: 'Predictive Restock',
    description: 'AI predicts when you need to restock based on usage patterns.',
    paywallTarget: 'plus',
    category: 'smart_inventory',
  },

  // --- Hosting ---
  party_scaling: {
    minTier: 'PLUS',
    displayName: 'Party Scaling',
    description: 'Scale recipes for any crowd size.',
    paywallTarget: 'plus',
    category: 'hosting',
  },
  shopping_list_export: {
    minTier: 'PLUS',
    displayName: 'Shopping List Export',
    description: 'Export your shopping list to share or print.',
    paywallTarget: 'plus',
    category: 'hosting',
  },
  hosting_basic: {
    minTier: 'PLUS',
    displayName: 'Basic Hosting',
    description: 'Host small gatherings with scaling and shopping tools (1-4 guests).',
    paywallTarget: 'plus',
    category: 'hosting',
  },
  hosting_advanced: {
    minTier: 'PLUS',
    displayName: 'Advanced Hosting',
    description: 'Full hosting suite for larger parties (5+ guests).',
    paywallTarget: 'plus',
    category: 'hosting',
  },
  hosting_planner: {
    minTier: 'PLUS',
    displayName: 'Hosting Planner',
    description: 'Full party planning with prep timelines and guest menus.',
    paywallTarget: 'plus',
    category: 'hosting',
  },
  batch_optimizer: {
    minTier: 'FREE',
    displayName: 'Batch Optimizer',
    description: 'Smart batch calculations for large parties.',
    paywallTarget: 'plus',
    category: 'hosting',
  },
  guest_menu_generator: {
    minTier: 'FREE',
    displayName: 'Guest Menu Generator',
    description: 'Auto-generate crowd-pleasing menus for your guest count.',
    paywallTarget: 'plus',
    category: 'hosting',
  },
  prep_timeline: {
    minTier: 'PLUS',
    displayName: 'Prep Timeline',
    description: 'Step-by-step prep schedule for stress-free hosting.',
    paywallTarget: 'plus',
    category: 'hosting',
  },
  bring_to_party: {
    minTier: 'PLUS',
    displayName: 'Bring to Party',
    description: "Get smart suggestions for what to bring to someone else's party.",
    paywallTarget: 'plus',
    category: 'hosting',
  },
  guest_preference_matching: {
    minTier: 'PLUS',
    displayName: 'Guest Preference Matching',
    description: 'Match your menu to guest taste preferences.',
    paywallTarget: 'plus',
    category: 'hosting',
  },
  hosting_budget_optimizer: {
    minTier: 'PLUS',
    displayName: 'Hosting Budget Optimizer',
    description: 'Optimize your party menu for budget and taste.',
    paywallTarget: 'plus',
    category: 'hosting',
  },

  // --- Commerce (cart never gated) ---
  cart_purchase: {
    minTier: 'FREE',
    displayName: 'Shopping Cart',
    description: 'Purchase ingredients through the shopping cart.',
    paywallTarget: 'plus',
    category: 'commerce',
  },
  cart_add_item: {
    minTier: 'FREE',
    displayName: 'Add to Cart',
    description: 'Add items to your shopping cart.',
    paywallTarget: 'plus',
    category: 'commerce',
  },
  add_missing_ingredients: {
    minTier: 'PLUS',
    displayName: 'Add Missing Ingredients',
    description: 'See what you need and add it to your shopping list.',
    paywallTarget: 'plus',
    category: 'commerce',
  },
  smart_cart: {
    minTier: 'PLUS',
    displayName: 'Smart Cart',
    description: 'Intelligent shopping with retailer links and price estimates.',
    paywallTarget: 'plus',
    category: 'commerce',
  },

  // --- Pro Builder ---
  remix_engine: {
    minTier: 'PLUS',
    displayName: 'Remix Engine',
    description: 'Swap spirits, adjust ratios, and create variations.',
    paywallTarget: 'plus',
    category: 'pro_builder',
  },
  ratio_balancing: {
    minTier: 'PLUS',
    displayName: 'Ratio Balancing',
    description: 'Fine-tune sweetness, sourness, and strength.',
    paywallTarget: 'plus',
    category: 'pro_builder',
  },
  flavor_correction_ai: {
    minTier: 'PLUS',
    displayName: 'Flavor Correction AI',
    description: 'AI-assisted flavor balancing suggestions.',
    paywallTarget: 'plus',
    category: 'pro_builder',
  },
  optimize_my_bar: {
    minTier: 'PLUS',
    displayName: 'Optimize My Bar',
    description: 'Gap analysis, purchase ranking, and shopping plans.',
    paywallTarget: 'plus',
    category: 'inventory',
  },
  flavor_profile_dashboard: {
    minTier: 'PLUS',
    displayName: 'Flavor Dashboard',
    description: 'Interactive radar chart of your palate.',
    paywallTarget: 'plus',
    category: 'pro_builder',
  },
  adjustable_flavor_controls: {
    minTier: 'PLUS',
    displayName: 'Flavor Controls',
    description: 'Manually tune your taste preferences with sliders.',
    paywallTarget: 'plus',
    category: 'pro_builder',
  },
  brand_capture: {
    minTier: 'PLUS',
    displayName: 'Brand Capture',
    description: 'Capture and track specific brands in your inventory.',
    paywallTarget: 'plus',
    category: 'pro_builder',
  },

  // --- XP ---
  xp_earn: {
    minTier: 'FREE',
    displayName: 'Earn XP',
    description: 'Earn experience points from activities.',
    paywallTarget: 'plus',
    category: 'xp',
  },
  xp_spend_vault_basic: {
    minTier: 'FREE',
    displayName: 'Vault Basic Access',
    description: 'Spend XP on basic vault drops.',
    paywallTarget: 'plus',
    category: 'xp',
  },
  xp_levels: {
    minTier: 'PLUS',
    displayName: 'XP Levels & Dashboard',
    description: 'Track your level progression and see your mastery dashboard.',
    paywallTarget: 'plus',
    category: 'xp',
  },
  challenges: {
    minTier: 'FREE',
    displayName: 'Challenges',
    description: 'Complete challenges to earn bonus XP.',
    paywallTarget: 'plus',
    category: 'xp',
  },

  // --- Mastery ---
  mastery_lessons: {
    minTier: 'PLUS',
    displayName: 'Mastery Lessons',
    description: 'Deep-dive technique lessons for serious home bartenders.',
    paywallTarget: 'plus',
    category: 'mastery',
  },
  practice_mode: {
    minTier: 'PLUS',
    displayName: 'Practice Mode',
    description: 'Step-by-step guided practice for cocktail techniques.',
    paywallTarget: 'plus',
    category: 'mastery',
  },
  vault_pro_drops: {
    minTier: 'PLUS',
    displayName: 'Vault Pro Drops',
    description: 'Exclusive vault content for PRO members.',
    paywallTarget: 'plus',
    category: 'mastery',
  },
  certifications: {
    minTier: 'PLUS',
    displayName: 'Certifications',
    description: 'Earn certifications to showcase your bartending skills.',
    paywallTarget: 'plus',
    category: 'mastery',
  },
  cellar_mode: {
    minTier: 'PLUS',
    displayName: 'Cellar Mode',
    description: 'Track collector bottles with value, drinking windows, and personal cellar notes.',
    paywallTarget: 'plus',
    category: 'mastery',
  },

  // --- Education ---
  education_full: {
    minTier: 'PLUS',
    displayName: 'Full Education',
    description: 'Guides, techniques, and video content.',
    paywallTarget: 'plus',
    category: 'education',
  },
  lessons_unlimited: {
    minTier: 'PLUS',
    displayName: 'Unlimited Lessons',
    description: 'Access all cocktail lessons and masterclasses. Coming soon.',
    paywallTarget: 'plus',
    category: 'education',
  },
  premium_serve_guidance: {
    minTier: 'FREE',
    displayName: 'Premium Serve Guidance',
    description: 'Get basic guidance for how to enjoy premium bottles after scanning.',
    paywallTarget: 'plus',
    category: 'education',
  },
  premium_serve_education: {
    minTier: 'PLUS',
    displayName: 'Premium Tasting Education',
    description: 'Unlock deeper serving and tasting guidance for premium spirits.',
    paywallTarget: 'plus',
    category: 'education',
  },
  premium_serve_personalization: {
    minTier: 'PLUS',
    displayName: 'Personalized Serve Intelligence',
    description: 'Get premium bottle guidance tailored to your preferences and palate.',
    paywallTarget: 'plus',
    category: 'education',
  },
  weekly_drops: {
    minTier: 'PLUS',
    displayName: 'Vault Weekly Drops',
    description:
      'A curated featured cocktail drops every week — full story, technique, and sourcing context.',
    paywallTarget: 'plus',
    category: 'discovery',
  },
};

// ============================================================================
// ACCESS HELPERS
// ============================================================================

const TIER_RANK: Record<UserTier, number> = {
  FREE: 0,
  PLUS: 1,
  PRO: 2,
};

/**
 * Check if a tier meets the minimum requirement for a feature.
 */
export function hasFeatureAccessByKey(featureKey: FeatureKey, userTier: UserTier): boolean {
  const feature = FEATURE_REGISTRY[featureKey];
  if (!feature) return false;
  return TIER_RANK[userTier] >= TIER_RANK[feature.minTier];
}

/**
 * Get the feature definition for a given key.
 */
export function getFeatureDefinition(featureKey: FeatureKey): FeatureDefinition | undefined {
  return FEATURE_REGISTRY[featureKey];
}

/**
 * Get all features for a specific category.
 */
export function getFeaturesByCategory(
  category: FeatureCategory,
): { key: FeatureKey; definition: FeatureDefinition }[] {
  return (Object.entries(FEATURE_REGISTRY) as [FeatureKey, FeatureDefinition][])
    .filter(([, def]) => def.category === category)
    .map(([key, definition]) => ({ key, definition }));
}

/**
 * Get all features that a tier unlocks (not available at the tier below).
 */
export function getFeaturesUnlockedByTier(
  tier: UserTier,
): { key: FeatureKey; definition: FeatureDefinition }[] {
  return (Object.entries(FEATURE_REGISTRY) as [FeatureKey, FeatureDefinition][])
    .filter(([, def]) => def.minTier === tier)
    .map(([key, definition]) => ({ key, definition }));
}
