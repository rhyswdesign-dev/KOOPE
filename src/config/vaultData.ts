/**
 * VAULT & XP ECOSYSTEM - MOCK DATA
 *
 * This file contains all mock Vault items for testing and development.
 * In production, this would be fetched from a backend API.
 *
 * Categories covered:
 * - Cocktail Variations (advanced twists on classics)
 * - Technique Playbooks (educational systems)
 * - Bar Features (curated bar profiles)
 * - Seasonal Drops (time-limited bundles)
 * - Vault Key Bundles (key purchase options)
 */

import { VaultItem, VaultCategoryMeta } from './vaultTypes';

// ============================================================================
// COCKTAIL VARIATIONS
// ============================================================================

const cocktailVariations: VaultItem[] = [
  {
    id: 'smoked_old_fashioned',
    category: 'COCKTAIL_VARIATION',
    title: 'Smoked Old Fashioned',
    description: 'Master the art of smoke: wood chips, technique, and balance.',
    baseClassicId: 'old_fashioned',
    difficulty: 'pro',
    tags: ['smoked', 'bourbon', 'aromatic'],
    xpCost: 2200,
    moneyPriceCents: 499,
    unlockMethod: 'XP_OR_MONEY',
    requiresTier: 'PLUS',
  },
  {
    id: 'spicy_margarita',
    category: 'COCKTAIL_VARIATION',
    title: 'Spicy Margarita',
    description: 'Jalapeño-infused tequila, perfectly balanced heat and citrus.',
    baseClassicId: 'margarita',
    difficulty: 'simple',
    tags: ['spicy', 'tequila', 'heat'],
    xpCost: 600,
    moneyPriceCents: 299,
    unlockMethod: 'XP_OR_MONEY',
  },
  {
    id: 'clarified_whiskey_sour',
    category: 'COCKTAIL_VARIATION',
    title: 'Clarified Whiskey Sour',
    description: 'Crystal-clear cocktail using milk punch clarification.',
    baseClassicId: 'whiskey_sour',
    difficulty: 'pro',
    tags: ['clarified', 'technique', 'whiskey'],
    xpCost: 1800,
    moneyPriceCents: 449,
    unlockMethod: 'XP_OR_MONEY',
    requiresTier: 'PRO',
  },
  {
    id: 'split_base_negroni',
    category: 'COCKTAIL_VARIATION',
    title: 'Split-Base Negroni',
    description: 'Half gin, half mezcal—smoky complexity meets bitter elegance.',
    baseClassicId: 'negroni',
    difficulty: 'seasonal',
    tags: ['split-base', 'mezcal', 'gin'],
    xpCost: 1100,
    moneyPriceCents: 349,
    unlockMethod: 'XP_OR_MONEY',
  },
  {
    id: 'espresso_martini_nitro',
    category: 'COCKTAIL_VARIATION',
    title: 'Nitro Espresso Martini',
    description: 'Nitrogen-infused for silky texture and cascading foam.',
    baseClassicId: 'espresso_martini',
    difficulty: 'pro',
    tags: ['nitro', 'coffee', 'vodka'],
    xpCost: 2000,
    moneyPriceCents: 499,
    unlockMethod: 'KEY_OR_XP',
    requiresTier: 'PRO',
  },
  {
    id: 'honey_ginger_daiquiri',
    category: 'COCKTAIL_VARIATION',
    title: 'Honey Ginger Daiquiri',
    description: 'Seasonal twist with honey syrup and fresh ginger.',
    baseClassicId: 'daiquiri',
    difficulty: 'seasonal',
    tags: ['honey', 'ginger', 'rum'],
    xpCost: 900,
    unlockMethod: 'XP_ONLY',
    isLimitedTime: true,
    availableFrom: '2025-12-01T00:00:00Z',
    availableUntil: '2026-03-01T00:00:00Z',
  },
];

// ============================================================================
// TECHNIQUE PLAYBOOKS
// ============================================================================

