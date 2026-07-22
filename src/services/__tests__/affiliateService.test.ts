import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAffiliateLinks,
  getBestAffiliateLink,
  openAffiliateLink,
  buyIngredient,
  registerProvider,
  unregisterProvider,
  getActiveProviders,
  type AffiliateLink,
} from '../affiliateService';

const canOpenURLMock = vi.fn();
const openURLMock = vi.fn();

vi.mock('react-native', () => ({
  Linking: {
    canOpenURL: (...args: any[]) => canOpenURLMock(...args),
    openURL: (...args: any[]) => openURLMock(...args),
  },
}));

const trackEventMock = vi.fn();
vi.mock('../../lib/analytics', () => ({
  trackEvent: (...args: any[]) => trackEventMock(...args),
  ANALYTICS_EVENTS: { AFFILIATE_LINK_CLICKED: 'affiliate_link_clicked' },
  ANALYTICS_PROPS: {
    AFFILIATE_PROVIDER: 'affiliate_provider',
    INGREDIENT_NAME: 'ingredient_name',
    SOURCE: 'source',
  },
}));

vi.mock('../../lib/logger', () => ({
  log: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

describe('affiliateService', () => {
  beforeEach(() => {
    canOpenURLMock.mockReset();
    openURLMock.mockReset();
    trackEventMock.mockReset();
  });

  describe('getAffiliateLinks', () => {
    it('returns a link for every active provider', () => {
      const links = getAffiliateLinks('gin');
      expect(links.length).toBe(getActiveProviders().length);
      expect(links.every((l) => l.url.includes(encodeURIComponent('gin')))).toBe(true);
    });

    it('prioritizes alcohol retailers when category is alcohol-related', () => {
      const links = getAffiliateLinks('gin', 'spirit');
      const alcoholIds = ['drizly', 'total_wine'];
      const firstAlcoholIndex = links.findIndex((l) => alcoholIds.includes(l.provider));
      const amazonIndex = links.findIndex((l) => l.provider === 'amazon');
      expect(firstAlcoholIndex).toBeLessThan(amazonIndex);
    });
  });

  describe('getBestAffiliateLink', () => {
    it('returns the first ranked link', () => {
      const best = getBestAffiliateLink('vermouth', 'spirit');
      expect(best).not.toBeNull();
      expect(best?.productQuery).toBe('vermouth');
    });

    it('returns null when there are no active providers', () => {
      const active = getActiveProviders();
      active.forEach((p) => unregisterProvider(p.id));
      try {
        expect(getBestAffiliateLink('vermouth')).toBeNull();
      } finally {
        active.forEach((p) => registerProvider(p));
      }
    });
  });

  describe('openAffiliateLink', () => {
    const link: AffiliateLink = {
      provider: 'amazon',
      providerName: 'Amazon',
      url: 'https://www.amazon.com/s?k=gin',
      productQuery: 'gin',
    };

    it('tracks the click and opens the URL when it can be opened', async () => {
      canOpenURLMock.mockResolvedValue(true);
      openURLMock.mockResolvedValue(undefined);

      const result = await openAffiliateLink(link, 'grocery_list_modal');

      expect(result).toBe(true);
      expect(trackEventMock).toHaveBeenCalledWith(
        'affiliate_link_clicked',
        expect.objectContaining({
          affiliate_provider: 'amazon',
          ingredient_name: 'gin',
          source: 'grocery_list_modal',
        }),
      );
      expect(openURLMock).toHaveBeenCalledWith(link.url);
    });

    it('does not open the URL and returns false when it cannot be opened', async () => {
      canOpenURLMock.mockResolvedValue(false);

      const result = await openAffiliateLink(link, 'homebar_wishlist');

      expect(result).toBe(false);
      expect(openURLMock).not.toHaveBeenCalled();
    });

    it('returns false instead of throwing when Linking rejects', async () => {
      canOpenURLMock.mockRejectedValue(new Error('linking unavailable'));

      const result = await openAffiliateLink(link, 'homebar_wishlist');

      expect(result).toBe(false);
    });
  });

  describe('buyIngredient', () => {
    it('opens the best link for the ingredient', async () => {
      canOpenURLMock.mockResolvedValue(true);
      openURLMock.mockResolvedValue(undefined);

      const result = await buyIngredient('gin', 'spirit', 'homebar_wishlist');

      expect(result).toBe(true);
      expect(openURLMock).toHaveBeenCalled();
    });

    it('returns false when no provider is available', async () => {
      const active = getActiveProviders();
      active.forEach((p) => unregisterProvider(p.id));
      try {
        const result = await buyIngredient('gin');
        expect(result).toBe(false);
        expect(openURLMock).not.toHaveBeenCalled();
      } finally {
        active.forEach((p) => registerProvider(p));
      }
    });
  });
});
