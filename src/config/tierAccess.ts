/**
 * Tier-based access control configuration
 * Defines what content is accessible at each subscription tier
 */

export type UserTier = 'FREE' | 'PLUS' | 'PRO';

/**
 * Number of free recipe cards shown in the post-scan Answer Card's "unlocks N
 * cocktails" hook, before the locked-card paywall tease.
 */
export const ANSWER_CARD_FREE_RECIPE_COUNT = 3;

/**
 * FREE tier gets access to these 9 classic cocktails with full recipe cards
 */
export const FREE_TIER_COCKTAILS = [
  'old-fashioned',
  'margarita',
  'martini',
  'manhattan',
  'mojito',
  'whiskey-sour',
  'daiquiri',
  'negroni',
  'moscow-mule',
] as const;

// Temporary dev-only preview list for lesson-linked unlock recipes.
// These remain locked in production unless the user actually unlocks them.
export const DEV_PREVIEW_UNLOCK_COCKTAILS = [
  'house-daiquiri-spec',
  'stirred-house-martini',
  'boulevardier',
  'tom-collins-house-spec',
] as const;

/**
 * Tier limits — numeric caps for gating logic
 */
export const TIER_LIMITS = {
  FREE: {
    maxBottles: 10,
    // Scans are unlimited in count — per-bottle XP diminishing returns are the gate.
    // First scan: 50 XP. Repeat: 5 XP × max 3, then 0 for that bottle. No daily
    // cap (Phase 0.6 removed it) — XP -> Level -> Unlocks is uncapped by design.
    maxScansPerMonth: Infinity,
    maxSavedCocktails: 0,
    maxBarProfiles: Infinity, // Multi-bar no longer gated
  },
  PLUS: {
    maxBottles: Infinity,
    maxScansPerMonth: Infinity,
    maxSavedCocktails: Infinity,
    maxBarProfiles: Infinity,
  },
  PRO: {
    maxBottles: Infinity,
    maxScansPerMonth: Infinity,
    maxSavedCocktails: Infinity,
    maxBarProfiles: Infinity,
  },
} as const;

/**
 * Features accessible by tier
 * Structured by the identity ladder: FREE "Home Bar", PLUS "Bartender", PRO "Mixologist"
 */
export const TIER_FEATURES = {
  FREE: {
    // Inventory
    inventoryLimit: 10,
    scansPerMonth: Infinity,

    // Discovery
    whatCanIMake: 'basic',
    recipeFilters: 'basic', // Spirit filter only
    // XP-progressive unlock: free users unlock recipes by earning XP
    // Clear thumbnails shown for locked recipes with "Unlock at Level X" badge (no blur)
    recipesLockedPreview: false,
    savedCocktails: 0,

    // Hosting
    partyScaling: 'manual-only',
    shoppingListExport: false,
    hostingPlanner: false,
    hostingBasic: false,
    hostingAdvanced: false,
    prepTimeline: false,

    // Commerce — cart coming soon (feedback prompt shown)
    cartPurchase: false,
    cartAddItem: false,
    addMissingIngredients: false,
    smartCartPreview: false,

    // Smart Inventory
    smartInventory: false,
    barHealthScore: false,
    expiryAlerts: false,
    bottleLevelTracking: false,

    // Pro Builder
    remixEngine: false,
    ratioBalancing: false,
    flavorCorrectionAI: false,
    templateBuilder: false,
    optimizeMyBar: false,
    flavorProfileDashboard: false,
    adjustableFlavorControls: false,
    brandCapture: false,

    // Education
    education: false,

    // XP — all tiers earn
    xpEarn: true,

    // Vault
    vaultProDrops: false,

    // Legacy
    seasonalVaultAccess: 'earn-only',
    challenges: 'limited',
    offlineMode: false,
  },

  PLUS: {
    // Inventory
    inventoryLimit: Infinity,
    scansPerMonth: Infinity,

    // Discovery
    whatCanIMake: 'advanced-filters',
    recipeFilters: 'advanced', // ≤5 ingredients, low sugar, spirit-forward
    cocktails: 'unlimited',
    recipesFullAccess: 'all',
    recipesLockedPreview: false,
    savedCocktails: Infinity,

    // Hosting
    partyScaling: 'calculator',
    shoppingListExport: true,
    hostingPlanner: false,
    hostingBasic: true,
    hostingAdvanced: false,
    prepTimeline: false,

    // Commerce — cart always open
    cartPurchase: true,
    cartAddItem: true,
    addMissingIngredients: true,
    smartCartPreview: 'non-aggressive',

    // Smart Inventory
    smartInventory: true,
    barHealthScore: true,
    expiryAlerts: true,
    bottleLevelTracking: true,

    // Pro Builder
    remixEngine: false,
    ratioBalancing: false,
    flavorCorrectionAI: false,
    templateBuilder: false,
    optimizeMyBar: true,
    flavorProfileDashboard: false,
    adjustableFlavorControls: false,
    brandCapture: false,

    // Education
    education: false,

    // XP — all tiers earn
    xpEarn: true,

    // Vault
    vaultProDrops: false,

    // Legacy
    seasonalVaultAccess: 'standard',
    challenges: 'full-access',
    offlineMode: true,
  },

  PRO: {
    // Inventory
    inventoryLimit: Infinity,
    scansPerMonth: Infinity,

    // Discovery
    whatCanIMake: 'full-catalog',
    recipeFilters: 'advanced',
    cocktails: 'unlimited',
    recipesFullAccess: 'all',
    recipesLockedPreview: false,
    savedCocktails: Infinity,

    // Hosting — full loop: guest count → cocktail picks → scaled ingredients → prep timeline
    partyScaling: 'full',
    shoppingListExport: true,
    hostingPlanner: true,
    hostingBasic: true,
    hostingAdvanced: true,
    prepTimeline: true,

    // Commerce — cart always open
    cartPurchase: true,
    cartAddItem: true,
    addMissingIngredients: true,
    smartCartPreview: true,

    // Smart Inventory
    smartInventory: true,
    barHealthScore: true,
    expiryAlerts: true,
    bottleLevelTracking: true,
    deadBottleDetection: true,
    usageFrequency: true,
    costTracking: true,
    barValueCalculator: true,
    seasonalAlerts: true,
    predictiveRestock: true,

    // Pro Builder — ratio + remix + save own versions
    remixEngine: true,
    ratioBalancing: true,
    flavorCorrectionAI: true,
    templateBuilder: true,
    optimizeMyBar: true,
    flavorProfileDashboard: true,
    adjustableFlavorControls: true,
    brandCapture: true,

    // Vault
    vaultProDrops: true,

    // XP
    xpEarn: true,

    // Legacy
    seasonalVaultAccess: 'early-access-plus-monthly-key',
    challenges: 'full-access',
    offlineMode: true,
  },
} as const;