const techniquePlaybooks: VaultItem[] = [
  {
    id: 'ice_strategy_playbook',
    category: 'TECHNIQUE_PLAYBOOK',
    title: 'Ice Strategy Playbook',
    description: 'Master dilution control across all cocktail families.',
    playbookType: 'ICE_STRATEGY',
    keyOutcomes: [
      'Never over-dilute spirit-forward drinks',
      'Choose the right ice for shaken vs. stirred',
      'Control dilution in batched cocktails',
      'Understand temperature impact on flavor',
    ],
    xpCost: 800,
    unlockMethod: 'XP_ONLY',
  },
  {
    id: 'acid_control_playbook',
    category: 'TECHNIQUE_PLAYBOOK',
    title: 'Acid Control Playbook',
    description: 'Balance citrus, vinegar, and acid alternatives like a pro.',
    playbookType: 'ACID_CONTROL',
    keyOutcomes: [
      'Match acid levels to spirit strength',
      'Use verjus and shrubs effectively',
      'Fix overly sour or flat cocktails',
      'Create balanced tropical drinks',
    ],
    xpCost: 650,
    unlockMethod: 'XP_ONLY',
  },
  {
    id: 'batch_math_playbook',
    category: 'TECHNIQUE_PLAYBOOK',
    title: 'Batch Math Playbook',
    description: 'Scale recipes for parties without losing quality.',
    playbookType: 'BATCH_MATH',
    keyOutcomes: [
      'Calculate water dilution for pre-batched drinks',
      'Scale shaken cocktails to bottles',
      'Adjust citrus for batching',
      'Carbonate batched cocktails at home',
    ],
    xpCost: 900,
    unlockMethod: 'XP_ONLY',
    requiresTier: 'PLUS',
  },
  {
    id: 'speed_systems_playbook',
    category: 'TECHNIQUE_PLAYBOOK',
    title: 'Speed Systems Playbook',
    description: 'Professional efficiency for high-volume service.',
    playbookType: 'SPEED_SYSTEM',
    keyOutcomes: [
      'Build drinks in optimal order',
      'Organize your mise en place',
      'Execute 3+ drink rounds without delay',
      'Maintain quality under pressure',
    ],
    xpCost: 1200,
    unlockMethod: 'XP_ONLY',
    requiresTier: 'PRO',
  },
];

// ============================================================================
// BAR FEATURES
// ============================================================================

const barFeatures: VaultItem[] = [
  {
    id: 'bar_untitled_champagne_lounge',
    category: 'BAR_FEATURE' as const,
    title: 'Untitled Champagne Lounge',
    description: 'Luxury champagne experience in Downtown Calgary.',
    barName: 'Untitled Champagne Lounge',
    city: 'Calgary',
    vibeDescription: 'Sophisticated luxury with premium champagne, caviar pairings, and live piano jazz with Rocky Mountain views.',
    signatureCocktailName: 'Golden Bubbles',
    thumbnailKey: 'depth_frame_header_24', // Uses bar tab thumbnail
    xpCost: 1200,
    moneyPriceCents: 499,
    unlockMethod: 'XP_OR_MONEY' as const,
    requiresTier: 'PLUS' as const,
  },
  {
    id: 'bar_employees_only_nyc',
    category: 'BAR_FEATURE' as const,
    title: 'Employees Only',
    description: 'West Village institution serving craft cocktails since 2004.',
    barName: 'Employees Only',
    city: 'New York City',
    vibeDescription: 'Late-night energy, bartenders in white coats, serious cocktails.',
    signatureCocktailName: 'Ginger Smash',
    thumbnailKey: 'the_iron_flask', // Speakeasy vibe
    xpCost: 1400,
    moneyPriceCents: 399,
    unlockMethod: 'XP_OR_MONEY' as const,
    requiresTier: 'PLUS' as const,
    hasProEarlyAccess: true,
  },
  {
    id: 'bar_attaboy_nyc',
    category: 'BAR_FEATURE' as const,
    title: 'Attaboy',
    description: 'Intimate speakeasy on NYC\'s Lower East Side.',
    barName: 'Attaboy',
    city: 'New York City',
    vibeDescription: 'No menu, just conversation and classics done right.',
    signatureCocktailName: 'Bartender\'s Choice',
    thumbnailKey: 'the_velvet_curtain', // Intimate atmosphere
    xpCost: 1500,
    moneyPriceCents: 399,
    unlockMethod: 'XP_OR_MONEY' as const,
    requiresTier: 'PLUS' as const,
  },
  {
    id: 'bar_bar_raval_toronto',
    category: 'BAR_FEATURE' as const,
    title: 'Bar Raval',
    description: 'Spanish-inspired pintxos bar with stunning architecture.',
    barName: 'Bar Raval',
    city: 'Toronto',
    vibeDescription: 'Standing room only, Gaudí-esque interiors, vermut hour.',
    signatureCocktailName: 'Gin & Tonic with Spanish botanicals',
    thumbnailKey: 'the_gilded_lily', // Elegant architecture
    xpCost: 1300,
    unlockMethod: 'KEY_OR_XP' as const,
    requiresTier: 'PRO' as const,
  },
];

