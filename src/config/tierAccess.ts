/**
 * Tier-based access control configuration
 * Defines what content is accessible at each subscription tier
 */

export type UserTier = 'FREE' | 'PLUS' | 'PRO';

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

/**
 * Tier limits — numeric caps for gating logic
 */
export const TIER_LIMITS = {
  FREE: {
    maxBottles: 10,
    maxScansPerMonth: Infinity,
    maxSavedCocktails: 0,
    maxAIMessagesPerDay: 3,
    maxBarProfiles: 1,
  },
  PLUS: {
    maxBottles: Infinity,
    maxScansPerMonth: Infinity,
    maxSavedCocktails: Infinity,
    maxAIMessagesPerDay: Infinity,
    maxBarProfiles: 2,
  },
  PRO: {
    maxBottles: Infinity,
    maxScansPerMonth: Infinity,
    maxSavedCocktails: Infinity,
    maxAIMessagesPerDay: Infinity,
    maxBarProfiles: Infinity,
  },
} as const;

/**
 * Features accessible by tier
 * Structured by the Lounge Model: FREE "Starter Bar", PLUS "Core Precision", PRO "Precision Mode"
 */
export const TIER_FEATURES = {
  FREE: {
    // Inventory
    inventoryLimit: 10,
    scansPerMonth: Infinity,
    multiBarProfiles: 1,

    // Discovery
    whatCanIMake: 'spirit-filter-only',
    recipeFilters: 'basic', // Spirit filter only
    cocktails: FREE_TIER_COCKTAILS.length,
    recipesFullAccess: FREE_TIER_COCKTAILS,
    recipesLockedPreview: true,
    savedCocktails: 0,

    // AI
    aiCoach: 'basic', // No memory, no Taste Match %
    tasteMatch: false,
    flavorTagsVisible: false,
    moodSuggestions: false,
    predictiveEngine: false,
    longMemory: false,

    // Hosting
    partyScaling: 'manual-only',
    shoppingListExport: false,
    hostingPlanner: false,
    hostingBasic: false,
    hostingAdvanced: false,
    batchOptimizer: false,
    guestMenuGenerator: false,
    prepTimeline: false,

    // Commerce — cart always open
    cartPurchase: true,
    cartAddItem: true,
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

    // Legacy features (kept for backward compatibility)
    lessons: 'intro-only',
    seasonalVaultAccess: 'earn-only',
    monthlyDrops: 'mini-drop',
    challenges: 'limited',
    brandPerks: false,
    offlineMode: false,
    recipeBuilder: 'basic',
    creatorTools: false,
  },

  PLUS: {
    // Inventory
    inventoryLimit: Infinity,
    scansPerMonth: Infinity,
    multiBarProfiles: 2,

    // Discovery
    whatCanIMake: 'advanced-filters',
    recipeFilters: 'advanced', // ≤5 ingredients, low sugar, spirit-forward
    cocktails: 'unlimited',
    recipesFullAccess: 'all',
    recipesLockedPreview: false,
    savedCocktails: Infinity,

    // AI
    aiCoach: 'enhanced', // Taste Match (basic), mood-based suggestions
    tasteMatch: 'basic',
    flavorTagsVisible: true,
    moodSuggestions: 'basic',
    predictiveEngine: false,
    longMemory: false,

    // Hosting
    partyScaling: 'calculator',
    shoppingListExport: true,
    hostingPlanner: false,
    hostingBasic: true,
    hostingAdvanced: false,
    batchOptimizer: false,
    guestMenuGenerator: false,
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

    // Legacy features
    lessons: 'unlimited',
    seasonalVaultAccess: 'standard',
    monthlyDrops: 'full-access',
    challenges: 'full-access',
    brandPerks: 'light',
    offlineMode: true,
    recipeBuilder: 'enhanced',
    creatorTools: false,
  },

  PRO: {
    // Inventory
    inventoryLimit: Infinity,
    scansPerMonth: Infinity,
    multiBarProfiles: Infinity,

    // Discovery
    whatCanIMake: 'predictive',
    recipeFilters: 'advanced-plus-predictive',
    cocktails: 'unlimited',
    recipesFullAccess: 'all',
    recipesLockedPreview: false,
    savedCocktails: Infinity,

    // AI
    aiCoach: 'priority', // Full Taste Graph, predictive engine, long memory
    tasteMatch: 'full-graph',
    flavorTagsVisible: true,
    moodSuggestions: 'advanced',
    predictiveEngine: true,
    longMemory: true,

    // Hosting
    partyScaling: 'batch-optimizer',
    shoppingListExport: true,
    hostingPlanner: true,
    hostingBasic: true,
    hostingAdvanced: true,
    batchOptimizer: true,
    guestMenuGenerator: true,
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

    // Pro Builder
    remixEngine: true,
    ratioBalancing: true,
    flavorCorrectionAI: true,
    templateBuilder: true,
    optimizeMyBar: true,
    flavorProfileDashboard: true,
    adjustableFlavorControls: true,
    brandCapture: true,

    // Education
    education: 'guides-techniques-video',

    // XP & Mastery
    xpEarn: true,
    xpLevels: true,
    masteryLessons: true,
    practiceMode: true,
    certifications: true,
    vaultProDrops: true,

    // Legacy features
    lessons: 'unlimited-plus-masterclasses',
    seasonalVaultAccess: 'early-access-plus-monthly-key',
    monthlyDrops: 'early-access-plus-exclusives',
    challenges: 'vip-only',
    brandPerks: 'exclusive-offers-tastings-early-event-access',
    offlineMode: true,
    recipeBuilder: 'pro-advanced-flavour-modelling',
    creatorTools: 'menu-exporter-upload-recipes-private-themes',
  },
} as const;

/**
 * Check if a cocktail is accessible for a given tier
 * Note: This only checks tier access, not XP unlocks
 * For complete access check, also check isCocktailUnlockedWithXP from useXPSystem
 */
export function isCocktailAccessible(cocktailId: string, tier: UserTier): boolean {
  if (tier === 'PLUS' || tier === 'PRO') {
    return true; // All cocktails accessible
  }

  // FREE tier: only 9 classics (plus any XP-unlocked, checked separately)
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
    return 'Upgrade to KOOPE+ to unlock all cocktails and recipes';
  }
  if (tier === 'PLUS' && feature === 'pro-exclusive') {
    return 'Upgrade to KOOPE PRO for exclusive content and features';
  }
  return 'Upgrade to access this feature';
}
