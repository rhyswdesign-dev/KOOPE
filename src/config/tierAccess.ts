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
 * Features accessible by tier
 */
export const TIER_FEATURES = {
  FREE: {
    // Lessons
    lessons: 'intro-only', // Limited to intro lessons

    // Cocktails/Recipes
    cocktails: FREE_TIER_COCKTAILS.length, // 9 classic cocktails
    recipesFullAccess: FREE_TIER_COCKTAILS, // Full recipe cards for these 9
    recipesLockedPreview: true, // See thumbnails of locked cocktails (no names)

    // AI Coach
    aiCoach: 'basic', // Basic token-limited

    // Saves & Notes
    savesAndNotes: 'limited', // Limited saves

    // Inventory
    inventorySystem: 10, // 10-item cap

    // Vault
    seasonalVaultAccess: 'earn-only', // Can earn XP, locked seasonal items
    monthlyDrops: 'mini-drop', // Free mini-drop only

    // Challenges
    challenges: 'limited',

    // Brand Perks
    brandPerks: false,

    // Other Features
    offlineMode: false,
    recipeBuilder: 'basic',
    cocktailCards: 'limited-pack',
    homeBarPlan: 'basic-tips',
    eventDiscounts: false,
    certificationTracks: false,
    creatorTools: false,
    communityIdentity: 'general',
  },

  PLUS: {
    // Lessons
    lessons: 'unlimited',

    // Cocktails/Recipes
    cocktails: 'unlimited', // All cocktails
    recipesFullAccess: 'all', // Full access to all recipe cards
    recipesLockedPreview: false, // No locked content

    // AI Coach
    aiCoach: 'enhanced', // Enhanced taste + hosting intelligence

    // Saves & Notes
    savesAndNotes: 'unlimited',

    // Inventory
    inventorySystem: 'unlimited',

    // Vault
    seasonalVaultAccess: 'standard', // Standard seasonal access
    monthlyDrops: 'full-access',

    // Challenges
    challenges: 'full-access',

    // Brand Perks
    brandPerks: 'light',

    // Other Features
    offlineMode: true,
    recipeBuilder: 'enhanced',
    cocktailCards: 'full-library',
    homeBarPlan: 'monthly-personalized',
    eventDiscounts: 'light',
    certificationTracks: 'basic',
    creatorTools: false,
    communityIdentity: 'standard',
  },

  PRO: {
    // Lessons
    lessons: 'unlimited-plus-masterclasses',

    // Cocktails/Recipes
    cocktails: 'unlimited', // All cocktails
    recipesFullAccess: 'all', // Full access to all recipe cards
    recipesLockedPreview: false, // No locked content

    // AI Coach
    aiCoach: 'priority', // Priority AI with long memory, full context

    // Saves & Notes
    savesAndNotes: 'unlimited-plus-pro-tools',

    // Inventory
    inventorySystem: 'unlimited-plus-smart-suggestions',

    // Vault
    seasonalVaultAccess: 'early-access-plus-monthly-key', // Early access + free key
    monthlyDrops: 'early-access-plus-exclusives',

    // Challenges
    challenges: 'vip-only',

    // Brand Perks
    brandPerks: 'exclusive-offers-tastings-early-event-access',

    // Other Features
    offlineMode: true,
    recipeBuilder: 'pro-advanced-flavour-modelling',
    cocktailCards: 'pro-only-plus-variations',
    homeBarPlan: 'advanced-blueprint-plus-pdf',
    eventDiscounts: 'priority-plus-bigger-discounts',
    certificationTracks: 'verified-mixmind',
    creatorTools: 'menu-exporter-upload-recipes-private-themes',
    communityIdentity: 'elite-flair-badge-seasonal-crown',
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