// ============================================================================
// SEASONAL DROPS
// ============================================================================

const seasonalDrops: VaultItem[] = [
  {
    id: 'winter_techniques_2026',
    category: 'SEASONAL_DROP' as const,
    title: 'Winter Techniques Drop',
    description: 'Hot toddy variations, mulled wine, and cold-weather classics.',
    seasonName: 'Winter 2026',
    includedItemIds: [
      'honey_ginger_daiquiri',
      'ice_strategy_playbook',
      'smoked_old_fashioned',
    ],
    xpCost: 2500,
    unlockMethod: 'KEY_OR_XP' as const,
    isLimitedTime: true,
    availableFrom: '2025-12-01T00:00:00Z',
    availableUntil: '2026-03-01T00:00:00Z',
  },
];

// ============================================================================
// VAULT KEY BUNDLES
// ============================================================================

const vaultKeyBundles: VaultItem[] = [
  {
    id: 'vault_key_single',
    category: 'VAULT_KEY_BUNDLE' as const,
    title: 'Single Vault Key',
    description: 'Unlock one premium item or early seasonal drop.',
    keysGranted: 1,
    moneyPriceCents: 299,
    unlockMethod: 'KEY_OR_MONEY' as const,
  },
  {
    id: 'vault_key_triple',
    category: 'VAULT_KEY_BUNDLE' as const,
    title: '3-Key Bundle',
    description: 'Best value for serious learners. Save 20%.',
    keysGranted: 3,
    moneyPriceCents: 699,
    unlockMethod: 'KEY_OR_MONEY' as const,
  },
];

// ============================================================================
// COMBINED VAULT ITEMS
// ============================================================================

export const vaultItems: VaultItem[] = [
  ...cocktailVariations,
  ...techniquePlaybooks,
  ...barFeatures,
  ...seasonalDrops,
  ...vaultKeyBundles,
];

// ============================================================================
// CATEGORY METADATA (for UI)
// ============================================================================

export const vaultCategoryMetadata: VaultCategoryMeta[] = [
  {
    category: 'COCKTAIL_VARIATION',
    displayName: 'Cocktail Variations',
    description: 'Advanced twists on classic cocktails',
    icon: '🍸',
  },
  {
    category: 'TECHNIQUE_PLAYBOOK',
    displayName: 'Technique Playbooks',
    description: 'Master professional systems and skills',
    icon: '📖',
  },
  {
    category: 'BAR_FEATURE',
    displayName: 'Bar Features',
    description: 'Curated profiles of legendary bars',
    icon: '🏛️',
  },
  {
    category: 'SEASONAL_DROP',
    displayName: 'Seasonal Drops',
    description: 'Limited-time content bundles',
    icon: '⏳',
  },
  {
    category: 'VAULT_KEY_BUNDLE',
    displayName: 'Vault Keys',
    description: 'Unlock premium content instantly',
    icon: '🔑',
  },
];
