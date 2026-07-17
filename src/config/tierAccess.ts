/**
 * Tier-based access control configuration
 * Defines what content is accessible at each subscription tier
 *
 * Phase 0.7 (tier collapse): the product is two tiers — FREE and KŌOPE+.
 * 'PRO' survives in this type only for backward compatibility with ~150
 * existing `tier === 'PRO'` references and any already-persisted
 * useUserTier state (see src/store/useUserTier.ts's legacy normalization).
 * It is not a distinct entitlement anymore: TIER_LIMITS.PRO and
 * TIER_FEATURES.PRO below are literal aliases of the PLUS objects, not
 * separately maintained data, so nothing can gate on PRO-only access again
 * by accident. Do not add a feature/limit that's true for PRO and false
 * for PLUS — there is deliberately no way to express that anymore.
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
  // Phase 0.7 (tier collapse): PRO's limits were already byte-for-byte
  // identical to PLUS's before this pass — kept as its own key (rather
  // than deleted) only so `TIER_LIMITS[tier]` stays a total function for
  // any surviving `UserTier === 'PRO'` value (see the type comment above).
  // Never let this drift from PLUS.
  PRO: {
    maxBottles: Infinity,
    maxScansPerMonth: Infinity,
    maxSavedCocktails: Infinity,
    maxBarProfiles: Infinity,
  },
} as const;

/**
 * Features accessible by tier
 *
 * Phase 0.7 (tier collapse): PLUS and PRO used to be genuinely different —
 * PRO added Pro Builder tools, deeper Smart Inventory analytics, and the
 * full hosting suite that PLUS didn't have. Per the workplan ("everything
 * currently PLUS or PRO → KŌOPE+"), PLUS below is now the *union* of what
 * PLUS and PRO each granted — nothing that used to require PRO is lost,
 * it just no longer requires a second, higher-paying tier. PRO is kept as
 * a literal duplicate of PLUS (not a reference — `as const` object
 * literals can't self-reference a sibling key) purely so any surviving
 * `UserTier === 'PRO'` check keeps working identically to PLUS. If you
 * add a feature, add it to both and keep them identical — see the
 * UserTier type comment above.
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

    // Discovery — 'full-catalog' (was 'advanced-filters' pre-collapse; that
    // was PRO's value)
    whatCanIMake: 'full-catalog',
    recipeFilters: 'advanced', // ≤5 ingredients, low sugar, spirit-forward
    cocktails: 'unlimited',
    recipesFullAccess: 'all',
    recipesLockedPreview: false,
    savedCocktails: Infinity,

    // Hosting — full loop (was the 'calculator'/basic-only set pre-collapse;
    // these four lines are PRO's former values)
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
    smartCartPreview: true, // was 'non-aggressive' pre-collapse; PRO's boolean value wins

    // Smart Inventory — full analytics suite (deadBottleDetection through
    // predictiveRestock were PRO-exclusive pre-collapse)
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

    // Pro Builder — ratio + remix + save own versions (all PRO-exclusive
    // pre-collapse)
    remixEngine: true,
    ratioBalancing: true,
    flavorCorrectionAI: true,
    templateBuilder: true,
    optimizeMyBar: true,
    flavorProfileDashboard: true,
    adjustableFlavorControls: true,
    brandCapture: true,

    // Education
    education: false,

    // XP — all tiers earn
    xpEarn: true,

    // Vault — was false pre-collapse; PRO's value wins
    vaultProDrops: true,

    // Legacy — was 'standard' pre-collapse; PRO's value wins
    seasonalVaultAccess: 'early-access-plus-monthly-key',
    challenges: 'full-access',
    offlineMode: true,
  },

  // Phase 0.7 (tier collapse): literal duplicate of PLUS, not a reference
  // (see the TIER_FEATURES doc comment above) — kept only so a surviving
  // `UserTier === 'PRO'` value behaves identically to PLUS. Never let this
  // drift; if you change PLUS, change this to match.
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

    // Hosting
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
    education: false,

    // XP
    xpEarn: true,

    // Vault
    vaultProDrops: true,

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
  whiskey: ['old-fashioned', 'manhattan', 'whiskey-sour'],
  bourbon: ['old-fashioned', 'manhattan', 'whiskey-sour'],
  scotch: ['old-fashioned', 'manhattan', 'whiskey-sour'],
  rye: ['old-fashioned', 'manhattan', 'whiskey-sour'],
  gin: ['martini', 'negroni'],
  rum: ['mojito', 'daiquiri'],
  tequila: ['margarita'],
  vodka: ['moscow-mule'],
  brandy: [],
  cognac: [],
  mezcal: [],
  liqueur: [],
  campari: ['negroni', 'americano'],
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
