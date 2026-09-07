/**
 * Affiliate Linking Service — P4 Commerce Infrastructure
 *
 * Modular affiliate system designed for future retailer partnerships.
 * Architecture:
 *   - AffiliateProvider interface for plugging in new retailers
 *   - Provider registry for managing active providers
 *   - Click tracking for attribution analytics
 *   - Deep link generation from ingredient names
 *
 * Start with generic search links, upgrade to API integrations later.
 */

import { Linking } from 'react-native';
import { trackEvent, ANALYTICS_EVENTS, ANALYTICS_PROPS } from '../lib/analytics';
import { log } from '../lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface AffiliateProvider {
  /** Unique provider key */
  id: string;
  /** Display name */
  name: string;
  /** Provider logo URL (for UI) */
  logoUrl?: string;
  /** Whether this provider is currently active */
  isActive: boolean;
  /** Generate a product search URL for an ingredient */
  buildSearchUrl: (query: string, category?: string) => string;
  /** Generate a direct product URL if we have a product ID */
  buildProductUrl?: (productId: string) => string;
  /** Affiliate tag/tracking parameter */
  affiliateTag?: string;
}

export interface AffiliateLink {
  /** The provider that generated this link */
  provider: string;
  /** Display name for the provider */
  providerName: string;
  /** The URL to open */
  url: string;
  /** What ingredient/product this links to */
  productQuery: string;
  /** Logo URL for UI */
  logoUrl?: string;
}

export interface AffiliateClickEvent {
  provider: string;
  productQuery: string;
  url: string;
  source: string; // Which screen triggered this
}

// ============================================================================
// PROVIDER IMPLEMENTATIONS
// ============================================================================

/**
 * Drizly — alcohol delivery service.
 * Uses search URL format with affiliate tag placeholder.
 */
const drizlyProvider: AffiliateProvider = {
  id: 'drizly',
  name: 'Drizly',
  isActive: true,
  affiliateTag: '', // Set via config when partnership is active
  buildSearchUrl: (query: string) => {
    const encoded = encodeURIComponent(query);
    return `https://drizly.com/search?q=${encoded}`;
  },
};

/**
 * Total Wine — retail chain.
 */
const totalWineProvider: AffiliateProvider = {
  id: 'total_wine',
  name: 'Total Wine',
  isActive: true,
  buildSearchUrl: (query: string) => {
    const encoded = encodeURIComponent(query);
    return `https://www.totalwine.com/search/all?text=${encoded}`;
  },
};

/**
 * Amazon — general fallback for non-alcohol ingredients.
 */
const amazonProvider: AffiliateProvider = {
  id: 'amazon',
  name: 'Amazon',
  isActive: true,
  affiliateTag: '', // Set via config when partnership is active
  buildSearchUrl: (query: string, _category?: string) => {
    const encoded = encodeURIComponent(query);
    const tag = amazonProvider.affiliateTag ? `&tag=${amazonProvider.affiliateTag}` : '';
    return `https://www.amazon.com/s?k=${encoded}${tag}`;
  },
};

// ============================================================================
// PROVIDER REGISTRY
// ============================================================================

const providerRegistry: Map<string, AffiliateProvider> = new Map();

// Register default providers
providerRegistry.set('drizly', drizlyProvider);
providerRegistry.set('total_wine', totalWineProvider);
providerRegistry.set('amazon', amazonProvider);

/**
 * Register a new affiliate provider.
 */
export function registerProvider(provider: AffiliateProvider): void {
  providerRegistry.set(provider.id, provider);
}

/**
 * Remove a provider from the registry.
 */
export function unregisterProvider(providerId: string): void {
  providerRegistry.delete(providerId);
}

/**
 * Get all active providers.
 */
export function getActiveProviders(): AffiliateProvider[] {
  return Array.from(providerRegistry.values()).filter((p) => p.isActive);
}

/**
 * Set affiliate tag for a provider (called during app config).
 */
export function setAffiliateTag(providerId: string, tag: string): void {
  const provider = providerRegistry.get(providerId);
  if (provider) {
    provider.affiliateTag = tag;
  }
}

// ============================================================================
// LINK GENERATION
// ============================================================================

/** Ingredient categories that should use alcohol-specific retailers */
const ALCOHOL_CATEGORIES = ['spirit', 'liqueur', 'wine', 'bitters'];

/**
 * Generate affiliate links for an ingredient across all active providers.
 *
 * @param ingredientName - The ingredient to search for
 * @param category - Optional category to pick the right retailer
 * @returns Array of affiliate links, best match first
 */
export function getAffiliateLinks(ingredientName: string, category?: string): AffiliateLink[] {
  const activeProviders = getActiveProviders();
  const isAlcohol = category && ALCOHOL_CATEGORIES.includes(category);

  // Prioritize alcohol retailers for spirits/liqueurs
  const sorted = [...activeProviders].sort((a, b) => {
    if (isAlcohol) {
      const aIsAlcohol = a.id === 'drizly' || a.id === 'total_wine';
      const bIsAlcohol = b.id === 'drizly' || b.id === 'total_wine';
      if (aIsAlcohol && !bIsAlcohol) return -1;
      if (!aIsAlcohol && bIsAlcohol) return 1;
    }
    return 0;
  });

  return sorted.map((provider) => ({
    provider: provider.id,
    providerName: provider.name,
    url: provider.buildSearchUrl(ingredientName, category),
    productQuery: ingredientName,
    logoUrl: provider.logoUrl,
  }));
}

/**
 * Get the single best affiliate link for an ingredient.
 */
export function getBestAffiliateLink(
  ingredientName: string,
  category?: string,
): AffiliateLink | null {
  const links = getAffiliateLinks(ingredientName, category);
  return links[0] || null;
}

// ============================================================================
// CLICK TRACKING & OPENING
// ============================================================================

/**
 * Open an affiliate link and track the click event.
 *
 * @param link - The affiliate link to open
 * @param source - Which screen/component triggered this (for analytics)
 */
export async function openAffiliateLink(link: AffiliateLink, source: string): Promise<boolean> {
  try {
    // Phase 3.2: linking out to a third-party retailer for a physical
    // product (a bottle, via an external browser/retailer app — never
    // in-app checkout) is standard and allowed on iOS; the App Store
    // restriction this used to guard against is specifically about
    // bypassing in-app purchase for digital goods, which doesn't apply
    // here. No in-app checkout ships, per the workplan's 3.2 spec.

    // Track the click
    trackEvent(ANALYTICS_EVENTS.AFFILIATE_LINK_CLICKED, {
      [ANALYTICS_PROPS.AFFILIATE_PROVIDER]: link.provider,
      [ANALYTICS_PROPS.INGREDIENT_NAME]: link.productQuery,
      [ANALYTICS_PROPS.SOURCE]: source,
    });

    // Open the URL
    const canOpen = await Linking.canOpenURL(link.url);
    if (canOpen) {
      await Linking.openURL(link.url);
      return true;
    }

    log.warn('Affiliate', 'Cannot open URL', { url: link.url });
    return false;
  } catch (error) {
    log.error('Affiliate', 'Error opening affiliate link', error);
    return false;
  }
}

/**
 * Shortcut: find best link for an ingredient and open it.
 */
export async function buyIngredient(
  ingredientName: string,
  category?: string,
  source: string = 'unknown',
): Promise<boolean> {
  const link = getBestAffiliateLink(ingredientName, category);
  if (!link) return false;
  return openAffiliateLink(link, source);
}
