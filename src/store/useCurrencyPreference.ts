import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

export type SupportedCurrency = 'USD' | 'GBP' | 'CAD' | 'AUD' | 'EUR' | 'NZD';

export const CURRENCY_META: Record<SupportedCurrency, { symbol: string; label: string; flag: string }> = {
  USD: { symbol: '$', label: 'US Dollar', flag: '🇺🇸' },
  GBP: { symbol: '£', label: 'British Pound', flag: '🇬🇧' },
  CAD: { symbol: 'CA$', label: 'Canadian Dollar', flag: '🇨🇦' },
  AUD: { symbol: 'A$', label: 'Australian Dollar', flag: '🇦🇺' },
  EUR: { symbol: '€', label: 'Euro', flag: '🇪🇺' },
  NZD: { symbol: 'NZ$', label: 'New Zealand Dollar', flag: '🇳🇿' },
};

// Static approximate multipliers from USD (no network required)
const USD_MULTIPLIERS: Record<SupportedCurrency, number> = {
  USD: 1.00,
  GBP: 0.79,
  CAD: 1.37,
  AUD: 1.55,
  EUR: 0.93,
  NZD: 1.68,
};

/**
 * Convert a USD price to the target currency using static multipliers.
 * Used for currencies not natively in spiritsDatabase priceEstimate.
 */
export function convertFromUSD(usdAmount: number, currency: SupportedCurrency): number {
  return Math.round(usdAmount * USD_MULTIPLIERS[currency]);
}

/**
 * Format a price range for display (e.g. "£22–£28" or "A$34–A$43")
 */
export function formatPriceRange(
  min: number,
  max: number,
  currency: SupportedCurrency
): string {
  const { symbol } = CURRENCY_META[currency];
  return `${symbol}${min}–${symbol}${max}`;
}

/**
 * Detect currency from device locale region code.
 */
function detectCurrencyFromLocale(): SupportedCurrency {
  try {
    const locale = Localization.getLocales()[0];
    const region = locale?.regionCode || '';
    switch (region) {
      case 'GB': return 'GBP';
      case 'CA': return 'CAD';
      case 'AU': return 'AUD';
      case 'NZ': return 'NZD';
      case 'DE': case 'FR': case 'IT': case 'ES': case 'NL':
      case 'BE': case 'AT': case 'PT': case 'IE': case 'FI': return 'EUR';
      default: return 'USD';
    }
  } catch {
    return 'USD';
  }
}

interface CurrencyPreferenceState {
  currency: SupportedCurrency;
  /** true = user explicitly chose, false = auto-detected from locale */
  isUserOverride: boolean;
  setCurrency: (currency: SupportedCurrency) => void;
  resetToLocale: () => void;
}

export const useCurrencyPreference = create<CurrencyPreferenceState>()(
  persist(
    (set) => ({
      currency: detectCurrencyFromLocale(),
      isUserOverride: false,
      setCurrency: (currency) => set({ currency, isUserOverride: true }),
      resetToLocale: () => set({ currency: detectCurrencyFromLocale(), isUserOverride: false }),
    }),
    {
      name: '@KOOPE:currency_preference_v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
