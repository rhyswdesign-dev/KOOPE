/**
 * Tier Access Control Utilities
 * Determines what content/features users can access based on their tier
 */

import { UserTier } from '../store/useUserTier';

/**
 * Convert tier to numeric level for comparison
 */
export const getTierLevel = (tier: UserTier): number => {
  switch (tier) {
    case 'FREE':
      return 0;
    case 'PLUS':
      return 1;
    case 'PRO':
      return 2;
  }
};

/**
 * Check if user can access content based on tier requirement
 */
export const canAccessContent = (
  userTier: UserTier,
  requiredTier?: UserTier
): boolean => {
  if (!requiredTier) return true; // No tier requirement = accessible to all
  return getTierLevel(userTier) >= getTierLevel(requiredTier);
};

/**
 * Check if user has early access to seasonal content
 */
export const hasEarlySeasonalAccess = (tier: UserTier): boolean => {
  return tier === 'PRO';
};

/**
 * Get inventory item cap based on tier
 * @returns number of items allowed, or null for unlimited
 */
export const getInventoryCap = (tier: UserTier): number | null => {
  return tier === 'FREE' ? 10 : null; // FREE = 10 items, PLUS/PRO = unlimited
};

/**
 * Check if user can access masterclass content
 */
export const canAccessMasterclasses = (tier: UserTier): boolean => {
  return tier === 'PRO';
};

/**
 * Check if user has creator tools access
 */
export const hasCreatorTools = (tier: UserTier): boolean => {
  return tier === 'PRO';
};

/**
 * Check if user has offline mode
 */
export const hasOfflineMode = (tier: UserTier): boolean => {
  return tier === 'PLUS' || tier === 'PRO';
};

/**
 * Get XP earning multiplier based on tier
 */
export const getXPMultiplier = (tier: UserTier): number => {
  switch (tier) {
    case 'FREE':
      return 1.0; // Base rate
    case 'PLUS':
      return 1.25; // 25% bonus
    case 'PRO':
      return 1.5; // 50% bonus
  }
};

/**
 * Calculate actual XP earned based on base XP and user tier
 */
export const calculateXPEarned = (baseXP: number, tier: UserTier): number => {
  return Math.floor(baseXP * getXPMultiplier(tier));
};

/**
 * Get tier display name
 */
export const getTierDisplayName = (tier: UserTier): string => {
  switch (tier) {
    case 'FREE':
      return 'Free';
    case 'PLUS':
      return 'KOOPE+';
    case 'PRO':
      return 'KOOPE PRO';
  }
};

/**
 * Get tier color for UI
 */
export const getTierColor = (tier: UserTier): string => {
  switch (tier) {
    case 'FREE':
      return '#8B7355'; // Muted brown
    case 'PLUS':
      return '#D68A38'; // Amber accent
    case 'PRO':
      return '#FFD700'; // Gold
  }
};

/**
 * Get tier icon name (Ionicons)
 */
export const getTierIcon = (tier: UserTier): string => {
  switch (tier) {
    case 'FREE':
      return 'person-outline';
    case 'PLUS':
      return 'star';
    case 'PRO':
      return 'diamond';
  }
};

/**
 * Check if user can save unlimited items
 */
export const hasUnlimitedSaves = (tier: UserTier): boolean => {
  return tier !== 'FREE';
};

/**
 * Get save limit for FREE users
 */
export const getSaveLimit = (tier: UserTier): number | null => {
  return tier === 'FREE' ? 20 : null; // FREE = 20 saves, PLUS/PRO = unlimited
};

/**
 * Check if user has enhanced AI coach
 */
export const hasEnhancedAI = (tier: UserTier): boolean => {
  return tier === 'PLUS' || tier === 'PRO';
};

/**
 * Check if user has priority AI with full context
 */
export const hasPriorityAI = (tier: UserTier): boolean => {
  return tier === 'PRO';
};

/**
 * Check if user can access full cocktail library
 */
export const hasFullCocktailLibrary = (tier: UserTier): boolean => {
  return tier === 'PLUS' || tier === 'PRO';
};

/**
 * Check if user has access to pro-only cocktail variations
 */
export const hasProCocktails = (tier: UserTier): boolean => {
  return tier === 'PRO';
};