/**
 * Curated post-scan recipe suggestions per spirit for Free users.
 * Each spirit maps to up to 3 recipe IDs drawn from FREE_TIER_COCKTAILS.
 * These are shown immediately after scanning a bottle so Free users always
 * see the most relevant starting recipes for what they just scanned.
 */
export const SPIRIT_STARTER_MAP: Record<string, string[]> = {
  whiskey:  ['old-fashioned', 'manhattan', 'whiskey-sour'],
  bourbon:  ['old-fashioned', 'manhattan', 'whiskey-sour'],
  scotch:   ['old-fashioned', 'manhattan', 'whiskey-sour'],
  rye:      ['old-fashioned', 'manhattan', 'whiskey-sour'],
  gin:      ['martini', 'negroni'],
  rum:      ['mojito', 'daiquiri'],
  tequila:  ['margarita'],
  vodka:    ['moscow-mule'],
  brandy:   [],
  cognac:   [],
  mezcal:   [],
  liqueur:  [],
  campari:  ['negroni', 'americano'],
};

/**
 * Check if a cocktail is accessible for a given tier.
 *
 * FREE tier: all cocktails visible with clear thumbnails — no blur.
 * Locked recipes show an "Unlock at Level X" XP badge instead.
 * For the full access check (tier + XP level), use isCocktailUnlockedWithXP from useXPSystem.
 *
 * PLUS/PRO: entire catalog unlocked — no XP gate.
 */
export function isCocktailAccessible(cocktailId: string, tier: UserTier): boolean {
  if (tier === 'PLUS' || tier === 'PRO') {
    return true;
  }

  if (__DEV__ && DEV_PREVIEW_UNLOCK_COCKTAILS.includes(cocktailId as any)) {
    return true;
  }

  // FREE tier: starter classics are immediately accessible without XP.
  // All other recipes are accessible via XP unlock — checked separately via useXPSystem.
  return FREE_TIER_COCKTAILS.includes(cocktailId as any);
}

/**
 * Check if a feature is accessible for a given tier
 */
export function hasFeatureAccess(feature: string, tier: UserTier): boolean {
  const tierFeatures = TIER_FEATURES[tier];
  return (tierFeatures as any)[feature] !== false && (tierFeatures as any)[feature] !== 'limited';
}

/**
 * Get upgrade message for locked content
 */
export function getUpgradeMessage(tier: UserTier, feature?: string): string {
  if (tier === 'FREE') {
    return 'Upgrade to KŌOPE+ to unlock unlimited bottles and the full recipe catalog';
  }
  if (tier === 'PLUS' && feature === 'pro-exclusive') {
    return 'Upgrade to KŌOPE PRO for Vault drops, the recipe builder, and full hosting tools';
  }
  return 'Upgrade to access this feature';
}
