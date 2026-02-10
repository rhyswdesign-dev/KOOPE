/**
 * VAULT & XP ECOSYSTEM - TYPE DEFINITIONS
 *
 * Core types for the Vault system:
 * - User tiers and access levels
 * - Vault categories (variations, playbooks, bar features, games, etc.)
 * - Unlock methods (XP, Money)
 * - Item structures for all content types
 */

// ============================================================================
// USER TIER
// ============================================================================

export type UserTier = "FREE" | "PLUS" | "PRO";

// ============================================================================
// VAULT CATEGORY
// ============================================================================

export type VaultCategory =
  | "COCKTAIL_VARIATION"
  | "TECHNIQUE_PLAYBOOK"
  | "BAR_FEATURE"
  | "SEASONAL_DROP"
  | "DRINKING_GAME";

// ============================================================================
// UNLOCK METHOD
// ============================================================================

export type UnlockMethod =
  | "XP_ONLY"           // Can only be unlocked with XP
  | "XP_OR_MONEY";      // Can be unlocked with XP or purchased

// ============================================================================
// VAULT ITEM BASE INTERFACE
// ============================================================================

export interface VaultItemBase {
  id: string;                    // unique slug
  title: string;
  description: string;
  category: VaultCategory;
  xpCost?: number;               // if unlockable via XP
  moneyPriceCents?: number;      // if unlockable via money (e.g., 399 = $3.99)
  unlockMethod: UnlockMethod;
  requiresTier?: UserTier;       // minimum tier required ("PLUS" or "PRO")
  isLimitedTime?: boolean;       // true if seasonal/time-limited
  availableFrom?: string;        // ISO date string
  availableUntil?: string;       // ISO date string
  imageUrl?: string;             // optional image for the card
}

// ============================================================================
// COCKTAIL VARIATION ITEM
// ============================================================================

export interface CocktailVariationItem extends VaultItemBase {
  category: "COCKTAIL_VARIATION";
  baseClassicId: string;         // references Classic Pool ID (e.g., "old_fashioned")
  difficulty: "simple" | "seasonal" | "pro";
  tags: string[];                // e.g., ["smoked", "spicy", "clarified"]
}

// ============================================================================
// TECHNIQUE PLAYBOOK ITEM
// ============================================================================

export type TechniquePlaybookType =
  | "ICE_STRATEGY"
  | "ACID_CONTROL"
  | "BATCH_MATH"
  | "SPEED_SYSTEM";

export interface TechniquePlaybookItem extends VaultItemBase {
  category: "TECHNIQUE_PLAYBOOK";
  playbookType: TechniquePlaybookType;
  keyOutcomes: string[];         // bullet points describing what you'll learn
}

// ============================================================================
// BAR FEATURE ITEM
// ============================================================================

export interface BarFeatureItem extends VaultItemBase {
  category: "BAR_FEATURE";
  barName: string;
  city: string;
  vibeDescription: string;
  signatureCocktailName: string;
  thumbnailKey?: string;         // Key to look up thumbnail image
  hasProEarlyAccess?: boolean;   // PRO tier gets early access
}

// ============================================================================
// SEASONAL DROP ITEM
// ============================================================================

export interface SeasonalDropItem extends VaultItemBase {
  category: "SEASONAL_DROP";
  seasonName: string;            // e.g., "Winter Techniques"
  includedItemIds: string[];     // references other Vault item IDs
}

// ============================================================================
// DRINKING GAME ITEM
// ============================================================================

export interface DrinkingGameItem extends VaultItemBase {
  category: "DRINKING_GAME";
  players: string;
  gameDifficulty: "Easy" | "Medium" | "Hard";
  origin: string;
}

// ============================================================================
// UNIFIED VAULT ITEM TYPE
// ============================================================================

export type VaultItem =
  | CocktailVariationItem
  | TechniquePlaybookItem
  | BarFeatureItem
  | SeasonalDropItem
  | DrinkingGameItem;

// ============================================================================
// USER VAULT STATE
// ============================================================================

export interface UserVaultState {
  userId: string;
  tier: UserTier;
  xp: number;
  ownedItemIds: string[];        // IDs of items user has unlocked
}

// ============================================================================
// CATEGORY METADATA (for UI display)
// ============================================================================

export interface VaultCategoryMeta {
  category: VaultCategory;
  displayName: string;
  description: string;
  icon: string;                  // emoji or icon name
}
